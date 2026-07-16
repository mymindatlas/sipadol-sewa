import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { updateNotice } from '../actions'
import { NoticeEditor } from '../notice-editor'

export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const noticeId = Number(id)
  if (!Number.isInteger(noticeId)) notFound()

  const supabase = await createClient()
  const [{ data: notice }, { data: categories }] = await Promise.all([
    supabase
      .from('notices')
      .select('id, title_ne, title_en, body_ne, body_en, category_id')
      .eq('id', noticeId)
      .maybeSingle(),
    supabase
      .from('notice_categories')
      .select('id, name_ne, name_en, is_active')
      .order('display_order', { ascending: true }),
  ])

  if (!notice) notFound()

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">Edit notice</h1>
      <NoticeEditor
        action={updateNotice}
        categories={categories ?? []}
        initial={notice}
      />
    </div>
  )
}
