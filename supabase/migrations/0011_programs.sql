-- Civic programmes module (PRD §8.3, §13, §21, §22, §32.5).
--
-- Two tables plus one function:
--   programs               — staff-managed public content, notices shape.
--   program_registrations  — residents write their OWN rows (the first table
--                            in the system where a resident inserts data),
--                            so its RLS differs from the pure public-read/
--                            staff-write shape of notices and representatives.
--   program_is_open(id)    — the SINGLE definition of "is registration open?",
--                            called by BOTH the insert policy and the pages,
--                            so the list page and detail page can never
--                            disagree (§13 — earlier drafts had two sources
--                            of truth that drifted).
--
-- Deviations from the PRD, approved by the project owner:
--   • program_registrations stores email in addition to full_name and phone
--     (§22 lists only name + phone). A resident may want a separate CONTACT
--     email for a programme, distinct from their fixed account login email
--     (which §36 makes non-editable). All three — name, phone, email — are
--     COPIED (frozen) at registration time, not read live from the profile,
--     so a registrant list is an accurate point-in-time record of how the
--     person asked to be reached FOR THIS PROGRAMME, even if they later
--     change their account. user_id is also stored (the live link) for the
--     one-registration-per-person rule and "my registrations".
--
-- Dates are `date`, not timestamptz: programmes run on calendar days, so this
-- sidesteps the 45-minute NST offset entirely (the wrong-day bug §4.2 warns
-- about for timestamps). end_date and registration_deadline are nullable
-- (a one-day event has no end; a programme may take signups with no separate
-- deadline).

create table public.programs (
  id bigint generated always as identity primary key,
  title_ne text not null,
  title_en text not null,
  description_ne text not null,
  description_en text not null,
  -- Cloudinary public_id, public delivery (§10.3, Decision 7). Nullable: a
  -- programme may be announced before a banner is ready.
  banner_public_id text,
  start_date date not null,
  end_date date,
  -- The staff toggle. Registration is open only when this is true AND the
  -- deadline has not passed — see program_is_open() below. This column alone
  -- is NOT the answer to "is it open?".
  registration_open boolean not null default false,
  registration_deadline date,
  -- Drafts by default; publishing is an explicit staff act (§8.2 pattern).
  is_published boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_registrations (
  id bigint generated always as identity primary key,
  program_id bigint not null
    references public.programs (id) on delete cascade,
  -- The live link to the account. Never exposed publicly.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Frozen at registration: how this person asked to be contacted for THIS
  -- programme. Copied from the profile at signup, editable in the form,
  -- unchanged thereafter.
  full_name text not null,
  phone text not null,
  email text not null,
  note text,
  created_at timestamptz not null default now(),
  -- One registration per resident per programme (§13). A headcount that can
  -- be inflated by pressing register twenty times is not a headcount.
  constraint program_registrations_unique_per_person
    unique (program_id, user_id)
);

-- The public list: published programmes, soonest/most-recent first is decided
-- in the query; this index serves the common ordering by start_date.
create index programs_published_start_idx
  on public.programs (is_published, start_date desc);
-- Staff pull the registrant list for one programme by program_id.
create index program_registrations_program_id_idx
  on public.program_registrations (program_id);
-- A resident reads their own registrations across programmes.
create index program_registrations_user_id_idx
  on public.program_registrations (user_id);

create trigger trg_programs_touch_updated_at
  before update on public.programs
  for each row
  execute function public.touch_updated_at();

-- ── The single open-registration definition (§13) ──────────────────────
-- Registration is open when the staff toggle is on AND the deadline (if any)
-- has not passed. Defined ONCE here so the list page, the detail page, and
-- the insert policy below all agree by construction. SECURITY DEFINER +
-- a fixed search_path so it evaluates consistently regardless of caller.
create function public.program_is_open(p_program_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p.is_published
    and p.registration_open
    and (p.registration_deadline is null
         or p.registration_deadline >= current_date)
  from public.programs p
  where p.id = p_program_id;
$$;

alter table public.programs enable row level security;
alter table public.program_registrations enable row level security;

-- ── programs policies: public read published, staff write ──────────────
-- Role checks call current_role() (live profiles read), never the JWT (§3.1).

create policy "programs_select_published"
  on public.programs
  for select
  to anon, authenticated
  using (is_published = true);

create policy "programs_select_staff"
  on public.programs
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "programs_insert_staff"
  on public.programs
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "programs_update_staff"
  on public.programs
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "programs_delete_staff"
  on public.programs
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- ── program_registrations policies: resident writes OWN, staff read all ─
-- This is the new shape. A resident may insert a row only for themselves,
-- and only while the programme is open — the open-check lives in the policy
-- (§22), not just the UI, so sending data straight to the database cannot
-- register for a closed or ended programme.

-- A resident inserts their own registration, only if the programme is open.
-- Both conditions matter: user_id = auth.uid() stops registering as someone
-- else; program_is_open() stops registering when closed/past-deadline.
create policy "program_registrations_insert_own_if_open"
  on public.program_registrations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.program_is_open(program_id)
  );

-- A resident reads only their own registrations.
create policy "program_registrations_select_own"
  on public.program_registrations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Staff read every registration (the registrant list, §32.5). This is a
-- second, broader SELECT policy; Postgres ORs policies of the same command,
-- so staff see all rows while a resident still sees only their own.
create policy "program_registrations_select_staff"
  on public.program_registrations
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- No UPDATE or DELETE policy for anyone: a registration is not editable after
-- the fact, and rows disappear only via the programme's ON DELETE CASCADE
-- (staff export the registrant list before deleting a completed programme —
-- §32.5). If staff-side removal of a single registration is ever needed, it
-- is a deliberate later addition, added here as its own policy.

-- ── Grants: whether the OPERATION is permitted at all (the 0006 lesson) ─
-- Postgres checks the grant before RLS is evaluated. `authenticated` is one
-- role for residents and staff alike, so grants go to authenticated and the
-- policies do the narrowing. anon gets SELECT on programs only, and nothing
-- at all on registrations — the public never reads who registered.
grant select on public.programs to anon, authenticated;
grant insert, update, delete on public.programs to authenticated;

grant select, insert on public.program_registrations to authenticated;
-- Note: no update/delete grant on registrations for anyone, matching the
-- absence of those policies above.

grant execute on function public.program_is_open(bigint) to anon, authenticated;
