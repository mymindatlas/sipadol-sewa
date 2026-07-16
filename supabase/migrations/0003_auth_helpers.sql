-- The one function every RLS policy in this system calls to answer
-- "what role does the acting user hold, right now" (AGENTS.md / PRD
-- §3.1, §9.1). SECURITY DEFINER so it reads profiles under its own
-- (table owner's) rights rather than the caller's -- otherwise a
-- policy on profiles that calls this, which selects from profiles,
-- would recurse into RLS on profiles infinitely.
create function public.current_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke execute on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

-- Supabase's Custom Access Token Hook signature. This is what puts role
-- into the sign-in token for display/redirect use (PRD §3.1) -- never
-- for enforcement, which always calls current_role() above instead.
-- SECURITY DEFINER for the same reason as current_role(): the profiles
-- read inside must not depend on RLS having a policy that covers
-- supabase_auth_admin.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  claims jsonb;
  claim_role public.user_role;
begin
  select role into claim_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if claim_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(claim_role));
  else
    claims := jsonb_set(claims, '{user_role}', to_jsonb('resident'::public.user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Getting this grant wrong makes the hook fail silently at token
-- issuance (AGENTS.md) -- only the auth service itself may call it.
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
