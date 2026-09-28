-- ---------------------------------------------------------------------------
-- New user bootstrap: profile row + signup bonus credits
-- ---------------------------------------------------------------------------

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
