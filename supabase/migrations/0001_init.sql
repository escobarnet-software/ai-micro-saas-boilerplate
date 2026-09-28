-- ---------------------------------------------------------------------------
-- Nebula AI — initial schema
-- Run with: supabase db push  (or paste into the SQL editor)
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Shared updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  credits integer not null default 0 check (credits >= 0),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- credit_transactions (append-only ledger) ----------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null,
  type text not null check (type in ('grant', 'debit', 'refund', 'purchase')),
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

-- generations ---------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  output text,
  model text not null,
  tokens_used integer not null default 0 check (tokens_used >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  status text not null default 'succeeded' check (status in ('succeeded', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);
