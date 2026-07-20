import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_BADGE,
  COMPLAINT_STATUS_LABELS,
} from '@/lib/complaints'
import { formatDateTime } from '@/lib/dates'
import { getCurrentRole } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'

import {
  toggleComplaintPublished,
  updateComplaintStatus,
  updateStaffNote,
} from '../actions'
import { WithdrawForm } from './withdraw-form'

// §34 — the complaint detail + management page. Staff see EVERYTHING the public
// tracker hides: submitter identity, photo, staff note. That is a role
// privilege, enforced by RLS (complaints_select_staff), not by this page.
// NOTE ON IDENTITY: profiles' SELECT policies (0004) allow own-row or ADMIN
// only — there is no ward_secretary read. So the submitter's name/phone resolve
// for an Admin and come back empty for a Ward Secretary. We render that
// honestly rather than pretend; the emptiness IS the policy, working.

export default async function AdminComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const complaintId = Number(id)
  if (!Number.isInteger(complaintId)) notFound()

  const supabase = await createClient()
  const role = await getCurrentRole()

  const { data: complaint } = await supabase
    .from('complaints')
    .select(
      'id, ticket_id, user_id, category_id, description, location_text, photo_file, status, staff_note, is_published, withdrawn_at, withdrawn_by, withdrawal_reason, created_at, updated_at'
    )
    .eq('id', complaintId)
    .maybeSingle()

  if (!complaint) notFound()

  const { data: category } = await supabase
    .from('complaint_categories')
    .select('name_ne, name_en')
    .eq('id', complaint.category_id)
    .maybeSingle()

  // Submitter identity — resolves for Admin (profiles_select_admin), empty for
  // a Ward Secretary. Read separately rather than embedded so the RLS outcome
  // is explicit.
  const { data: submitter } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', complaint.user_id)
    .maybeSingle()

  // The append-only history — the accountability centrepiece (Decision 10).
  const { data: events } = await supabase
    .from('complaint_status_events')
    .select('id, status, changed_by, note, created_at')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true })

  // Resolve actor names where allowed (Admin only). Empty map for a Secretary.
  const actorIds = Array.from(
    new Set((events ?? []).map((e) => e.changed_by).filter((v): v is string => !!v))
  )
  const { data: actors } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [] }
  const actorName = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name])
  )

  const isWithdrawn = complaint.withdrawn_at !== null

  return (
    <div className="space-y-6">
      <Link
        href="/admin/complaints"
        className="inline-block text-sm font-medium text-slate-600 hover:text-blue-800 hover:underline"
      >
        ← Back to complaints
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900">
            {complaint.ticket_id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {category?.name_ne ?? '—'} · {category?.name_en ?? ''}
          </p>
        </div>
        {isWithdrawn ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            Withdrawn
          </span>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${COMPLAINT_STATUS_BADGE[complaint.status]}`}
          >
            {COMPLAINT_STATUS_LABELS[complaint.status].en}
          </span>
        )}
      </header>

      {/* ── The complaint as filed ─────────────────────────────────────── */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Complaint
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </dt>
            <dd className="whitespace-pre-line text-slate-900">
              {complaint.description}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Location
            </dt>
            <dd className="text-slate-900">{complaint.location_text}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Photo
            </dt>
            <dd className="text-slate-900">
              {complaint.photo_file ? (
                // TODO: render the private photo once sign-view delivery is
                // wired (§10.3). Private delivery isn't built, so we only note
                // its presence here — never a raw Cloudinary URL.
                <span className="text-slate-600">
                  📎 Photo attached (private — viewer not yet available)
                </span>
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Submitted
            </dt>
            <dd className="text-slate-900">
              {formatDateTime(complaint.created_at, 'en')}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Submitter (staff-only; Admin sees identity, Secretary does not) ─ */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Submitter
        </h2>
        {submitter ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </dt>
              <dd className="text-slate-900">{submitter.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Phone
              </dt>
              <dd className="text-slate-900">{submitter.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </dt>
              <dd className="text-slate-900">{submitter.email}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            Submitter identity is visible to Admins only (§3.1). Your role cannot
            read it.
          </p>
        )}
      </section>

      {/* ── Status history — append-only timeline ──────────────────────── */}
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Status history
        </h2>
        <ol className="space-y-3">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <span
                aria-hidden
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
              />
              <div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_BADGE[e.status]}`}
                >
                  {COMPLAINT_STATUS_LABELS[e.status].en}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(e.created_at, 'en')}
                  {e.changed_by
                    ? ` · ${actorName.get(e.changed_by) ?? 'staff'}`
                    : ''}
                </p>
                {e.note ? (
                  <p className="mt-1 whitespace-pre-line text-slate-700">
                    {e.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {(events ?? []).length === 0 && (
            <li className="text-sm text-slate-500">No history yet.</li>
          )}
        </ol>
      </section>

      {isWithdrawn ? (
        // Already withdrawn — the control is gone for everyone; the record of
        // what happened is shown instead. A withdrawal is permanent (0012).
        <section className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">
            Withdrawn
          </h2>
          <p className="text-sm text-red-800">
            {formatDateTime(complaint.withdrawn_at as string, 'en')}
            {complaint.withdrawn_by
              ? ` · by ${actorName.get(complaint.withdrawn_by) ?? 'Admin'}`
              : ''}
          </p>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-red-700">
              Reason
            </dt>
            <dd className="whitespace-pre-line text-sm text-red-900">
              {complaint.withdrawal_reason}
            </dd>
          </div>
        </section>
      ) : (
        // ── Management controls ───────────────────────────────────────────
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Manage
          </h2>

          {/* Status */}
          <form action={updateComplaintStatus} className="space-y-2">
            <input type="hidden" name="id" value={complaint.id} />
            <label
              htmlFor="status"
              className="block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                id="status"
                name="status"
                defaultValue={complaint.status}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                {COMPLAINT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {COMPLAINT_STATUS_LABELS[s].en}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Update status
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Each change is recorded permanently in the status history above.
            </p>
          </form>

          {/* Staff note */}
          <form action={updateStaffNote} className="space-y-2">
            <input type="hidden" name="id" value={complaint.id} />
            <label
              htmlFor="staff_note"
              className="block text-sm font-medium text-slate-700"
            >
              Note to the resident{' '}
              <span className="font-normal text-slate-500">
                (visible on their My Complaints — NOT public)
              </span>
            </label>
            <textarea
              id="staff_note"
              name="staff_note"
              rows={3}
              defaultValue={complaint.staff_note ?? ''}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Save note
            </button>
          </form>

          {/* Publish toggle */}
          <form action={toggleComplaintPublished} className="space-y-2">
            <input type="hidden" name="id" value={complaint.id} />
            <p className="text-sm text-slate-700">
              {complaint.is_published
                ? 'This complaint is published — its anonymised summary is on the public tracker.'
                : 'This complaint is not published. Publish to show its anonymised summary on the public tracker (name and photo never appear there).'}
            </p>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {complaint.is_published ? 'Unpublish' : 'Publish'}
            </button>
          </form>

          {/* Withdraw — Admin only. RLS/trigger enforce it regardless; the UI
              simply doesn't offer the control to a Ward Secretary. */}
          {role === 'admin' && (
            <div className="space-y-2 border-t border-red-100 pt-4">
              <p className="text-sm font-medium text-red-700">
                Withdraw complaint (Admin)
              </p>
              <p className="text-xs text-slate-500">
                Withdrawal removes the complaint from the public record. It is{' '}
                <strong>permanent, cannot be reversed</strong>, and is recorded
                with your identity and the reason you give.
              </p>
              <WithdrawForm complaintId={complaint.id} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}
