-- Representatives module (PRD §8.2, §20, §32.4, Decision 6).
-- Public content — ward officials shown on /representatives with written
-- consent. Same shape as notices (0007): public read of the active rows,
-- staff-only write, role checks call current_role() live (§3.1).
--
-- bigint id per the AGENTS.md primary-key rule: this is public content
-- with nothing to protect, so a readable/guessable id costs nothing.

create table public.representatives (
  id bigint generated always as identity primary key,
  full_name_ne text not null,
  full_name_en text not null,
  role_ne text not null,
  role_en text not null,
  bio_ne text not null,
  bio_en text not null,
  phone text,
  email text,
  -- Cloudinary public_id, PUBLIC delivery (§10.3, Decision 7): these are
  -- public officials in their official capacity. Served through a
  -- transformation, never the original — that strips EXIF GPS. Nullable:
  -- a representative may be listed before a photo/consent is on hand.
  photo_public_id text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The public list: active rows, senior roles first (§20.4).
create index representatives_active_order_idx
  on public.representatives (is_active, display_order);

create trigger trg_representatives_touch_updated_at
  before update on public.representatives
  for each row
  execute function public.touch_updated_at();

alter table public.representatives enable row level security;

-- ── Policies: which ROWS each request may touch ─────────────────────────
-- Role checks call current_role() (live profiles read), never the JWT —
-- a demoted staff member must lose write access on their next action,
-- not when their token expires (PRD §3.1).

-- Everyone reads active representatives. Inactive rows are excluded by
-- this rule, not by any page (§20.5).
create policy "representatives_select_active"
  on public.representatives
  for select
  to anon, authenticated
  using (is_active = true);

-- Staff also see inactive rows.
create policy "representatives_select_staff"
  on public.representatives
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "representatives_insert_staff"
  on public.representatives
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "representatives_update_staff"
  on public.representatives
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "representatives_delete_staff"
  on public.representatives
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- ── Grants: whether the OPERATION is permitted at all ───────────────────
-- Both layers are required (the 0006 lesson: Postgres checks the grant
-- before RLS is evaluated at all). `authenticated` is one Postgres role
-- for residents and staff alike, so write grants necessarily go to
-- `authenticated`; the staff restriction lives in the policies above.
-- anon gets SELECT and nothing else.
grant select on public.representatives to anon, authenticated;
grant insert, update, delete on public.representatives to authenticated;
