'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Staff-only by RLS (§32.2): every statement here runs as the signed-in
// user, so a non-staff caller's write is refused by the gallery_albums
// policies (current_role() checked live, §3.1). Nothing here is enforcement.

export type AlbumFormState = {
  error?: string
}

// §10.4 — /gallery and the homepage are cached; every mutation must refresh
// them or staff publish an album and see the old list.
function revalidateGalleryPaths() {
  revalidatePath('/')
  revalidatePath('/gallery')
  revalidatePath('/admin/gallery')
}

// Photo mutations touch one album's admin page and that album's public page.
// The public album route is dynamic, so it is revalidated by route pattern
// rather than by slug — that saves a round-trip to read the slug and still
// clears the one page a resident would otherwise see stale (§10.4).
function revalidateAlbumPaths(albumId: number) {
  revalidatePath(`/admin/gallery/${albumId}`)
  revalidatePath('/gallery')
  revalidatePath('/gallery/[slug]', 'page')
  revalidatePath('/')
}

// Mirrors the gallery_albums_slug_ascii CHECK in migration 0008. Validated
// here so a bad slug produces a sentence naming the rule, rather than the
// opaque constraint-violation string Postgres would return.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

type AlbumFields = {
  year_bs: number
  slug: string
  title_ne: string
  title_en: string
  display_order: number
  is_published: boolean
}

function readAlbumFields(formData: FormData):
  | { fields: AlbumFields; error?: never }
  | { fields?: never; error: string } {
  const year_bs = Number(formData.get('year_bs') ?? '')
  const slug = formData.get('slug')?.toString().trim() ?? ''
  const title_ne = formData.get('title_ne')?.toString().trim() ?? ''
  const title_en = formData.get('title_en')?.toString().trim() ?? ''
  const display_order = Number(formData.get('display_order') ?? 0)
  const is_published = formData.get('is_published') === 'on'

  // §4 — both languages are authored by staff; no runtime translation.
  if (!title_ne || !title_en) {
    return {
      error: 'Both languages are required for the title. दुवै भाषा आवश्यक छ।',
    }
  }
  // Bikram Sambat label, not a date — mirrors the year_bs range CHECK.
  if (!Number.isInteger(year_bs) || year_bs < 2070 || year_bs > 2200) {
    return {
      error: 'Year (BS) must be a whole number between 2070 and 2200.',
    }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      error:
        'ठेगाना (slug) साना अंग्रेजी अक्षर, अंक र जोड्ने चिन्ह (-) मात्र हुनुपर्छ — उदाहरण: dashain-2082. (Slug must be lowercase English letters, numbers and single hyphens only.)',
    }
  }
  if (!Number.isInteger(display_order)) {
    return { error: 'Display order must be a whole number.' }
  }

  return {
    fields: {
      year_bs,
      slug,
      title_ne,
      title_en,
      display_order,
      is_published,
    },
  }
}

export async function createAlbum(
  _prevState: AlbumFormState,
  formData: FormData
): Promise<AlbumFormState> {
  const parsed = readAlbumFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  // No cover_photo_id — a new album has no cover. The cover is designated
  // from photos already in the album, in the photo manager.
  const { error } = await supabase.from('gallery_albums').insert(parsed.fields)

  if (error) {
    return { error: `Could not create the album: ${error.message}` }
  }

  revalidateGalleryPaths()
  redirect('/admin/gallery')
}

export async function updateAlbum(
  _prevState: AlbumFormState,
  formData: FormData
): Promise<AlbumFormState> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Missing album id.' }

  const parsed = readAlbumFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('gallery_albums')
    .update(parsed.fields, { count: 'exact' })
    .eq('id', id)

  if (error) {
    return { error: `Could not save the album: ${error.message}` }
  }
  if (count === 0) {
    // RLS returned nothing — not staff, or the row is gone.
    return { error: 'Album not found.' }
  }

  revalidateGalleryPaths()
  redirect('/admin/gallery')
}

export async function deleteAlbum(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase.from('gallery_albums').delete().eq('id', id)

  revalidateGalleryPaths()
}

// ---------------------------------------------------------------------------
// Photos (§32.2). Plain FormData actions: there is no field to validate that
// the operator could get wrong in a way worth a sentence — the only required
// value, photo_public_id, is produced by SignedUpload rather than typed. RLS
// on gallery_photos is the enforcement; these run as the signed-in user.
// ---------------------------------------------------------------------------

// §32.2 — one photo at a time. The public_id has already been signed, posted
// to Cloudinary and handed back by SignedUpload; this only records the row.
export async function addPhoto(formData: FormData): Promise<void> {
  const album_id = Number(formData.get('album_id'))
  if (!Number.isInteger(album_id)) return

  const photo_public_id = formData.get('photo_public_id')?.toString().trim()
  // Nothing uploaded — the operator submitted an empty picker.
  if (!photo_public_id) return

  const caption_ne = formData.get('caption_ne')?.toString().trim() || null
  const caption_en = formData.get('caption_en')?.toString().trim() || null
  const display_order = Number(formData.get('display_order') ?? 0)

  const supabase = await createClient()
  await supabase.from('gallery_photos').insert({
    album_id,
    photo_public_id,
    caption_ne,
    caption_en,
    display_order: Number.isInteger(display_order) ? display_order : 0,
  })

  revalidateAlbumPaths(album_id)
}

export async function updatePhoto(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  const album_id = Number(formData.get('album_id'))
  if (!Number.isInteger(id) || !Number.isInteger(album_id)) return

  const caption_ne = formData.get('caption_ne')?.toString().trim() || null
  const caption_en = formData.get('caption_en')?.toString().trim() || null
  const display_order = Number(formData.get('display_order') ?? 0)

  const supabase = await createClient()
  await supabase
    .from('gallery_photos')
    .update(
      {
        caption_ne,
        caption_en,
        display_order: Number.isInteger(display_order) ? display_order : 0,
      },
      { count: 'exact' }
    )
    .eq('id', id)

  revalidateAlbumPaths(album_id)
}

// The album's cover_photo_id FK is ON DELETE SET NULL (migration 0008), so
// deleting the photo that is the cover clears the cover by itself. No manual
// cover handling here — adding some would only race with the constraint.
export async function deletePhoto(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  const album_id = Number(formData.get('album_id'))
  if (!Number.isInteger(id) || !Number.isInteger(album_id)) return

  const supabase = await createClient()
  await supabase.from('gallery_photos').delete().eq('id', id)

  revalidateAlbumPaths(album_id)
}

export async function setCover(formData: FormData): Promise<void> {
  const album_id = Number(formData.get('album_id'))
  const id = Number(formData.get('id'))
  if (!Number.isInteger(album_id) || !Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase
    .from('gallery_albums')
    .update({ cover_photo_id: id }, { count: 'exact' })
    .eq('id', album_id)

  revalidateAlbumPaths(album_id)
}
