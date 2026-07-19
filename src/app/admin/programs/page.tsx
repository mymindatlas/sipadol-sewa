import Link from 'next/link'

import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button'
import { createClient } from '@/lib/supabase/server'

import { deleteProgram, toggleProgramPublished } from './actions'

// §32.5 — all programmes including drafts (staff RLS). Reads run as the
// signed-in staff user; "programs_select_staff" is what makes unpublished
// rows visible here.

export default async function AdminProgramsPage() {
  const supabase = await createClient()

  const { data: programs } = await supabase
    .from('programs')
    .select(
      'id, title_ne, title_en, start_date, end_date, registration_open, is_published'
    )
    .order('start_date', { ascending: false })

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Programmes · कार्यक्रम
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Newest start date first. Draft programmes are visible only here.
          </p>
        </div>
        <Link
          href="/admin/programs/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + New programme
        </Link>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Dates</th>
              <th className="px-3 py-2.5">Registration</th>
              <th className="px-3 py-2.5">State</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(programs ?? []).map((program) => (
              <tr key={program.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5">
                  <span className="block font-medium text-slate-900">
                    {program.title_ne}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {program.title_en}
                  </span>
                </td>
                {/* Raw stored dates for now — the admin list is staff-facing
                    and unambiguous this way. Localized BS rendering (§4.2)
                    belongs on the public page, which is a separate task. */}
                <td className="px-3 py-2.5 text-slate-600">
                  {program.start_date}
                  {program.end_date ? ` – ${program.end_date}` : ''}
                </td>
                <td className="px-3 py-2.5">
                  {program.registration_open ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      Open
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Closed
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {program.is_published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/programs/${program.id}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/programs/${program.id}/registrations`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Registrations
                    </Link>
                    <form action={toggleProgramPublished}>
                      <input type="hidden" name="id" value={program.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {program.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </form>
                    <form action={deleteProgram}>
                      <input type="hidden" name="id" value={program.id} />
                      <ConfirmSubmitButton
                        message={`Delete "${program.title_ne}"? This also deletes its registrations. This cannot be undone.`}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(programs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No programmes yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
