import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

import { coverImageUrl, formatYearBs } from '../../format'
import { PhotoGrid, type GalleryPhoto } from './photo-grid'

// §18 — public album detail. The .eq('is_published', true) keeps the page
// honest even for a staff session (whose RLS would let drafts through); for
// everyone else the RLS policy already excludes drafts, so an unpublished
// album is indistinguishable from a nonexistent one: 404.

type AlbumRow = {
  id: number
  year_bs: number
  slug: string
  title_ne: string
  title_en: string
  cover_photo_id: number | null
}

// cache() dedupes between generateMetadata and the page render.
const getAlbum = cache(
  async (year: string, slug: string): Promise<AlbumRow | null> => {
    const yearBs = Number(year)
    if (!Number.isInteger(yearBs)) return null

    const supabase = await createClient()
    const { data } = await supabase
      .from('gallery_albums')
      .select('id, year_bs, slug, title_ne, title_en, cover_photo_id')
      .eq('year_bs', yearBs)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle<AlbumRow>()

    return data
  }
)

const getPhotos = cache(async (albumId: number) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gallery_photos')
    .select('id, photo_public_id, caption_ne, caption_en')
    .eq('album_id', albumId)
    .order('display_order', { ascending: true })

  return data ?? []
})

type Props = { params: Promise<{ year: string; slug: string }> }

// §10.5 — an album shared into WhatsApp renders as a card with its own cover
// rather than the ward's generic one.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year, slug } = await params
  const [album, lang] = await Promise.all([getAlbum(year, slug), getLang()])
  if (!album) return buildMetadata()

  const photos = await getPhotos(album.id)
  const cover =
    (album.cover_photo_id != null
      ? photos.find((p) => p.id === album.cover_photo_id)
      : undefined) ?? photos[0]

  return buildMetadata({
    title: localized(album, 'title', lang),
    description:
      lang === 'ne'
        ? `${localized(album, 'title', lang)} — ${formatYearBs(album.year_bs, lang)} का तस्बिरहरू।`
        : `Photos from ${localized(album, 'title', lang)}, ${formatYearBs(album.year_bs, lang)}.`,
    image: cover ? coverImageUrl(cover.photo_public_id) : undefined,
    path: `/gallery/${album.year_bs}/${album.slug}`,
  })
}

export default async function AlbumDetailPage({ params }: Props) {
  const { year, slug } = await params
  const [album, lang] = await Promise.all([getAlbum(year, slug), getLang()])
  if (!album) notFound()

  const photoRows = await getPhotos(album.id)

  const photos: GalleryPhoto[] = photoRows.map((photo) => ({
    id: photo.id,
    publicId: photo.photo_public_id,
    // Optional by design — localized() returns '' when neither language has
    // one, and PhotoGrid renders no caption bar for an empty string.
    caption: localized(photo, 'caption', lang),
  }))

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm font-medium text-blue-800">
          {formatYearBs(album.year_bs, lang)}
        </p>
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-slate-900">
          {localized(album, 'title', lang)}
        </h1>
      </header>

      {photos.length === 0 ? (
        <p className="text-sm text-slate-500">
          {lang === 'ne'
            ? 'यस एल्बममा अहिले कुनै तस्बिर छैन।'
            : 'This album has no photos yet.'}
        </p>
      ) : (
        <PhotoGrid photos={photos} lang={lang} />
      )}
    </div>
  )
}
