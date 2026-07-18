import type { Metadata } from 'next'
import Link from 'next/link'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

import { formatPhotoCount, formatYearBs } from './format'

// §17 — public album index. The .eq('is_published', true) states the intent;
// the "gallery_albums_select_published" RLS policy is what actually excludes
// drafts, for every caller, regardless of what this page asks for.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'ग्यालरी' : 'Gallery',
    description:
      lang === 'ne'
        ? 'वडाका कार्यक्रम तथा गतिविधिका तस्बिरहरू।'
        : 'Photos of ward events and activities.',
    path: '/gallery',
  })
}

type AlbumCard = {
  id: number
  year_bs: number
  slug: string
  title_ne: string
  title_en: string
  coverPublicId: string | null
  photoCount: number
}

export default async function GalleryPage() {
  const lang = await getLang()
  const supabase = await createClient()

  const { data: albumRows } = await supabase
    .from('gallery_albums')
    .select('id, year_bs, slug, title_ne, title_en, cover_photo_id, display_order')
    .eq('is_published', true)
    .order('year_bs', { ascending: false })
    .order('display_order', { ascending: true })

  const albums = albumRows ?? []

  // Two queries total, not one per album: every photo belonging to the
  // published albums comes back in a single round-trip, and the cover and
  // the count are both derived from it in memory. Only the four columns the
  // cards need are selected, so the extra rows cost little.
  const { data: photoRows } = albums.length
    ? await supabase
        .from('gallery_photos')
        .select('id, album_id, photo_public_id')
        .in(
          'album_id',
          albums.map((a) => a.id)
        )
        .order('display_order', { ascending: true })
    : { data: [] }

  const photosByAlbum = new Map<number, { id: number; publicId: string }[]>()
  for (const photo of photoRows ?? []) {
    const list = photosByAlbum.get(photo.album_id) ?? []
    list.push({ id: photo.id, publicId: photo.photo_public_id })
    photosByAlbum.set(photo.album_id, list)
  }

  const cards: AlbumCard[] = albums.map((album) => {
    const photos = photosByAlbum.get(album.id) ?? []
    // The designated cover, else the first photo in display order. A cover
    // id that no longer resolves (deleted photo) falls through to the same
    // place rather than rendering a broken image.
    const cover =
      (album.cover_photo_id != null
        ? photos.find((p) => p.id === album.cover_photo_id)
        : undefined) ?? photos[0]

    return {
      id: album.id,
      year_bs: album.year_bs,
      slug: album.slug,
      title_ne: album.title_ne,
      title_en: album.title_en,
      coverPublicId: cover?.publicId ?? null,
      photoCount: photos.length,
    }
  })

  // Albums already arrive newest-year-first, display_order within the year,
  // so grouping in encounter order preserves both.
  const years: { year: number; albums: AlbumCard[] }[] = []
  for (const card of cards) {
    const current = years.at(-1)
    if (current?.year === card.year_bs) current.albums.push(card)
    else years.push({ year: card.year_bs, albums: [card] })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {lang === 'ne' ? 'ग्यालरी' : 'Gallery'}
      </h1>

      {years.length === 0 ? (
        <p className="text-sm text-slate-500">
          {lang === 'ne' ? 'हाल कुनै एल्बम छैन।' : 'No albums yet.'}
        </p>
      ) : (
        years.map((group) => (
          <section key={group.year} className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-700">
              {formatYearBs(group.year, lang)}
            </h2>

            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.albums.map((album) => (
                <li key={album.id}>
                  <Link
                    href={`/gallery/${album.year_bs}/${album.slug}`}
                    className="block overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300"
                  >
                    {album.coverPublicId ? (
                      <CloudinaryImage
                        publicId={album.coverPublicId}
                        alt={localized(album, 'title', lang)}
                        width={640}
                        className="h-44 w-full bg-slate-100 object-cover"
                      />
                    ) : (
                      // Neutral tile, never a broken image: an album can be
                      // published before its photos are uploaded.
                      <span
                        aria-hidden
                        className="flex h-44 w-full items-center justify-center bg-slate-100 text-3xl text-slate-300"
                      >
                        🖼
                      </span>
                    )}
                    <span className="block p-4">
                      <span className="block font-semibold text-slate-900">
                        {localized(album, 'title', lang)}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {formatPhotoCount(album.photoCount, lang)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
