-- Nutrient Demo Studio — Database Schema
-- Fully idempotent: safe to run multiple times

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Workspaces ──────────────────────────────────────────────────────────────

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

-- ─── AI Sessions ─────────────────────────────────────────────────────────────

create table if not exists public.ai_sessions (
  id           uuid      default gen_random_uuid() primary key,
  workspace_id uuid      references public.workspaces(id) on delete cascade not null,
  messages     jsonb     default '[]' not null,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create index if not exists ai_sessions_workspace_id_idx on public.ai_sessions (workspace_id);

-- ─── Deployments ─────────────────────────────────────────────────────────────

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

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.workspaces enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.deployments enable row level security;

-- Drop existing policies so this script is re-runnable
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

-- ─── Project Files ───────────────────────────────────────────────────────────

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
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = project_files.workspace_id
        and w.user_id = auth.uid()
    )
  );

-- ─── User Credits ────────────────────────────────────────────────────────────

create table if not exists public.user_credits (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  credit_limit bigint      not null default 0,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.user_credits enable row level security;

drop policy if exists "user_credits_read_own" on public.user_credits;

create policy "user_credits_read_own"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- ─── Token Usage ─────────────────────────────────────────────────────────────

create table if not exists public.token_usage (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  workspace_id  uuid        references public.workspaces(id) on delete set null,
  model         text        not null,
  mode          text,
  pipeline_type text,
  input_tokens  integer     not null default 0,
  output_tokens integer     not null default 0,
  total_tokens  integer     not null default 0,
  created_at    timestamptz default now() not null
);

create index if not exists token_usage_user_id_idx    on public.token_usage (user_id);
create index if not exists token_usage_created_at_idx  on public.token_usage (created_at desc);
create index if not exists token_usage_user_date_idx   on public.token_usage (user_id, created_at desc);

alter table public.token_usage enable row level security;

drop policy if exists "token_usage_owner_insert" on public.token_usage;
drop policy if exists "token_usage_owner_read"   on public.token_usage;

create policy "token_usage_owner_insert"
  on public.token_usage for insert
  with check (auth.uid() = user_id);

create policy "token_usage_owner_read"
  on public.token_usage for select
  using (auth.uid() = user_id);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────

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
