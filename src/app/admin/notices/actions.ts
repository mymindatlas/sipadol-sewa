'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Staff-only by RLS: every statement here runs as the signed-in user, so
// a non-staff caller's insert/update/delete is refused by the policies on
// notices/notice_categories (current_role() checked live, PRD §3.1).
// Nothing in this file is the enforcement layer.

export type NoticeFormState = {
  error?: string
}

// PRD §10.4 — public pages are cached; every staff mutation must refresh
// the notice board and the homepage or staff publish and see the old list.
function revalidateNoticePaths(noticeId?: number) {
  revalidatePath('/')
  revalidatePath('/notices')
  if (noticeId !== undefined) revalidatePath(`/notices/${noticeId}`)
  revalidatePath('/admin/notices')
}

type NoticeFields = {
  title_ne: string
  title_en: string
  body_ne: string
  body_en: string
  category_id: number
}

function readNoticeFields(formData: FormData):
  | { fields: NoticeFields; error?: never }
  | { fields?: never; error: string } {
  const title_ne = formData.get('title_ne')?.toString().trim() ?? ''
  const title_en = formData.get('title_en')?.toString().trim() ?? ''
  const body_ne = formData.get('body_ne')?.toString().trim() ?? ''
  const body_en = formData.get('body_en')?.toString().trim() ?? ''
  const category_id = Number(formData.get('category_id'))

  // §32.1 — the editor requires BOTH languages. Staff author both; there
  // is no runtime translation anywhere in this system (PRD §4).
  if (!title_ne || !title_en || !body_ne || !body_en) {
    return {
      error:
        'Both languages are required: Nepali and English title and body. दुवै भाषा आवश्यक छ।',
    }
  }
  if (!Number.isInteger(category_id) || category_id <= 0) {
    return { error: 'Choose a category.' }
  }

  return { fields: { title_ne, title_en, body_ne, body_en, category_id } }
}

export async function createNotice(
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  const parsed = readNoticeFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const publishNow = formData.get('publish_now') === 'on'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notices')
    .insert({
      ...parsed.fields,
      ...(publishNow
        ? { is_published: true, published_at: new Date().toISOString() }
        : {}),
    })
    .select('id')
    .single()

  if (error) {
    return { error: `Could not create the notice: ${error.message}` }
  }

  revalidateNoticePaths(data.id)
  redirect('/admin/notices')
}

export async function updateNotice(
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Missing notice id.' }

  const parsed = readNoticeFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('notices')
    .update(parsed.fields, { count: 'exact' })
    .eq('id', id)

  if (error) {
    return { error: `Could not save the notice: ${error.message}` }
  }
  if (count === 0) {
    // RLS returned nothing — not staff, or the notice is gone.
    return { error: 'Notice not found.' }
  }

  revalidateNoticePaths(id)
  redirect('/admin/notices')
}

export async function toggleNoticePublished(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()

  // Read the current state so published_at is set exactly when
  // is_published flips false → true.
  const { data: notice } = await supabase
    .from('notices')
    .select('is_published')
    .eq('id', id)
    .maybeSingle()
  if (!notice) return

  const publishing = !notice.is_published
  await supabase
    .from('notices')
    .update(
      publishing
        ? { is_published: true, published_at: new Date().toISOString() }
        : { is_published: false }
    )
    .eq('id', id)

  revalidateNoticePaths(id)
}

export async function deleteNotice(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase.from('notices').delete().eq('id', id)

  revalidateNoticePaths(id)
}

// ── Categories (§32.1: managed in a small interface on the same page) ───

export type CategoryFormState = {
  error?: string
}

function readCategoryNames(formData: FormData) {
  const name_ne = formData.get('name_ne')?.toString().trim() ?? ''
  const name_en = formData.get('name_en')?.toString().trim() ?? ''
  return { name_ne, name_en }
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const { name_ne, name_en } = readCategoryNames(formData)
  if (!name_ne || !name_en) {
    return { error: 'Both names are required — Nepali and English.' }
  }

  const supabase = await createClient()

  // Append to the end of the display order. This is UI ordering for a
  // handful of staff-managed rows, not a reference number — the
  // sequences-only rule (§8.5) is about identifiers that must never
  // collide.
  const { data: last } = await supabase
    .from('notice_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('notice_categories').insert({
    name_ne,
    name_en,
    display_order: (last?.display_order ?? 0) + 1,
  })

  if (error) {
    return { error: `Could not add the category: ${error.message}` }
  }

  revalidateNoticePaths()
  return {}
}

export async function updateCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const id = Number(formData.get('id'))
  const { name_ne, name_en } = readCategoryNames(formData)
  const is_active = formData.get('is_active') === 'on'

  if (!Number.isInteger(id)) return { error: 'Missing category id.' }
  if (!name_ne || !name_en) {
    return { error: 'Both names are required — Nepali and English.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notice_categories')
    .update({ name_ne, name_en, is_active })
    .eq('id', id)

  if (error) {
    return { error: `Could not save the category: ${error.message}` }
  }

  revalidateNoticePaths()
  return {}
}

export async function moveCategory(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  const direction = formData.get('direction')
  if (!Number.isInteger(id) || (direction !== 'up' && direction !== 'down')) {
    return
  }

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('notice_categories')
    .select('id, display_order')
    .order('display_order', { ascending: true })
  if (!categories) return

  const index = categories.findIndex((c) => c.id === id)
  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || neighborIndex < 0 || neighborIndex >= categories.length) {
    return
  }

  const current = categories[index]
  const neighbor = categories[neighborIndex]

  // Swap the two orders. Two updates, not a transaction — a failure
  // between them leaves a cosmetic ordering glitch staff can re-click,
  // nothing more.
  await supabase
    .from('notice_categories')
    .update({ display_order: neighbor.display_order })
    .eq('id', current.id)
  await supabase
    .from('notice_categories')
    .update({ display_order: current.display_order })
    .eq('id', neighbor.id)

  revalidateNoticePaths()
}
