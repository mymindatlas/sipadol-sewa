-- Fix: infinite recursion in the complaints insert policy (42P17).
--
-- 0012's complaints_insert_own_rate_limited policy enforced the 3-per-hour
-- limit (Decision 8) with a subquery that read public.complaints from INSIDE a
-- policy attached to public.complaints. Evaluating "may this row be inserted?"
-- required reading the same table, which re-triggered policy evaluation —
-- Postgres detects the loop and aborts every insert with 42P17. The rate limit
-- never ran; no complaint could be filed.
--
-- The fix is the same shape as current_role() avoiding the profiles recursion:
-- move the same-table count into a SECURITY DEFINER function. The function reads
-- complaints under its OWNER's rights, not the caller's, so RLS is not applied
-- to that read and the recursion cannot form. The policy then calls the
-- function instead of embedding the subquery.
--
-- The rate limit stays enforced AT THE DATABASE and remains unbypassable — the
-- only thing that changes is where the count query runs.

-- Counts the caller's complaints in the last hour, under definer rights so this
-- read does not re-enter the complaints RLS policy. Returns true if the caller
-- is under the 3-per-hour limit. auth.uid() is read inside the function so a
-- caller cannot pass someone else's id.
create function public.complaint_rate_ok()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select count(*) < 3
  from public.complaints c
  where c.user_id = auth.uid()
    and c.created_at > now() - interval '1 hour';
$$;

-- Only authenticated callers ever insert complaints; the function is theirs.
revoke execute on function public.complaint_rate_ok() from public;
grant execute on function public.complaint_rate_ok() to authenticated;

-- Replace the recursive policy. The check is unchanged in intent — the row must
-- be the caller's own AND the caller must be under the hourly limit — but the
-- count now runs inside the definer function above rather than as an inline
-- subquery on complaints.
drop policy "complaints_insert_own_rate_limited" on public.complaints;

create policy "complaints_insert_own_rate_limited"
  on public.complaints for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.complaint_rate_ok()
  );
