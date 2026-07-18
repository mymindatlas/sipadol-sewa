-- Gallery vertical slice (PRD §8.2, §9.4, §17, §18, §32.2).
--
-- Two tables with a deliberate circular reference:
--   gallery_photos.album_id      -> gallery_albums(id)   NOT NULL, cascade
--   gallery_albums.cover_photo_id -> gallery_photos(id)  nullable, set null
-- Neither can be declared fully inline, so both tables are created first and
-- the cover FK is added afterwards with ALTER TABLE (see below).
--
-- Deviations from PRD §8.2, approved by the project owner:
--   • `year` is stored as `year_bs` — a staff-typed Bikram Sambat label, NOT
--     a date. It never touches dates.ts and is never converted. The _bs
--     suffix stops a future maintainer comparing it against created_at
--     (which is AD timestamptz) and getting silently wrong results.
--   • `is_published` is added (PRD §8.2 omits it). §32.2 uploads photos one
--     at a time by design, guaranteeing a window where the album is
--     half-built; without this flag residents watch it fill. Same default
--     (false) as notices.is_published.
--   • `created_by` mirrors notices — audit of who created public content.
--
-- The cover is a designated photo already in the album (FK), not a separate
-- upload. A new album has no cover; §17 falls back to the first photo by
-- display_order, then to empty-state. on delete set null so removing the
-- cover photo never cascades into the album.

create table public.gallery_albums (
  id bigint generated always as identity primary key,
  year_bs smallint not null,
  slug text not null,
  title_ne text not null,
  title_en text not null,
  cover_photo_id bigint,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_albums_year_slug_key unique (year_bs, slug),
  constraint gallery_albums_slug_ascii
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint gallery_albums_year_bs_range
    check (year_bs between 2070 and 2200)
);

create table public.gallery_photos (
  id bigint generated always as identity primary key,
  album_id bigint not null
    references public.gallery_albums (id) on delete cascade,
  photo_public_id text not null,
  caption_ne text,
  caption_en text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_albums
  add constraint gallery_albums_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.gallery_photos (id) on delete set null;

create index gallery_photos_album_id_display_order_idx
  on public.gallery_photos (album_id, display_order);
create index gallery_albums_year_bs_display_order_idx
  on public.gallery_albums (year_bs desc, display_order);

create trigger trg_gallery_albums_touch_updated_at
  before update on public.gallery_albums
  for each row
  execute function public.touch_updated_at();

create trigger trg_gallery_photos_touch_updated_at
  before update on public.gallery_photos
  for each row
  execute function public.touch_updated_at();

alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;

create policy "gallery_albums_select_published"
  on public.gallery_albums
  for select
  to anon, authenticated
  using (is_published = true);

create policy "gallery_albums_select_staff"
  on public.gallery_albums
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_albums_insert_staff"
  on public.gallery_albums
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_albums_update_staff"
  on public.gallery_albums
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_albums_delete_staff"
  on public.gallery_albums
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_photos_select_published"
  on public.gallery_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.gallery_albums a
      where a.id = gallery_photos.album_id
        and a.is_published = true
    )
  );

create policy "gallery_photos_select_staff"
  on public.gallery_photos
  for select
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_photos_insert_staff"
  on public.gallery_photos
  for insert
  to authenticated
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_photos_update_staff"
  on public.gallery_photos
  for update
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'))
  with check (public.current_role() in ('ward_secretary', 'admin'));

create policy "gallery_photos_delete_staff"
  on public.gallery_photos
  for delete
  to authenticated
  using (public.current_role() in ('ward_secretary', 'admin'));

grant select on public.gallery_albums, public.gallery_photos
  to anon, authenticated;
grant insert, update, delete on public.gallery_albums, public.gallery_photos
  to authenticated;
