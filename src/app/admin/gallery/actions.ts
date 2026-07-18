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
        'Slug must be lowercase letters, numbers and single hyphens between them — for example "dashain-2082".',
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
