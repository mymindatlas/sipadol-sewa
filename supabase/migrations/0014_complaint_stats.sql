-- Public accountability stats: aggregate complaint counts, safe to expose
-- (PRD §28/§29, Decision 9).
--
-- The dashboard must count ALL complaints from the moment they are submitted —
-- NOT just published ones — so the ward cannot keep an inconvenient complaint
-- out of the public numbers by delaying publication (Decision 9, the anti-
-- suppression rule). But the public must never read the CONTENTS of an
-- unpublished complaint (that is what complaints_public exists to prevent).
--
-- The resolution: a SECURITY DEFINER function that reads the full complaints
-- table under the owner's rights and returns ONLY aggregate NUMBERS — never a
-- row, never identity, never description. A resident sees "5 in progress"
-- without being able to read those five complaints. This is the same
-- numbers-not-rows philosophy as the complaints_public view, applied to counts.
--
-- Definitions (agreed with owner):
--   • Every complaint is counted from submission.
--   • Withdrawn complaints are shown as their own count, transparently, rather
--     than silently removed (so withdrawal is not a suppression tool).
--   • Resolution rate = resolved / (all complaints EXCEPT withdrawn). Withdrawn
--     complaints, removed for a recorded reason, are excluded from the
--     denominator; everything else counts.
--   • status 'resolved' = genuinely fixed (success); 'closed' = finished
--     without a fix — closed does NOT count toward the resolution rate.

create function public.complaint_stats()
returns table (
  total            bigint,
  withdrawn        bigint,
  active_total     bigint,
  received         bigint,
  in_progress      bigint,
  action_required  bigint,
  resolved         bigint,
  closed           bigint,
  resolved_pct     integer
)
language sql
security definer
set search_path = public
stable
as $$
  with c as (
    select
      count(*)                                                as total,
      count(*) filter (where withdrawn_at is not null)        as withdrawn,
      count(*) filter (where withdrawn_at is null)            as active_total,
      count(*) filter (where withdrawn_at is null and status = 'received')        as received,
      count(*) filter (where withdrawn_at is null and status = 'in_progress')     as in_progress,
      count(*) filter (where withdrawn_at is null and status = 'action_required') as action_required,
      count(*) filter (where withdrawn_at is null and status = 'resolved')        as resolved,
      count(*) filter (where withdrawn_at is null and status = 'closed')          as closed
    from public.complaints
  )
  select
    total,
    withdrawn,
    active_total,
    received,
    in_progress,
    action_required,
    resolved,
    closed,
    case
      when active_total = 0 then 0
      else round((resolved::numeric / active_total::numeric) * 100)::integer
    end as resolved_pct
  from c;
$$;

revoke execute on function public.complaint_stats() from public;
grant execute on function public.complaint_stats() to anon, authenticated;
