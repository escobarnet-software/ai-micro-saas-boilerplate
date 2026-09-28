-- ---------------------------------------------------------------------------
-- Nebula AI — one-shot database setup
--
-- HOW TO USE: open your Supabase project → SQL Editor → New query, paste this
-- whole file and press "Run". It is idempotent, so running it twice is safe.
--
-- It contains exactly the same DDL as supabase/migrations/0001 → 0004 (already
-- versioned in this repo) plus a backfill that creates the missing profile row
-- for accounts that signed up before the trigger existed.
-- ---------------------------------------------------------------------------

-- 0. Extensions -------------------------------------------------------------
create extension if not exists "pgcrypto";

-- 1. Shared updated_at trigger ---------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. profiles ---------------------------------------------------------------
-- One row per auth.users row. Holds the plan and the current credit balance.
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

-- 3. credit_transactions (append-only ledger) -------------------------------
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

-- 4. generations ------------------------------------------------------------
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

-- 5. Credit functions -------------------------------------------------------
-- security definer so they can write the ledger on behalf of a user.

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text default 'grant',
  p_description text default null,
  p_metadata jsonb default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
  v_reference text := p_metadata ->> 'reference';
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'grant_credits: amount must be positive';
  end if;

  -- Idempotency: a reference can only be credited once (Stripe retries).
  if v_reference is not null and exists (
    select 1
      from public.credit_transactions
     where user_id = p_user_id
       and metadata ->> 'reference' = v_reference
  ) then
    select credits into v_new_balance from public.profiles where id = p_user_id;
    return coalesce(v_new_balance, 0);
  end if;

  insert into public.credit_transactions (user_id, amount, type, description, metadata)
  values (p_user_id, p_amount, p_type, p_description, p_metadata);

  update public.profiles
     set credits = credits + p_amount,
         updated_at = now()
   where id = p_user_id
  returning credits into v_new_balance;

  if v_new_balance is null then
    raise exception 'grant_credits: profile % not found', p_user_id;
  end if;

  return v_new_balance;
end;
$$;

-- Hard guarantee that a Stripe reference is only ever credited once.
create unique index if not exists credit_transactions_reference_key
  on public.credit_transactions ((metadata ->> 'reference'))
  where metadata ? 'reference';

-- Atomic debit used by POST /api/generate.
create or replace function public.consume_credits(
  p_amount integer default 1,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_balance integer;
begin
  if v_user_id is null then
    raise exception 'consume_credits: not authenticated' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'consume_credits: amount must be positive';
  end if;

  update public.profiles
     set credits = credits - p_amount,
         updated_at = now()
   where id = v_user_id
     and credits >= p_amount
  returning credits into v_new_balance;

  if v_new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (v_user_id, -p_amount, 'debit', p_description);

  return v_new_balance;
end;
$$;

-- Atomic refund used when the provider call fails after a debit.
create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'refund_credits: amount must be positive';
  end if;

  update public.profiles
     set credits = credits + p_amount,
         updated_at = now()
   where id = p_user_id
  returning credits into v_new_balance;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (p_user_id, p_amount, 'refund', p_description);

  return v_new_balance;
end;
$$;

-- Only consume_credits is callable from the browser session; grants and refunds
-- run with the service role from trusted server code.
revoke all on function public.grant_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.consume_credits(integer, text) to authenticated;

-- 6. New user bootstrap -----------------------------------------------------
-- Creates the profile row and the 100-credit signup bonus on every signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus constant integer := 100;
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan, credits)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    'free',
    v_bonus
  )
  on conflict (id) do nothing;

  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, v_bonus, 'grant', 'Signup bonus credits');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Row level security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.generations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own"
  on public.credit_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
  on public.generations
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
  on public.generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own"
  on public.generations
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 8. Table privileges -------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- The webhook and the trusted server code write with the service role.
grant select, insert, update, delete
  on public.profiles, public.credit_transactions, public.generations
  to service_role;

grant select on public.profiles, public.credit_transactions, public.generations
  to authenticated;

-- The API inserts generation rows with the user session.
grant insert, delete on public.generations to authenticated;

-- Users may only edit their display fields: credits, plan and the Stripe ids
-- are managed by the security definer functions and the Stripe webhook.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- The ledger is append-only and only written by security definer functions.
revoke insert, update, delete on public.credit_transactions from authenticated;

-- 9. Backfill for accounts created before the trigger -------------------------
-- The trigger only fires for NEW signups, so any account that already exists in
-- auth.users without a profiles row would be locked out of the dashboard
-- (the app redirects to /login?error=Profile is unavailable). This creates the
-- missing rows and records the signup bonus in the ledger, exactly once.
with created as (
  insert into public.profiles (id, email, full_name, avatar_url, plan, credits)
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name'
    ),
    u.raw_user_meta_data ->> 'avatar_url',
    'free',
    100
  from auth.users u
  where not exists (
    select 1 from public.profiles p where p.id = u.id
  )
  on conflict (id) do nothing
  returning id
)
insert into public.credit_transactions (user_id, amount, type, description)
select id, 100, 'grant', 'Signup bonus credits'
  from created;

-- 10. Verification -----------------------------------------------------------
-- Run these after the script to confirm everything is in place. No errors and
-- one row per table means the dashboard will load.

-- 10a. Tables, RLS enabled and their size.
-- select c.relname as table_name,
--        c.relrowsecurity as rls_enabled,
--        c.reltuples::bigint as approx_rows
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public'
--    and c.relname in ('profiles', 'credit_transactions', 'generations')
--  order by c.relname;

-- 10b. Policies (expect: 2 on profiles, 1 on credit_transactions, 3 on generations).
-- select tablename, policyname, cmd
--   from pg_policies
--  where schemaname = 'public'
--  order by tablename, policyname;

-- 10c. Credit functions.
-- select p.proname as function_name, pg_get_function_arguments(p.oid) as args
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname in ('grant_credits', 'consume_credits', 'refund_credits');

-- 10d. The trigger on auth.users.
-- select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 10e. Your accounts and balances: this is what the dashboard reads.
-- select p.email, p.plan, p.credits,
--        (select count(*) from public.generations g where g.user_id = p.id) as generations
--   from public.profiles p
--  order by p.created_at;

-- 11. Optional: grant yourself credits without Stripe -------------------------
-- Handy while testing the generator before the Stripe keys are configured.
-- update public.profiles
--    set plan = 'pro', credits = 10000
--  where email = 'you@example.com';

-- ---------------------------------------------------------------------------
-- Done. Next: reload the dashboard in the browser (hard refresh with Ctrl+F5).
-- If it still bounces to /login, the message in the URL tells you what is
-- missing: "Profile is unavailable." means the profile row was not created.
-- ---------------------------------------------------------------------------
