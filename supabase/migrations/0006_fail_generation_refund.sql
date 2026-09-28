-- ---------------------------------------------------------------------------
-- Atomic refunds for failed generations
--
-- Before this migration a failure left the ledger with a debit and no refund:
-- the route refunded through the service role, which (a) needs
-- SUPABASE_SERVICE_ROLE_KEY and (b) returned its PostgREST error as data
-- instead of throwing, so the failure was silently swallowed.
--
-- Now the debit carries a `generation:<uuid>` reference and the whole failure
-- path is a single security-definer call the signed-in user can make:
--
--   1. consume_credits() gains `p_metadata`, so a reservation can be tied to a
--      specific generation (and cannot be made twice for the same one).
--   2. fail_generation() records the failed row and refunds exactly what was
--      reserved, exactly once, in one transaction.
-- ---------------------------------------------------------------------------

-- 1. consume_credits: adding a parameter creates an overload, not a replacement,
--    so drop the old signature first.
drop function if exists public.consume_credits(integer, text);

create or replace function public.consume_credits(
  p_amount integer default 1,
  p_description text default null,
  p_metadata jsonb default null
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

  insert into public.credit_transactions (user_id, amount, type, description, metadata)
  values (v_user_id, -p_amount, 'debit', p_description, p_metadata);

  return v_new_balance;
end;
$$;

grant execute on function public.consume_credits(integer, text, jsonb) to authenticated;

-- 2. fail_generation: record the failure and refund the reservation atomically.
--    Safe to expose to `authenticated` because:
--      * it always writes `user_id = auth.uid()`;
--      * the refund amount is read from the debit this app recorded for that
--        generation, never from the caller;
--      * the refund only happens when the stored generation is 'failed' (and
--        `authenticated` has no UPDATE privilege on `generations`, so a
--        successful row can never be turned into a failed one);
--      * the `refund:<id>` reference makes the unique index reject a second
--        refund for the same generation.
create or replace function public.fail_generation(
  p_generation_id uuid,
  p_prompt text,
  p_model text,
  p_error text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount integer;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'fail_generation: not authenticated' using errcode = '28000';
  end if;

  -- Store the failed attempt once. `credits_used` stays 0 because nothing was
  -- consumed: the ledger holds the debit/refund pair.
  insert into public.generations (id, user_id, prompt, model, tokens_used, credits_used, status, error)
  values (p_generation_id, v_user_id, p_prompt, p_model, 0, 0, 'failed', p_error)
  on conflict (id) do nothing;

  if not exists (
    select 1
      from public.generations
     where id = p_generation_id
       and user_id = v_user_id
       and status = 'failed'
  ) then
    select credits into v_balance from public.profiles where id = v_user_id;
    return coalesce(v_balance, 0);
  end if;

  select -ct.amount into v_amount
    from public.credit_transactions ct
   where ct.user_id = v_user_id
     and ct.type = 'debit'
     and ct.metadata ->> 'reference' = 'generation:' || p_generation_id::text;

  if v_amount is not null then
    with refunded as (
      insert into public.credit_transactions (user_id, amount, type, description, metadata)
      values (
        v_user_id,
        v_amount,
        'refund',
        'Refund: generation ' || p_generation_id::text,
        jsonb_build_object('reference', 'refund:' || p_generation_id::text)
      )
      on conflict do nothing
      returning 1
    )
    update public.profiles
       set credits = credits + v_amount,
           updated_at = now()
     where id = v_user_id
       and exists (select 1 from refunded);
  end if;

  select credits into v_balance from public.profiles where id = v_user_id;
  return coalesce(v_balance, 0);
end;
$$;

revoke all on function public.fail_generation(uuid, text, text, text) from public, anon;
grant execute on function public.fail_generation(uuid, text, text, text) to authenticated;
