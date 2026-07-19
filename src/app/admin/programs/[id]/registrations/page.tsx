import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ExportCsvButton } from '@/components/shared/export-csv-button'
import { toCsv, type CsvColumn } from '@/lib/csv'
import { formatDateTime } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

// §32.5 — the registrant list. Every row here is visible because of
// "program_registrations_select_staff"; a resident hitting this same query
// sees only their own row, and the admin layout's role gate is UX on top of
// that, never the enforcement.
//
// created_at is a timestamptz (an instant a resident pressed a button), so it
// renders through formatDateTime — unlike the programme's start/end, which
// are `date` columns and use formatDateOnly. Mixing the two is the §4.2 bug.

// English-only headers and values: this file goes to a spreadsheet and is
// read by staff, not rendered to residents. Names and notes stay in whatever
// language the resident typed them, which is why the BOM in lib/csv.ts
// matters.
const CSV_COLUMNS: CsvColumn[] = [
  { key: 'full_name', header: 'Full name' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'note', header: 'Note' },
  { key: 'registered_at', header: 'Registered at' },
]

export default async function ProgramRegistrationsPage({
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
    .select('id, title_ne, title_en')
    .eq('id', programId)
    .maybeSingle()

  if (!program) notFound()

  const { data: registrationRows } = await supabase
    .from('program_registrations')
    .select('id, full_name, phone, email, note, created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: true })

  const registrations = registrationRows ?? []

  // Built from the same rows the table renders, so the file and the screen
  // can never disagree. 'en' for the timestamp: a spreadsheet column is
  // sorted and filtered, and Bikram Sambat text would not sort.
  const csv = toCsv(
    registrations.map((registration) => ({
      full_name: registration.full_name,
      phone: registration.phone,
      email: registration.email,
      note: registration.note,
      registered_at: formatDateTime(registration.created_at, 'en'),
    })),
    CSV_COLUMNS
  )

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link
          href="/admin/programs"
          className="inline-block text-sm font-medium text-slate-600 hover:text-blue-800 hover:underline"
        >
          ← Back to programmes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {program.title_ne}
            </h1>
            <p className="text-sm text-slate-500">{program.title_en}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              कुल दर्ता: {registrations.length} · {registrations.length}{' '}
              registered
            </p>
          </div>

          {registrations.length > 0 && (
            <ExportCsvButton
              filename={`registrations-${programId}.csv`}
              csv={csv}
            />
          )}
        </div>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Full name</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5">Registered at</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration, index) => (
              <tr key={registration.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-slate-500">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium text-slate-900">
                  {registration.full_name}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {registration.phone}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {registration.email}
                </td>
                <td className="px-3 py-2.5 whitespace-pre-line text-slate-600">
                  {registration.note}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatDateTime(registration.created_at, 'en')}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  अझै कुनै दर्ता छैन। (No registrations yet.)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
