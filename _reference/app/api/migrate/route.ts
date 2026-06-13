import { NextResponse } from "next/server";
import { Client } from "pg";

const MIGRATION_SQL = `
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id          uuid      default gen_random_uuid() primary key,
  user_id     uuid      references auth.users(id) on delete cascade not null,
  template_id text      not null,
  name        text      not null,
  config      jsonb     default '{}' not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists workspaces_user_id_idx on public.workspaces (user_id);
create index if not exists workspaces_updated_at_idx on public.workspaces (updated_at desc);

create table if not exists public.ai_sessions (
  id           uuid      default gen_random_uuid() primary key,
  workspace_id uuid      references public.workspaces(id) on delete cascade not null,
  messages     jsonb     default '[]' not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create index if not exists ai_sessions_workspace_id_idx on public.ai_sessions (workspace_id);

create table if not exists public.deployments (
  id           uuid      default gen_random_uuid() primary key,
  workspace_id uuid      references public.workspaces(id) on delete cascade not null,
  user_id      uuid      references auth.users(id) on delete cascade not null,
  name         text      not null,
  snapshot     jsonb     not null,
  share_token  text      unique default encode(gen_random_bytes(16), 'hex') not null,
  created_at   timestamptz default now() not null
);

create index if not exists deployments_workspace_id_idx on public.deployments (workspace_id);
create index if not exists deployments_share_token_idx on public.deployments (share_token);

alter table public.workspaces enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.deployments enable row level security;

drop policy if exists "workspace_owner_all" on public.workspaces;
drop policy if exists "ai_session_workspace_owner" on public.ai_sessions;
drop policy if exists "deployment_owner_write" on public.deployments;
drop policy if exists "deployment_public_read" on public.deployments;

create policy "workspace_owner_all"
  on public.workspaces for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ai_session_workspace_owner"
  on public.ai_sessions for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ai_sessions.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "deployment_owner_write"
  on public.deployments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deployment_public_read"
  on public.deployments for select
  using (true);

create table if not exists public.project_files (
  id           uuid      default gen_random_uuid() primary key,
  workspace_id uuid      references public.workspaces(id) on delete cascade not null,
  path         text      not null,
  content      text      not null default '',
  is_system    boolean   default false not null,
  language     text      not null default 'plaintext',
  updated_at   timestamptz default now() not null,
  unique(workspace_id, path)
);

create index if not exists project_files_workspace_id_idx on public.project_files (workspace_id);
alter table public.project_files enable row level security;
drop policy if exists "project_files_workspace_owner" on public.project_files;
create policy "project_files_workspace_owner"
  on public.project_files for all
  using (exists (select 1 from public.workspaces w where w.id = project_files.workspace_id and w.user_id = auth.uid()));

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspaces_updated_at on public.workspaces;
drop trigger if exists ai_sessions_updated_at on public.ai_sessions;

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute function update_updated_at_column();

create trigger ai_sessions_updated_at
  before update on public.ai_sessions
  for each row execute function update_updated_at_column();

-- ── Backend infrastructure (managed proxy + BYO backend) ─────────────────────

create table if not exists public.backend_tokens (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null unique,
  user_id      uuid references auth.users(id) on delete cascade not null,
  token_hash   text not null,
  created_at   timestamptz default now() not null,
  expires_at   timestamptz default now() + interval '30 days' not null
);

create index if not exists backend_tokens_hash_idx on public.backend_tokens (token_hash);

create table if not exists public.backend_requests (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id      uuid references auth.users(id),
  operation    text not null,
  input_bytes  int,
  output_bytes int,
  credits_used int default 0 not null,
  duration_ms  int,
  status       text not null,
  error_msg    text,
  created_at   timestamptz default now() not null
);

create index if not exists backend_requests_user_id_idx on public.backend_requests (user_id);
create index if not exists backend_requests_workspace_id_idx on public.backend_requests (workspace_id);

create table if not exists public.backend_credentials (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null unique,
  backend_url  text not null,
  api_key_enc  text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- backend_tokens are validated with the service-role client only (no policies =
-- no client access). Requests and credentials are owner-readable.
alter table public.backend_tokens enable row level security;
alter table public.backend_requests enable row level security;
alter table public.backend_credentials enable row level security;

drop policy if exists "backend_requests_owner_read" on public.backend_requests;
create policy "backend_requests_owner_read"
  on public.backend_requests for select
  using (auth.uid() = user_id);

drop policy if exists "backend_credentials_owner_all" on public.backend_credentials;
create policy "backend_credentials_owner_all"
  on public.backend_credentials for all
  using (exists (select 1 from public.workspaces w where w.id = backend_credentials.workspace_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = backend_credentials.workspace_id and w.user_id = auth.uid()));
`;

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.MIGRATE_SECRET || secret !== process.env.MIGRATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(MIGRATION_SQL);
    return NextResponse.json({ ok: true, message: "Migration complete" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end();
  }
}
