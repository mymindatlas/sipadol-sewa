import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { updateProgram } from '../actions'
import { ProgramEditor } from '../program-editor'

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const programId = Number(id)
  if (!Number.isInteger(programId)) notFound()

  const supabase = await createClient()
  const { data: program } = await supabase
    .from('programs')
    .select(
      'id, title_ne, title_en, description_ne, description_en, start_date, end_date, registration_deadline, registration_open, is_published, banner_public_id'
    )
    .eq('id', programId)
    .maybeSingle()

  if (!program) notFound()

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Edit programme</h1>
        {/* Said here rather than in ProgramEditor, which is shared with /new
            where there is nothing registered yet to affect. */}
        <p className="mt-1 text-sm text-slate-600">
          दर्ता खुला/बन्द र अन्तिम मिति दुवैले दर्ता रोक्छ। (Registration is open
          only while the checkbox is on AND the deadline has not passed.)
        </p>
      </header>
      <ProgramEditor action={updateProgram} initial={program} />
    </div>
  )
}
