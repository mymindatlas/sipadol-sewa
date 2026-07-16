-- Notices vertical slice (PRD §8.2, §9.4, §15, §16, §32.1).
-- Categories live in their own table so the Ward Secretary can add one
-- from the admin screen without a developer (same pattern §8.5 reuses
-- for complaint_categories).

create table public.notice_categories (
  id bigint generated always as identity primary key,
  name_ne text not null,
  name_en text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notices (
  id bigint generated always as identity primary key,
  title_ne text not null,
  title_en text not null,
  body_ne text not null,
  body_en text not null,
  category_id bigint not null references public.notice_categories (id),
  -- Cloudinary public_id, public delivery (§10.3). Upload flow arrives in
  -- a later phase; the column exists now so it isn't a schema change then.
  attachment_public_id text,
  -- Drafts by default; publishing is an explicit staff act (§8.2).
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notices_category_id_idx on public.notices (category_id);
-- The public list: published rows, newest first.
create index notices_published_idx
  on public.notices (is_published, published_at desc);

create trigger trg_notice_categories_touch_updated_at
  before update on public.notice_categories
  for each row
  execute function public.touch_updated_at();

create trigger trg_notices_touch_updated_at
  before update on public.notices
  for each row
  execute function public.touch_updated_at();

alter table public.notice_categories enable row level security;
alter table public.notices enable row level security;

-- ── Policies: which ROWS each request may touch ─────────────────────────
-- Role checks call current_role() (live profiles read), never the JWT —
-- a demoted staff member must lose write access on their next action,
-- not when their token expires (PRD §3.1).

-- Everyone reads published notices. Drafts are excluded by this rule,
-- not by any page (§15.5).
create policy "notices_select_published"
  on public.notices
  for select
  to anon, authenticated
  using (is_published = true);

-- Staff also see drafts.
create policy "notices_select_staff"
  on public.notices
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "notices_insert_staff"
  on public.notices
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "notices_update_staff"
  on public.notices
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "notices_delete_staff"
  on public.notices
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- Same shape for categories: public read, staff write (§9.4).
create policy "notice_categories_select_all"
  on public.notice_categories
  for select
  to anon, authenticated
  using (true);

create policy "notice_categories_insert_staff"
  on public.notice_categories
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "notice_categories_update_staff"
  on public.notice_categories
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "notice_categories_delete_staff"
  on public.notice_categories
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

-- ── Grants: whether the OPERATION is permitted at all ───────────────────
-- Both layers are required. 0006 exists because we shipped policies
-- without grants and residents couldn't read their own profile row —
-- Postgres checks the grant before RLS is evaluated at all.
--
-- `authenticated` is the same Postgres role for residents and staff
-- alike, so write grants necessarily go to `authenticated`; the staff
-- restriction lives in the policies above. anon gets SELECT and nothing
-- else.
grant select on public.notices, public.notice_categories to anon, authenticated;
grant insert, update, delete on public.notices, public.notice_categories to authenticated;

-- ── Starter categories ──────────────────────────────────────────────────
insert into public.notice_categories (name_ne, name_en, display_order) values
  ('सामान्य सूचना', 'General Notice', 1),
  ('बोलपत्र तथा खरिद', 'Tenders & Procurement', 2),
  ('स्वास्थ्य तथा सरसफाइ', 'Health & Sanitation', 3),
  ('विपद् व्यवस्थापन', 'Disaster Management', 4),
  ('कार्यक्रम तथा समारोह', 'Events & Ceremonies', 5);
