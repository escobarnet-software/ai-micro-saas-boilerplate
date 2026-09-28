-- ---------------------------------------------------------------------------
-- Credit ledger helpers (security definer so they can write the ledger)
-- ---------------------------------------------------------------------------

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

revoke all on function public.grant_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.consume_credits(integer, text) to authenticated;
