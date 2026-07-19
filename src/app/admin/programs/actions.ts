'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Staff-only by RLS (§32.5): every statement here runs as the signed-in
// user, so a non-staff caller's write is refused by the programs policies
// (current_role() checked live, §3.1). Nothing here is enforcement.

export type ProgramFormState = {
  error?: string
}

// §10.4 — /programs and the homepage are cached; every mutation must refresh
// them or staff publish a programme and see the old list.
function revalidateProgramPaths() {
  revalidatePath('/')
  revalidatePath('/programs')
  revalidatePath('/admin/programs')
}

// start_date, end_date and registration_deadline are `date` columns, not
// timestamptz (migration 0011): a programme runs on calendar days. An HTML
// date input already posts 'YYYY-MM-DD', which is exactly what Postgres
// wants, so the value is stored AS TYPED — no Date round-trip, no timezone
// conversion. Applying the +05:45 offset here is what would introduce the
// off-by-one-day bug §4.2 warns about, not what avoids it.
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Rejects both malformed strings and calendar-impossible ones (2082-02-31).
// The UTC parse is used ONLY to test validity — the string itself is what
// gets stored, so this cannot shift a day.
function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

type ProgramFields = {
  title_ne: string
  title_en: string
  description_ne: string
  description_en: string
  start_date: string
  end_date: string | null
  registration_deadline: string | null
  registration_open: boolean
  is_published: boolean
  banner_public_id: string | null
}

function readProgramFields(formData: FormData):
  | { fields: ProgramFields; error?: never }
  | { fields?: never; error: string } {
  const title_ne = formData.get('title_ne')?.toString().trim() ?? ''
  const title_en = formData.get('title_en')?.toString().trim() ?? ''
  const description_ne = formData.get('description_ne')?.toString().trim() ?? ''
  const description_en = formData.get('description_en')?.toString().trim() ?? ''
  const start_date = formData.get('start_date')?.toString().trim() ?? ''
  const end_date = formData.get('end_date')?.toString().trim() ?? ''
  const registration_deadline =
    formData.get('registration_deadline')?.toString().trim() ?? ''
  const registration_open = formData.get('registration_open') === 'on'
  const is_published = formData.get('is_published') === 'on'
  // Produced by SignedUpload, not typed — empty means no banner yet.
  const banner_public_id =
    formData.get('banner_public_id')?.toString().trim() || null

  // §4 — both languages are authored by staff; no runtime translation.
  if (!title_ne || !title_en) {
    return {
      error: 'Both languages are required for the title. दुवै भाषा आवश्यक छ।',
    }
  }
  if (!description_ne || !description_en) {
    return {
      error:
        'Both languages are required for the description. दुवै भाषा आवश्यक छ।',
    }
  }

  if (!isValidDate(start_date)) {
    return { error: 'A valid start date is required.' }
  }
  // Optional: a one-day programme has no end.
  if (end_date && !isValidDate(end_date)) {
    return { error: 'The end date is not a valid date.' }
  }
  // ISO 'YYYY-MM-DD' sorts correctly as a plain string, so no parsing is
  // needed to compare two of them.
  if (end_date && end_date < start_date) {
    return {
      error:
        'The end date cannot be before the start date. अन्त्य मिति सुरु मिति भन्दा अगाडि हुन सक्दैन।',
    }
  }
  // Optional: a programme may take signups with no separate deadline.
  if (registration_deadline && !isValidDate(registration_deadline)) {
    return { error: 'The registration deadline is not a valid date.' }
  }

  return {
    fields: {
      title_ne,
      title_en,
      description_ne,
      description_en,
      start_date,
      end_date: end_date || null,
      registration_deadline: registration_deadline || null,
      registration_open,
      is_published,
      banner_public_id,
    },
  }
}

export async function createProgram(
  _prevState: ProgramFormState,
  formData: FormData
): Promise<ProgramFormState> {
  const parsed = readProgramFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  // No created_by — the column defaults to auth.uid() (migration 0011), so
  // the author is recorded by the database rather than trusted from the form.
  const { error } = await supabase.from('programs').insert(parsed.fields)

  if (error) {
    return { error: `Could not create the programme: ${error.message}` }
  }

  revalidateProgramPaths()
  // Land on the list. Unlike an album — which exists to hold photos uploaded
  // on its own page — a programme is complete once created, so there is
  // nothing waiting on the new row's page and no need to read its id back.
  redirect('/admin/programs')
}

export async function updateProgram(
  _prevState: ProgramFormState,
  formData: FormData
): Promise<ProgramFormState> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Missing programme id.' }

  const parsed = readProgramFields(formData)
  if (parsed.error !== undefined) return { error: parsed.error }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('programs')
    .update(parsed.fields, { count: 'exact' })
    .eq('id', id)

  if (error) {
    return { error: `Could not save the programme: ${error.message}` }
  }
  if (count === 0) {
    // RLS returned nothing — not staff, or the row is gone.
    return { error: 'Programme not found.' }
  }

  revalidateProgramPaths()
  redirect('/admin/programs')
}

// One-click publish/unpublish from the list (§32.5), mirroring
// toggleAlbumPublished: programs has is_published and no published_at column,
// so the flag is the whole state — there is nothing to stamp.
export async function toggleProgramPublished(
  formData: FormData
): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()

  const { data: program } = await supabase
    .from('programs')
    .select('is_published')
    .eq('id', id)
    .maybeSingle()
  if (!program) return

  await supabase
    .from('programs')
    .update({ is_published: !program.is_published })
    .eq('id', id)

  revalidateProgramPaths()
}

// Deleting a programme cascades to its registrations (migration 0011,
// ON DELETE CASCADE) — staff export the registrant list first (§32.5).
export async function deleteProgram(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase.from('programs').delete().eq('id', id)

  revalidateProgramPaths()
}
