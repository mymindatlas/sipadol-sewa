-- Public ward-activity stat: total programme registrations, safe to expose
-- (PRD §28/§29 accountability dashboard).
--
-- program_registrations is private data — a resident reads only their own rows,
-- staff read all, and anon has no grant at all (0011). So the public cannot
-- COUNT the table directly: a head:true count from anon returns permission
-- denied, not a number. But the aggregate headcount ("N residents registered
-- across all programmes") carries no identity and is safe to publish.
--
-- Same numbers-not-rows resolution as complaint_stats() (0014): a SECURITY
-- DEFINER function reads the table under the owner's rights and returns ONLY a
-- count — never a row, never a name, phone, or email. The public sees the total
-- without being able to read a single registration.

create function public.registration_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.program_registrations;
$$;

revoke execute on function public.registration_count() from public;
grant execute on function public.registration_count() to anon, authenticated;
