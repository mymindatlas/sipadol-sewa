-- 0004 assumed Supabase auto-grants baseline table access (SELECT) to
-- `authenticated` on new tables. Verified live on this project: it
-- does not. Without this, the SELECT policies from 0004 are
-- unreachable -- a resident cannot read even their own row, and
-- Postgres never gets as far as evaluating RLS at all.
grant select on public.profiles to authenticated;

-- Restated for clarity alongside the SELECT grant above; behavior is
-- unchanged from 0004. role and is_active are still never granted to
-- authenticated at the column level, for any app role -- the only path
-- that may ever write them is the SECURITY DEFINER
-- admin_set_profile_role() function.
grant update (full_name, phone) on public.profiles to authenticated;
