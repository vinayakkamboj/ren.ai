-- User credit limits for token consumption control
create table if not exists public.user_credits (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  credit_limit bigint      not null default 0, -- 0 = unlimited
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.user_credits enable row level security;

drop policy if exists "user_credits_read_own" on public.user_credits;

-- Users can read their own limit (needed for the dashboard credits bar)
create policy "user_credits_read_own"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- Only service role can insert/update (admin panel sets limits)

drop trigger if exists user_credits_updated_at on public.user_credits;
create trigger user_credits_updated_at
  before update on public.user_credits
  for each row execute function update_updated_at_column();
