-- Ren AI — internal research platform schema (PostgreSQL 16+)
--
-- The dashboard UI in src/app/dashboard consumes these shapes through the
-- data-access layer (src/lib/data/platform.ts ships static fixtures with
-- identical types for local development and preview deployments).

create extension if not exists pgcrypto;

create type run_status as enum ('queued', 'running', 'paused', 'completed', 'failed');
create type model_stage as enum ('research', 'staging', 'production', 'deprecated');
create type provenance as enum ('licensed', 'synthetic', 'curated', 'partner');
create type contamination_status as enum ('screened', 'pending', 'flagged');
create type eval_verdict as enum ('pass', 'regression', 'review');
create type deployment_status as enum ('healthy', 'degraded', 'draining');

create table teams (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null
);

create table clusters (
  id          text primary key,            -- e.g. 'kiln-west'
  name        text not null,
  gpu_count   integer not null check (gpu_count > 0),
  power_watts bigint not null
);

create table models (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,    -- e.g. 'ren-3-large'
  family          text not null,           -- e.g. 'Ren-3'
  stage           model_stage not null default 'research',
  context_tokens  bigint not null,
  composite_score numeric(5, 2),
  released_on     date,
  created_at      timestamptz not null default now()
);

create table datasets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  domain        text not null,
  size_bytes    bigint not null,
  token_count   bigint not null,
  provenance    provenance not null,
  contamination contamination_status not null default 'pending',
  updated_at    timestamptz not null default now()
);

create table training_runs (
  id           text primary key,           -- e.g. 'run-4129'
  name         text not null,
  model_id     uuid references models (id),
  team_id      uuid not null references teams (id),
  cluster_id   text not null references clusters (id),
  status       run_status not null default 'queued',
  progress_pct numeric(5, 2) not null default 0,
  gpu_count    integer not null,
  tokens_total bigint not null,
  tokens_seen  bigint not null default 0,
  started_at   timestamptz,
  finished_at  timestamptz
);

create table run_metrics (
  run_id      text not null references training_runs (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  step        bigint not null,
  loss        double precision not null,
  primary key (run_id, step)
);

create table run_datasets (
  run_id     text not null references training_runs (id) on delete cascade,
  dataset_id uuid not null references datasets (id),
  primary key (run_id, dataset_id)
);

create table benchmarks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  area        text not null,               -- Reasoning, Coding, ...
  metric      text not null,
  description text not null,
  retired_at  timestamptz                  -- contamination retirements are public
);

create table eval_reports (
  id              text primary key,        -- e.g. 'ev-7741'
  model_id        uuid not null references models (id),
  benchmark_id    uuid references benchmarks (id),
  suite           text not null,
  score           numeric(5, 2) not null,
  delta           numeric(5, 2) not null,
  ci_halfwidth    numeric(5, 2) not null,  -- 95% confidence half-interval
  harness_version text not null,
  verdict         eval_verdict not null,
  run_at          timestamptz not null default now(),
  transcript_uri  text                     -- full transcripts, always retained
);

create table experiments (
  id             text primary key,         -- e.g. 'exp-0892'
  hypothesis     text not null,
  team_id        uuid not null references teams (id),
  baseline       text not null,
  variant        text not null,
  metric         text not null,
  baseline_score numeric(8, 2),
  variant_score  numeric(8, 2),
  p_value        double precision,
  preregistered  boolean not null default true,
  status         text not null default 'running'
);

create table deployments (
  id          text primary key,            -- e.g. 'dep-us-e1'
  model_id    uuid not null references models (id),
  region      text not null,
  version     text not null,
  traffic_pct numeric(5, 2) not null,
  status      deployment_status not null default 'healthy',
  updated_at  timestamptz not null default now()
);

create table api_metrics_daily (
  day            date primary key,
  request_count  bigint not null,
  latency_p50_ms integer not null,
  latency_p99_ms integer not null,
  error_rate_pct numeric(5, 3) not null
);

create table gpu_utilization (
  cluster_id  text not null references clusters (id),
  sampled_at  timestamptz not null,
  utilization numeric(5, 2) not null,
  primary key (cluster_id, sampled_at)
);

create table gpu_allocations (
  cluster_id text not null references clusters (id),
  team_id    uuid not null references teams (id),
  share_pct  numeric(5, 2) not null,
  primary key (cluster_id, team_id)
);

create index idx_runs_status on training_runs (status);
create index idx_eval_reports_model on eval_reports (model_id, run_at desc);
create index idx_run_metrics_time on run_metrics (run_id, recorded_at desc);
create index idx_gpu_util_time on gpu_utilization (cluster_id, sampled_at desc);
