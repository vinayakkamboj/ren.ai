-- Ren Code — product schema, phase 2
-- Projects, GitHub connections, repositories, pull requests, and generated docs.
-- All tables are row-level-secured to the owning user.

create type project_kind   as enum ('new', 'repository');
create type project_status as enum ('draft', 'building', 'active', 'archived');
create type repo_index_state as enum ('queued', 'indexing', 'indexed', 'error');
create type pr_state as enum ('draft', 'open', 'merged', 'closed');
create type doc_kind as enum ('architecture', 'api', 'guide', 'readme');

-- ─── GitHub connections ──────────────────────────────────────────────────────
-- One row per user who has authorized GitHub. Tokens are stored encrypted by
-- Supabase Auth (provider tokens) or a server-managed secret store — never here
-- in plaintext.

create table public.github_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  github_login  text not null,
  scopes        text[] not null default '{}',
  connected_at  timestamptz not null default now(),
  unique (user_id)
);

-- ─── Repositories ────────────────────────────────────────────────────────────

create table public.repositories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  full_name      text not null,                 -- owner/name
  default_branch text not null default 'main',
  is_private     boolean not null default true,
  language       text,
  index_state    repo_index_state not null default 'queued',
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, full_name)
);

-- ─── Projects ────────────────────────────────────────────────────────────────

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  kind          project_kind not null,
  status        project_status not null default 'draft',
  description   text,
  -- The seed prompt for a "new" project, kept for provenance.
  prompt        text,
  repository_id uuid references public.repositories (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Pull requests ───────────────────────────────────────────────────────────

create table public.pull_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  repository_id uuid not null references public.repositories (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  title         text not null,
  number        integer,
  branch        text not null,
  state         pr_state not null default 'draft',
  url           text,
  created_at    timestamptz not null default now()
);

-- ─── Generated documentation ─────────────────────────────────────────────────

create table public.doc_pages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  repository_id uuid not null references public.repositories (id) on delete cascade,
  title         text not null,
  kind          doc_kind not null,
  content       text,
  updated_at    timestamptz not null default now()
);

-- ─── Row-level security: each user sees only their own rows ──────────────────

alter table public.github_connections enable row level security;
alter table public.repositories       enable row level security;
alter table public.projects           enable row level security;
alter table public.pull_requests      enable row level security;
alter table public.doc_pages          enable row level security;

create policy "own github connections" on public.github_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own repositories" on public.repositories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pull requests" on public.pull_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own doc pages" on public.doc_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_repositories_user on public.repositories (user_id, last_synced_at desc);
create index idx_projects_user on public.projects (user_id, updated_at desc);
create index idx_pull_requests_user on public.pull_requests (user_id, created_at desc);
create index idx_doc_pages_user on public.doc_pages (user_id, updated_at desc);
