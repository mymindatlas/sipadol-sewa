-- Complaints & accountability core (PRD §8.5, §9, §26–28, §34, Decisions 8–10).
--
-- This is the most security-sensitive module in the system. Its entire purpose
-- is to let the public see complaints WITHOUT seeing who filed them, while the
-- ward can never silently erase or edit a complaint's history. Four objects:
--
--   complaint_categories  — staff-managed list (Health, Roads…), like
--                           notice_categories. Nothing new.
--   complaints            — the core table. A resident writes ONLY four fields
--                           (category, description, location, photo). ticket_id,
--                           status, is_published, user_id, and every timestamp
--                           are set by the DATABASE, never accepted from the
--                           browser (§9.2 — closes the "submit a pre-Resolved
--                           complaint" fabrication vector).
--   complaint_status_events — append-only history. No UPDATE/DELETE for anyone,
--                           any role (Decision 10). A status change is a new row.
--   complaints_public     — a VIEW, not a table. The ONLY public door. It
--                           structurally omits identity, photo, and staff note —
--                           they are "not hidden; they are not present" (§8.5).
--                           Runs under the OWNER's rights; the public has NO
--                           permission on the complaints table itself (§9.3).
--
-- Status semantics (agreed with owner): received / in_progress /
-- action_required are OPEN; resolved = fixed (the success ending, counts toward
-- the dashboard resolution rate); closed = finished WITHOUT a fix (duplicate /
-- out-of-scope / no action), a separate ending that does NOT count as success.
-- The status enum is adopted from 0001 (five values) — see note below.

-- ── Status enum: ALREADY DEFINED in 0001_enums.sql ──────────────────────
-- public.complaint_status exists from the foundation migration with FIVE
-- values: 'received', 'in_progress', 'action_required', 'resolved', 'closed'
-- (lowercase, matching user_role/form_status house convention — the UI maps
-- them to Title Case for display). We adopt it as-is; we do NOT redefine it.
--
-- Status semantics (agreed with owner):
--   received, in_progress, action_required  → OPEN (outstanding).
--     action_required = the honest "blocked, waiting on the resident or an
--     external body" state; a complaint moves in and out of it.
--   resolved = fixed — the SUCCESS ending, counts toward the dashboard
--     resolution rate.
--   closed = finished WITHOUT a fix (duplicate / out-of-scope / no action) —
--     a separate ending that does NOT count as success.

-- ── complaint_categories — staff-managed, mirrors notice_categories ─────
create table public.complaint_categories (
  id bigint generated always as identity primary key,
  name_ne text not null,
  name_en text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_complaint_categories_touch_updated_at
  before update on public.complaint_categories
  for each row execute function public.touch_updated_at();

insert into public.complaint_categories (name_ne, name_en, display_order) values
  ('सडक तथा पूर्वाधार',   'Roads & Infrastructure',       1),
  ('खानेपानी',            'Water Supply',                 2),
  ('सरसफाइ तथा फोहोर',    'Sanitation & Waste',           3),
  ('ढल निकास',            'Drainage',                     4),
  ('जनस्वास्थ्य',          'Public Health',                5),
  ('वडा सेवा तथा प्रशासन', 'Ward Services & Administration', 6),
  ('अन्य',                'Other',                        7);

-- ── The ticket counter — a real sequence, never read-then-increment ─────
-- COMP-2026-00042. Any scheme that reads the highest existing number and adds
-- one will eventually issue the same number to two people submitting at the
-- same instant (§8.5). A SEQUENCE is atomic and never double-issues. Starts at
-- 42 (owner's choice) and never resets — a number is never reissued even across
-- years; the year in the ticket is informational only.
create sequence public.complaint_ticket_seq start with 42;

-- Formats the next ticket. SECURITY DEFINER so it can advance the sequence
-- regardless of caller; fixed search_path like current_role().
create function public.next_complaint_ticket()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('public.complaint_ticket_seq');
  return 'COMP-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

-- ── complaints — the core table ─────────────────────────────────────────
create table public.complaints (
  id bigint generated always as identity primary key,
  -- DB-generated, never from the browser. Unique, human-readable reference.
  ticket_id text not null unique default public.next_complaint_ticket(),
  -- The submitter. NEVER exposed publicly (absent from complaints_public).
  user_id uuid not null default auth.uid() references public.profiles (id),
  -- Resident-authored, the four fields a resident is allowed to write:
  category_id bigint not null references public.complaint_categories (id),
  description text not null,
  location_text text not null,
  -- Optional. PRIVATE (authenticated) delivery. Never exposed publicly.
  photo_file text,
  -- DB-controlled; residents cannot set these (enforced by column grants below).
  status public.complaint_status not null default 'received',
  staff_note text,
  is_published boolean not null default false,
  -- Withdrawal (Admin only — Decision 9). Reason required when withdrawing.
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.profiles (id),
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- If withdrawn, all three withdrawal fields must be present together.
  constraint complaints_withdrawal_complete check (
    (withdrawn_at is null and withdrawn_by is null and withdrawal_reason is null)
    or
    (withdrawn_at is not null and withdrawn_by is not null
     and withdrawal_reason is not null and length(trim(withdrawal_reason)) > 0)
  )
);

create index complaints_user_id_idx on public.complaints (user_id);
create index complaints_status_idx on public.complaints (status);
create index complaints_category_id_idx on public.complaints (category_id);
create index complaints_published_idx
  on public.complaints (is_published) where withdrawn_at is null;

create trigger trg_complaints_touch_updated_at
  before update on public.complaints
  for each row execute function public.touch_updated_at();

-- ── complaint_status_events — append-only history (Decision 10) ─────────
create table public.complaint_status_events (
  id bigint generated always as identity primary key,
  complaint_id bigint not null
    references public.complaints (id) on delete cascade,
  status public.complaint_status not null,
  -- Who made the change and when. null actor = the automatic 'received' event
  -- written at submission by the trigger below.
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index complaint_status_events_complaint_id_idx
  on public.complaint_status_events (complaint_id, created_at);

-- History is written automatically so it can never be forgotten:
--  • on INSERT of a complaint → a 'received' event.
--  • on UPDATE where status changed → an event recording the new status,
--    attributed to the staff member making the change (auth.uid()).
-- This is a trigger, not app code, precisely so no code path can advance a
-- status without leaving a permanent trace.
create function public.log_complaint_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.complaint_status_events (complaint_id, status, changed_by)
    values (new.id, new.status, new.user_id);
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.complaint_status_events (complaint_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), new.staff_note);
  end if;
  return new;
end;
$$;

create trigger trg_complaints_log_status_insert
  after insert on public.complaints
  for each row execute function public.log_complaint_status_event();

create trigger trg_complaints_log_status_update
  after update on public.complaints
  for each row execute function public.log_complaint_status_event();

-- ═══ RLS ════════════════════════════════════════════════════════════════
alter table public.complaint_categories enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_status_events enable row level security;

-- complaint_categories: everyone reads, staff write (like notice_categories).
create policy "complaint_categories_select_all"
  on public.complaint_categories for select to anon, authenticated
  using (true);
create policy "complaint_categories_insert_staff"
  on public.complaint_categories for insert to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));
create policy "complaint_categories_update_staff"
  on public.complaint_categories for update to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));
create policy "complaint_categories_delete_staff"
  on public.complaint_categories for delete to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- ── complaints policies ─────────────────────────────────────────────────
-- The public (anon) gets NO policy and NO grant on this table at all. The only
-- public door is the complaints_public view (§9.3). Do not add an anon policy
-- here — it would defeat the entire anonymity design.

-- A resident inserts their OWN complaint, and the rate limit (Decision 8, 3/hr)
-- is enforced here in the WITH CHECK so it cannot be bypassed by hitting the
-- API directly. The field-level restriction (residents set only category/
-- description/location/photo) is enforced by the COLUMN GRANTS below — status,
-- is_published, ticket_id, user_id are not granted to the resident to set.
create policy "complaints_insert_own_rate_limited"
  on public.complaints for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      select count(*) from public.complaints c
      where c.user_id = (select auth.uid())
        and c.created_at > now() - interval '1 hour'
    ) < 3
  );

-- A resident reads only their own complaints (My Complaints, §27).
create policy "complaints_select_own"
  on public.complaints for select to authenticated
  using (user_id = (select auth.uid()));

-- Staff read every complaint (Admin Complaints, §34).
create policy "complaints_select_staff"
  on public.complaints for select to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- Staff (secretary OR admin) may update status, note, and publication.
-- This policy does NOT allow the withdrawal columns to be the thing that
-- distinguishes it — column-level control is via grants; the Admin-only
-- withdrawal is a SEPARATE trigger below. Both secretary and admin pass here.
create policy "complaints_update_staff"
  on public.complaints for update to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

-- NO delete policy for anyone. A received complaint cannot be un-received
-- (Decision 10). The permission simply does not exist.

-- ── complaint_status_events policies ────────────────────────────────────
-- Residents read their own complaints' history; staff read all. NOBODY may
-- update or delete (append-only). Inserts happen only via the SECURITY DEFINER
-- trigger above, so no direct-insert policy is granted to any role.
create policy "cse_select_own"
  on public.complaint_status_events for select to authenticated
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_status_events.complaint_id
        and c.user_id = (select auth.uid())
    )
  );
create policy "cse_select_staff"
  on public.complaint_status_events for select to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- ═══ GRANTS ═════════════════════════════════════════════════════════════
-- categories: public read, staff write (policies narrow the write to staff).
grant select on public.complaint_categories to anon, authenticated;
grant insert, update, delete on public.complaint_categories to authenticated;

-- complaints: anon gets NOTHING (the view is the only public door).
-- authenticated gets SELECT (policies scope it to own/staff) and INSERT.
-- CRITICAL — COLUMN-LEVEL INSERT (§9.2): a resident may set ONLY the four
-- resident-authored columns. status, is_published, ticket_id, user_id,
-- staff_note, withdrawal fields, and timestamps are NOT granted on insert, so
-- even a crafted API request cannot set them — the database fills them via
-- defaults/triggers. This is the field-level enforcement, at the database.
grant select on public.complaints to authenticated;
grant insert (category_id, description, location_text, photo_file)
  on public.complaints to authenticated;
-- UPDATE columns for staff: status, staff_note, is_published, and the three
-- withdrawal columns. The Admin-only-ness of withdrawal is enforced by the
-- separate trigger below, not by the grant (grants are not role-aware in our
-- resident/staff sense — RLS/triggers do that narrowing).
grant update (status, staff_note, is_published,
              withdrawn_at, withdrawn_by, withdrawal_reason)
  on public.complaints to authenticated;

-- status_events: authenticated reads (policies scope own/staff). No insert/
-- update/delete grant to anyone — the trigger (definer) writes rows.
grant select on public.complaint_status_events to authenticated;

grant execute on function public.next_complaint_ticket() to authenticated;

-- ═══ WITHDRAWAL: Admin-only, enforced by a SEPARATE, NARROWER rule (§34) ══
-- The two-tier trust model made real. A Ward Secretary must NOT be able to
-- withdraw a complaint from the public record; only an Admin may. This is not a
-- hidden button — the database itself rejects a secretary's withdrawal.
--
-- Mechanism: a BEFORE UPDATE trigger. If this update is SETTING withdrawal
-- (withdrawn_at goes from null to non-null), the current role MUST be 'admin',
-- else the update is rejected. Also blocks UN-withdrawing (a permanent record).
-- A trigger is used rather than a column policy because Postgres RLS cannot
-- express "only this role may change these specific columns" — it gates rows,
-- not columns. This is the precise mechanism that makes the distinction real.
create function public.enforce_withdrawal_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A withdrawal is being SET (was not withdrawn, now is).
  if (old.withdrawn_at is null and new.withdrawn_at is not null) then
    if public.current_role() <> 'admin' then
      raise exception 'Only an Admin may withdraw a complaint.';
    end if;
    -- Stamp the withdrawing admin's identity from the session, not the payload,
    -- so withdrawn_by cannot be forged.
    new.withdrawn_by := auth.uid();
  end if;
  -- A withdrawal, once made, is permanent — it cannot be reversed by anyone.
  if (old.withdrawn_at is not null and new.withdrawn_at is null) then
    raise exception 'A withdrawal is permanent and cannot be reversed.';
  end if;
  return new;
end;
$$;

create trigger trg_complaints_enforce_withdrawal
  before update on public.complaints
  for each row execute function public.enforce_withdrawal_is_admin();

-- ═══ complaints_public — THE ONLY PUBLIC DOOR (§8.5, §9.3) ══════════════
-- A VIEW, not a table. It structurally OMITS user_id, photo_file, and
-- staff_note — those columns are not selected, so no policy or grant could ever
-- expose them; they are not present to expose. It joins the category's
-- bilingual name so the raw category_id is never shown either. It returns only
-- published, non-withdrawn complaints.
--
-- security_invoker = false (the default for a view, stated explicitly here):
-- the view reads the complaints table under ITS OWNER's rights, NOT the
-- visitor's. The public is granted permission on the VIEW only, and NOTHING on
-- the complaints table. This is the whole design:
--   • If it read under the visitor's rights, the public (who has no permission
--     on complaints) would get an empty tracker.
--   • Granting the public permission on complaints "to fix that" would let
--     anyone query the table directly and read identities and photos.
-- So: view under owner rights + zero public permission on the table.
--
-- ⚠️  Supabase's database linter WILL flag this view as a
-- "security definer view" / unusual configuration. THIS IS DELIBERATE AND
-- CORRECT (§9.3). A future maintainer must NOT "fix" it by adding
-- security_invoker or granting the public access to the complaints table —
-- either change silently empties the public tracker or leaks complainant
-- identities. Leave it exactly as written.
create view public.complaints_public
with (security_invoker = false) as
  select
    c.ticket_id,
    cc.name_ne as category_name_ne,
    cc.name_en as category_name_en,
    c.description,
    c.location_text,
    c.status,
    c.created_at
  from public.complaints c
  join public.complaint_categories cc on cc.id = c.category_id
  where c.is_published = true
    and c.withdrawn_at is null;

-- The public reads the VIEW, and only the view. Grant on the view to everyone;
-- the complaints table itself has NO anon grant (see above).
grant select on public.complaints_public to anon, authenticated;
