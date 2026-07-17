'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Staff-only by RLS (§32.4): every statement here runs as the signed-in
// user, so a non-staff caller's write is refused by the representatives
// policies (current_role() checked live, §3.1). Nothing here is enforcement.

export type RepFormState = {
  error?: string
}

// §10.4 — /representatives and the homepage are cached; every mutation must
// refresh them or staff edit a representative and see the old grid.
function revalidateRepPaths() {
  revalidatePath('/')
  revalidatePath('/representatives')
  revalidatePath('/admin/representatives')
}

type RepFields = {
  full_name_ne: string
  full_name_en: string
  role_ne: string
  role_en: string
  bio_ne: string
  bio_en: string
  phone: string | null
  email: string | null
  photo_public_id: string | null
  display_order: number
  is_active: boolean
}

function readRepFields(formData: FormData):
  | { fields: RepFields; error?: never }
  | { fields?: never; error: string } {
  const full_name_ne = formData.get('full_name_ne')?.toString().trim() ?? ''
  const full_name_en = formData.get('full_name_en')?.toString().trim() ?? ''
  const role_ne = formData.get('role_ne')?.toString().trim() ?? ''
  const role_en = formData.get('role_en')?.toString().trim() ?? ''
  const bio_ne = formData.get('bio_ne')?.toString().trim() ?? ''
  const bio_en = formData.get('bio_en')?.toString().trim() ?? ''
  const phone = formData.get('phone')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const photo = formData.get('photo_public_id')?.toString().trim() ?? ''
  const display_order = Number(formData.get('display_order') ?? 0)
  const is_active = formData.get('is_active') === 'on'

  // §4 — both languages are authored by staff; no runtime translation.
  if (
    !full_name_ne ||
    !full_name_en ||
    !role_ne ||
    !role_en ||
    !bio_ne ||
    !bio_en
  ) {
    return {
      error:
        'Both languages are required for name, role and bio. दुवै भाषा आवश्यक छ।',
    }
  }
  if (!Number.isInteger(display_order)) {
    return { error: 'Display order must be a whole number.' }
  }

  return {
    fields: {
      full_name_ne,
      full_name_en,
      role_ne,
      role_en,
      bio_ne,
      bio_en,
      phone: phone || null,
      email: email || null,
      photo_public_id: photo || null,
      display_order,
      is_active,
    },
  }
}

export async function createRepresentative(
  _prevState: RepFormState,
  formData: FormData
): Promise<RepFormState> {
  const parsed = readRepFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  const { error } = await supabase.from('representatives').insert(parsed.fields)

  if (error) {
    return { error: `Could not create the representative: ${error.message}` }
  }

  revalidateRepPaths()
  redirect('/admin/representatives')
}

export async function updateRepresentative(
  _prevState: RepFormState,
  formData: FormData
): Promise<RepFormState> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Missing representative id.' }

  const parsed = readRepFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('representatives')
    .update(parsed.fields, { count: 'exact' })
    .eq('id', id)

  if (error) {
    return { error: `Could not save the representative: ${error.message}` }
  }
  if (count === 0) {
    // RLS returned nothing — not staff, or the row is gone.
    return { error: 'Representative not found.' }
  }

  revalidateRepPaths()
  redirect('/admin/representatives')
}

export async function deleteRepresentative(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase.from('representatives').delete().eq('id', id)

  revalidateRepPaths()
}
