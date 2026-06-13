-- Token Usage Tracking
-- Logs per-request token consumption for admin analytics

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

create index if not exists token_usage_user_id_idx   on public.token_usage (user_id);
create index if not exists token_usage_created_at_idx on public.token_usage (created_at desc);
create index if not exists token_usage_user_date_idx  on public.token_usage (user_id, created_at desc);

alter table public.token_usage enable row level security;

drop policy if exists "token_usage_owner_insert" on public.token_usage;
drop policy if exists "token_usage_owner_read"   on public.token_usage;

-- Users can insert their own records (API route does this via user session)
create policy "token_usage_owner_insert"
  on public.token_usage for insert
  with check (auth.uid() = user_id);

-- Users can read their own records
create policy "token_usage_owner_read"
  on public.token_usage for select
  using (auth.uid() = user_id);
