import Link from 'next/link'

import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_BADGE,
  COMPLAINT_STATUS_LABELS,
  isComplaintStatus,
} from '@/lib/complaints'
import { formatDateTime } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

// §34 — all complaints including unpublished (staff RLS: complaints_select_staff
// shows every row). Unpublished complaints still appear here and still count on
// the dashboard — that is the mechanism that stops review from becoming
// suppression (Decision 9). This reads from complaints, never complaints_public.

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusParam } = await searchParams
  const activeFilter =
    statusParam && isComplaintStatus(statusParam) ? statusParam : null

  const supabase = await createClient()

  let query = supabase
    .from('complaints')
    .select(
      'id, ticket_id, category_id, status, is_published, withdrawn_at, created_at'
    )
    .order('created_at', { ascending: false })
  if (activeFilter) query = query.eq('status', activeFilter)
  const { data: complaints } = await query

  // Category names as a lookup; complaint_categories is readable by everyone.
  const { data: categories } = await supabase
    .from('complaint_categories')
    .select('id, name_ne, name_en')
  const categoryName = new Map(
    (categories ?? []).map((c) => [c.id, { ne: c.name_ne, en: c.name_en }])
  )

  const rows = complaints ?? []

  // "All" plus the five statuses, as filter links.
  const filters: { value: string | null; label: string }[] = [
    { value: null, label: 'All' },
    ...COMPLAINT_STATUSES.map((s) => ({
      value: s,
      label: COMPLAINT_STATUS_LABELS[s].en,
    })),
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">
          Complaints · गुनासो
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Newest first. {rows.length} shown
          {activeFilter
            ? ` · filtered by ${COMPLAINT_STATUS_LABELS[activeFilter].en}`
            : ''}
          . Unpublished complaints appear here and still count on the dashboard.
        </p>
      </header>

      {/* Status filter row */}
      <nav className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const isActive =
            (f.value === null && !activeFilter) || f.value === activeFilter
          return (
            <Link
              key={f.label}
              href={f.value ? `/admin/complaints?status=${f.value}` : '/admin/complaints'}
              className={
                isActive
                  ? 'rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white'
                  : 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
              }
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Ticket</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Published</th>
              <th className="px-3 py-2.5">Submitted</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const cat = categoryName.get(c.category_id)
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-900">
                    {c.ticket_id}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block text-slate-900">
                      {cat?.ne ?? '—'}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {cat?.en ?? ''}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {c.withdrawn_at ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        Withdrawn
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_BADGE[c.status]}`}
                      >
                        {COMPLAINT_STATUS_LABELS[c.status].en}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.is_published ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {formatDateTime(c.created_at, 'en')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/complaints/${c.id}`}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  {activeFilter
                    ? 'No complaints with this status.'
                    : 'No complaints yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
