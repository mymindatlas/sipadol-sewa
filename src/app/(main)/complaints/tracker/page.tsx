import type { Metadata } from 'next'
import Link from 'next/link'

import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_BADGE,
  COMPLAINT_STATUS_LABELS,
  isComplaintStatus,
  type ComplaintStatus,
} from '@/lib/complaints'
import { formatDateTime } from '@/lib/dates'
import { getLang, type Lang } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

// §28 — the PUBLIC complaint tracker. This is the page that proves the
// anonymity design: it reads ONLY the complaints_public view, which by
// construction exposes no submitter identity, no photo, and no staff note —
// just the ticket, category, description, location, status, and submitted
// time of complaints staff have already published (Decision 9). There is
// nothing private here to accidentally leak: the view cannot return it.
//
// NEVER read from the `complaints` base table on this page. anon has no SELECT
// on it (§9.3); the view is the only public window, and keeping it that way is
// the guarantee this page exists to demonstrate.

// The columns the view exposes — see database.ts (Views.complaints_public).
// Every field is nullable at the type level; the render paths guard for it.
type PublicComplaint = {
  ticket_id: string | null
  category_name_ne: string | null
  category_name_en: string | null
  description: string | null
  location_text: string | null
  status: ComplaintStatus | null
  created_at: string | null
}

// The columns are selected in one place so the lookup and the list can never
// drift apart on what they ask the view for.
const VIEW_COLUMNS =
  'ticket_id, category_name_ne, category_name_en, description, location_text, status, created_at'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'गुनासो ट्र्याकर' : 'Complaint Tracker',
    description:
      lang === 'ne'
        ? 'वडामा दर्ता भएका सार्वजनिक गुनासा र तिनको अवस्था।'
        : 'Public complaints filed in the ward and their status.',
    path: '/complaints/tracker',
  })
}

export default async function ComplaintTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; status?: string }>
}) {
  const [{ ticket: ticketParam, status: statusParam }, lang, supabase] =
    await Promise.all([searchParams, getLang(), createClient()])

  // Normalise the looked-up ticket: tickets are issued upper-case
  // (COMP-2026-00042), so a resident who types it lower-case still matches.
  const ticketQuery = ticketParam?.trim().toUpperCase() ?? ''

  // Only the five real statuses are valid filters; anything else is treated as
  // "All" rather than silently returning nothing.
  const activeFilter =
    statusParam && isComplaintStatus(statusParam) ? statusParam : null

  // The ticket lookup and the list are independent reads of the same view. The
  // lookup runs only when a ticket was actually typed.
  let listQuery = supabase
    .from('complaints_public')
    .select(VIEW_COLUMNS)
    .order('created_at', { ascending: false })
  if (activeFilter) listQuery = listQuery.eq('status', activeFilter)

  const [lookupRes, listRes] = await Promise.all([
    ticketQuery
      ? supabase
          .from('complaints_public')
          .select(VIEW_COLUMNS)
          .eq('ticket_id', ticketQuery)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    listQuery,
  ])

  const lookupResult = (lookupRes.data as PublicComplaint | null) ?? null
  const complaints = (listRes.data as PublicComplaint[] | null) ?? []

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'गुनासो ट्र्याकर' : 'Complaint Tracker'}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          {lang === 'ne'
            ? 'यहाँ वडाका बासिन्दाले दर्ता गरेका र वडाले प्रकाशित गरेका गुनासाहरू देखिन्छन्। यस पृष्ठमा कसैको नाम वा तस्बिर कहिल्यै देखाइँदैन।'
            : 'These are complaints ward residents have filed and the ward has published. Names and photos are never shown on this page.'}
        </p>
      </header>

      {/* ── Part A · Ticket lookup ──────────────────────────────────── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {lang === 'ne' ? 'आफ्नो गुनासो खोज्नुहोस्' : 'Look up your complaint'}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            {lang === 'ne'
              ? 'गुनासो दर्ता गर्दा प्राप्त सन्दर्भ नम्बर हालेर यसको अवस्था हेर्नुहोस्।'
              : 'Enter the reference number you received when you filed your complaint to see its status.'}
          </p>
        </div>

        {/* A plain GET form: the ticket lands in a server-readable ?ticket=
            search param, so the whole page stays a server component with no
            client JS. The status filter is preserved so a lookup does not wipe
            an active filter below. */}
        <form method="get" action="/complaints/tracker" className="flex flex-col gap-2 sm:flex-row">
          {activeFilter && (
            <input type="hidden" name="status" value={activeFilter} />
          )}
          <label htmlFor="ticket" className="sr-only">
            {lang === 'ne' ? 'सन्दर्भ नम्बर' : 'Reference number'}
          </label>
          <input
            id="ticket"
            name="ticket"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            defaultValue={ticketParam ?? ''}
            placeholder="COMP-2026-00042"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            {lang === 'ne' ? 'खोज्नुहोस्' : 'Look up'}
          </button>
        </form>

        {/* Result appears only after a lookup was actually submitted. */}
        {ticketQuery &&
          (lookupResult ? (
            <ComplaintCard complaint={lookupResult} lang={lang} highlight />
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              {lang === 'ne'
                ? 'त्यो नम्बरको सार्वजनिक गुनासो फेला परेन। (गुनासो वडा कर्मचारीले प्रकाशित गरेपछि मात्र यहाँ देखिन्छ।)'
                : 'No public complaint found with that number. (Note: a complaint appears here only after ward staff publish it.)'}
            </p>
          ))}
      </section>

      {/* ── Part B · Public list ────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'सार्वजनिक गुनासाहरू' : 'Public complaints'}
        </h2>

        {/* Status filter row: "All" plus the five statuses. isComplaintStatus
            validated the incoming param above. */}
        <nav
          className="flex flex-wrap gap-1.5"
          aria-label={lang === 'ne' ? 'अवस्थाअनुसार छान्नुहोस्' : 'Filter by status'}
        >
          <FilterLink
            href="/complaints/tracker"
            active={!activeFilter}
            label={lang === 'ne' ? 'सबै' : 'All'}
          />
          {COMPLAINT_STATUSES.map((status) => (
            <FilterLink
              key={status}
              href={`/complaints/tracker?status=${status}`}
              active={activeFilter === status}
              label={COMPLAINT_STATUS_LABELS[status][lang]}
            />
          ))}
        </nav>

        {complaints.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {lang === 'ne'
              ? 'हाल कुनै सार्वजनिक गुनासो छैन।'
              : 'No public complaints yet.'}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {complaints.map((complaint) => (
              <li key={complaint.ticket_id}>
                <ComplaintCard complaint={complaint} lang={lang} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white'
          : 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
      }
    >
      {label}
    </Link>
  )
}

// One card, shared by the lookup result (highlight) and the list. Everything it
// renders comes from the view, so there is nothing identifying to guard against
// — the guarantee is upstream, in what the view can return.
function ComplaintCard({
  complaint,
  lang,
  highlight = false,
}: {
  complaint: PublicComplaint
  lang: Lang
  highlight?: boolean
}) {
  const category =
    (lang === 'ne' ? complaint.category_name_ne : complaint.category_name_en) ??
    complaint.category_name_ne ??
    complaint.category_name_en ??
    ''

  return (
    <article
      className={
        highlight
          ? 'space-y-3 rounded-xl border-2 border-blue-300 bg-blue-50/50 p-4 ring-1 ring-blue-100'
          : 'flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {complaint.category_name_ne && (
            <h3 className="font-semibold text-slate-900">{category}</h3>
          )}
          {complaint.ticket_id && (
            <p className="font-mono text-xs text-slate-500">
              {complaint.ticket_id}
            </p>
          )}
        </div>
        {complaint.status && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_BADGE[complaint.status]}`}
          >
            {COMPLAINT_STATUS_LABELS[complaint.status][lang]}
          </span>
        )}
      </div>

      <dl className="space-y-1 text-sm text-slate-600">
        {complaint.location_text && (
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-slate-500">
              {lang === 'ne' ? 'स्थान:' : 'Location:'}
            </dt>
            <dd className="min-w-0">{complaint.location_text}</dd>
          </div>
        )}
        {complaint.created_at && (
          <div className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-slate-500">
              {lang === 'ne' ? 'दर्ता मिति:' : 'Submitted:'}
            </dt>
            <dd className="min-w-0">
              {formatDateTime(complaint.created_at, lang)}
            </dd>
          </div>
        )}
      </dl>

      {complaint.description && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {complaint.description}
        </p>
      )}
    </article>
  )
}
