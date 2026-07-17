import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { updateRepresentative } from '../actions'
import { RepresentativeEditor } from '../representative-editor'

export default async function EditRepresentativePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const repId = Number(id)
  if (!Number.isInteger(repId)) notFound()

  const supabase = await createClient()
  const { data: rep } = await supabase
    .from('representatives')
    .select(
      'id, full_name_ne, full_name_en, role_ne, role_en, bio_ne, bio_en, phone, email, photo_public_id, display_order, is_active'
    )
    .eq('id', repId)
    .maybeSingle()

  if (!rep) notFound()

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">Edit representative</h1>
      <RepresentativeEditor action={updateRepresentative} initial={rep} />
    </div>
  )
}
