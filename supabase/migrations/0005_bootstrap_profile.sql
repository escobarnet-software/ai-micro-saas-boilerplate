-- ---------------------------------------------------------------------------
-- Self-service profile bootstrap
--
-- Creates the caller's own profile row — plus the signup bonus, exactly once —
-- when it is missing: accounts created before the trigger existed, rows removed
-- by hand, or a database restored from a partial dump.
--
-- It is `security definer` and only ever touches `auth.uid()`'s row, so it is
-- safe to expose to `authenticated`: it cannot reach another user and it can
-- never grant itself a paid plan.
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_bonus constant integer := 100;
begin
  if v_user_id is null then
    raise exception 'bootstrap_profile: not authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if found then
    return v_profile;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, plan, credits)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url',
    'free',
    0
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  -- Guarded by the unique reference index, so the bonus is granted once.
  with granted as (
    insert into public.credit_transactions (user_id, amount, type, description, metadata)
    values (
      v_user_id,
      v_bonus,
      'grant',
      'Signup bonus credits',
      jsonb_build_object('reference', 'signup:' || v_user_id::text)
    )
    on conflict do nothing
    returning 1
  )
  update public.profiles
     set credits = credits + v_bonus,
         updated_at = now()
   where id = v_user_id
     and exists (select 1 from granted);

  select * into v_profile from public.profiles where id = v_user_id;
  return v_profile;
end;
$$;

revoke all on function public.bootstrap_profile() from public, anon;
grant execute on function public.bootstrap_profile() to authenticated;
