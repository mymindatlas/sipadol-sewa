import { createClient } from '@/lib/supabase/server'

import { createNotice } from '../actions'
import { NoticeEditor } from '../notice-editor'

export default async function NewNoticePage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('notice_categories')
    .select('id, name_ne, name_en, is_active')
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">New notice</h1>
      <NoticeEditor action={createNotice} categories={categories ?? []} />
    </div>
  )
}
