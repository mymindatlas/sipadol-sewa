-- SELECT: a resident reads their own row; an admin reads every row.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.current_role() = 'admin');

-- UPDATE: a resident updates their own row. Which columns that update
-- may touch is decided below by GRANT, not by this policy's USING/WITH
-- CHECK -- see the comment on the grant.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Column-level grant is the structural gate, not the policy above.
-- Supabase grants ALL columns on new tables to `authenticated` by
-- default; revoke that first, then grant back only the two columns a
-- resident may ever write. Postgres checks column privilege before RLS
-- is evaluated at all, so role and is_active are unwritable through
-- this policy regardless of what its USING/WITH CHECK say.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Admin changes role/is_active only through this function, never a raw
-- UPDATE. Reason: every app role (resident, ward_secretary, admin) is
-- the same Postgres role, `authenticated` -- a column grant can't tell
-- an admin's request from a resident's, so it can't be the mechanism
-- that lets an admin write these two columns without also reopening
-- them to residents. This function runs as its owner (the table
-- owner), which isn't subject to the grant restriction above, and
-- checks the caller's app role itself before writing.
create function public.admin_set_profile_role(
  target_id uuid,
  new_role public.user_role,
  new_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'only an admin may change role or active status' using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role,
      is_active = new_is_active
  where id = target_id;
end;
$$;

revoke execute on function public.admin_set_profile_role(uuid, public.user_role, boolean) from public, anon;
grant execute on function public.admin_set_profile_role(uuid, public.user_role, boolean) to authenticated;

-- PRD §36: an Admin cannot demote or deactivate themselves. This has to
-- be a trigger rather than a policy because RLS can't cleanly express
-- "compare this row's id to the acting user's own id, and compare the
-- new values to the old ones" -- and it has to fire on the table
-- itself so it also catches the SECURITY DEFINER function above, not
-- just direct client updates.
create function public.prevent_admin_self_demotion()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = OLD.id
     and (NEW.role is distinct from OLD.role or NEW.is_active is distinct from OLD.is_active) then
    raise exception 'you cannot change your own role or active status' using errcode = '42501';
  end if;

  return NEW;
end;
$$;

create trigger trg_prevent_admin_self_demotion
  before update on public.profiles
  for each row
  execute function public.prevent_admin_self_demotion();
