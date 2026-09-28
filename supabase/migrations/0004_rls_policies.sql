-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

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

-- Users may only edit their display fields. Credits and plan are managed by
-- security definer functions and the Stripe webhook (service role).
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own"
  on public.credit_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- The ledger is append-only and only written by security definer functions.
revoke insert, update, delete on public.credit_transactions from authenticated;

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
