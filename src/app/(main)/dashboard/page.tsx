import type { Metadata } from 'next'
import Link from 'next/link'

import {
  COMPLAINT_STATUSES,
  COMPLAINT_STATUS_BADGE,
  COMPLAINT_STATUS_LABELS,
} from '@/lib/complaints'
import { getLang, type Lang } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

// §28/§29, Decision 9 — the public accountability dashboard. This is the page
// that makes the ward answerable: it must show ALL complaints from the moment
// they are submitted, never only the published ones, so review cannot become
// suppression. It reads NUMBERS, never rows — complaint_stats() (0014) and
// registration_count() (0015) are SECURITY DEFINER aggregates that hand the
// public counts without exposing a single private complaint or registration.
// Everything else (programmes, notices) is public-readable content, counted
// with head:true so no rows cross the wire.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'जवाफदेहिता' : 'Accountability',
    description:
      lang === 'ne'
        ? 'वडाको कार्यसम्पादन र गुनासो समाधानको सार्वजनिक विवरण।'
        : "Public record of the ward's performance and complaint resolution.",
    path: '/dashboard',
  })
}

// The map's field names match complaint_stats()'s return columns exactly, so a
// status added to the enum is a one-line change here, not a hunt through JSX.
type StatKey = (typeof COMPLAINT_STATUSES)[number]

// One trust point on the explainer panel, authored in both languages (§29).
type TrustPoint = { ne: string; en: string }

const TRUST_POINTS: TrustPoint[] = [
  {
    ne: 'हरेक गुनासो पेश भएको क्षणदेखि नै गनिन्छ — प्रकाशित भएपछि होइन। वडाले कुनै गुनासो लुकाएर तथ्याङ्क परिवर्तन गर्न सक्दैन।',
    en: 'Every complaint is counted from the moment it is submitted — not only after it is published. The ward cannot change these numbers by hiding a complaint.',
  },
  {
    ne: '"समाधान भयो" भनेको समस्या साँच्चै समाधान भएको हो। "बन्द" भनेको समाधान नभई टुंगिएको (जस्तै दोहोरो वा वडाको अधिकारक्षेत्र बाहिरको) हो — यो समाधान दरमा गनिँदैन।',
    en: '"Resolved" means the problem was genuinely fixed. "Closed" means it ended without a fix (e.g. a duplicate, or outside the ward\'s authority) — it does NOT count toward the resolution rate.',
  },
  {
    ne: 'हरेक गुनासोको स्थिति परिवर्तनको स्थायी अभिलेख राखिन्छ, जुन मेटाउन वा बदल्न सकिँदैन।',
    en: 'Every status change is kept as a permanent record that cannot be edited or deleted.',
  },
  {
    ne: 'गुनासो फिर्ता लिने अधिकार वडा अध्यक्षसँग मात्र छ, र त्यसको कारणसहित अभिलेख राखिन्छ।',
    en: "Only the ward chairperson can withdraw a complaint, and it is recorded with a reason.",
  },
  {
    ne: 'सार्वजनिक गुनासो ट्र्याकरमा कसैको नाम, फोन वा तस्बिर देखिँदैन।',
    en: "No one's name, phone, or photo ever appears on the public complaint tracker.",
  },
]

export default async function DashboardPage() {
  const lang = await getLang()
  const supabase = await createClient()

  // One round-trip. Two SECURITY DEFINER aggregates (numbers only, safe for
  // anon) and two head:true counts over public-readable content.
  const [statsRes, regRes, programmesRes, noticesRes] = await Promise.all([
    supabase.rpc('complaint_stats'),
    supabase.rpc('registration_count'),
    supabase
      .from('programs')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase
      .from('notices')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true),
  ])

  // complaint_stats() returns one aggregate row; with no complaints yet it is
  // an empty array. Every field defaults to 0 so the page never renders NaN.
  const row = statsRes.data?.[0]
  const stats = {
    total: row?.total ?? 0,
    withdrawn: row?.withdrawn ?? 0,
    active_total: row?.active_total ?? 0,
    received: row?.received ?? 0,
    in_progress: row?.in_progress ?? 0,
    action_required: row?.action_required ?? 0,
    resolved: row?.resolved ?? 0,
    closed: row?.closed ?? 0,
    resolved_pct: row?.resolved_pct ?? 0,
  }

  const registrations = regRes.data ?? 0
  const programmesHeld = programmesRes.count ?? 0
  const noticesPublished = noticesRes.count ?? 0

  const hasComplaints = stats.total > 0

  return (
    <div className="space-y-10">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'जवाफदेहिता' : 'Accountability'}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          {lang === 'ne'
            ? 'वडाको कार्यसम्पादन र गुनासो समाधानको सार्वजनिक विवरण। यी तथ्याङ्क कसैको खातासँग बाँधिएका छैनन् — जो कोहीले हेर्न सक्छन्।'
            : "A public record of the ward's performance and complaint resolution. These numbers belong to no account — anyone can read them."}
        </p>
      </header>

      {/* ── Section 1 · Complaint accountability (the centerpiece) ──── */}
      <section className="space-y-5">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'गुनासो जवाफदेहिता' : 'Complaint Accountability'}
        </h2>

        {hasComplaints ? (
          <>
            {/* Resolution rate — the hero stat. The ring is decorative
                (aria-hidden); the percentage beside it is real text, so a
                screen reader and a copy-paste both get the number. */}
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:gap-8 sm:p-8">
              <ResolutionRing pct={stats.resolved_pct} lang={lang} />
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {lang === 'ne' ? 'समाधान दर' : 'Resolution rate'}
                </p>
                <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-slate-900 sm:text-6xl">
                  {stats.resolved_pct}
                  <span className="text-3xl text-slate-400 sm:text-4xl">%</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {lang === 'ne'
                    ? `${stats.active_total} मध्ये ${stats.resolved} गुनासो समाधान`
                    : `${stats.resolved} of ${stats.active_total} complaints resolved`}
                </p>
              </div>
            </div>

            {/* Status breakdown — one card per status, accented with the same
                badge colours used on the tracker and admin list. */}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {COMPLAINT_STATUSES.map((status) => (
                <li
                  key={status}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${COMPLAINT_STATUS_BADGE[status]}`}
                  >
                    {COMPLAINT_STATUS_LABELS[status][lang]}
                  </span>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats[status as StatKey]}
                  </p>
                </li>
              ))}
            </ul>

            {/* Totals line — withdrawn complaints are shown, never hidden, so
                withdrawal cannot be used as a quiet delete (Decision 10). */}
            <p className="text-sm text-slate-500">
              {lang === 'ne'
                ? `कुल ${stats.total} — ${stats.withdrawn} फिर्ता लिइएको`
                : `${stats.total} total — ${stats.withdrawn} withdrawn`}
            </p>
          </>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {lang === 'ne' ? 'हाल कुनै गुनासो छैन।' : 'No complaints yet.'}
          </p>
        )}
      </section>

      {/* ── Section 2 · Ward activity ──────────────────────────────── */}
      {/* A different accent (indigo) from Section 1 so the two sections read as
          distinct: this one shows the ward acting, not just responding. */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'वडा गतिविधि' : 'Ward Activity'}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ActivityCard
            icon="📅"
            count={programmesHeld}
            label={lang === 'ne' ? 'आयोजित कार्यक्रम' : 'Programmes held'}
          />
          <ActivityCard
            icon="🧑‍🤝‍🧑"
            count={registrations}
            label={lang === 'ne' ? 'कुल दर्ता' : 'Total registrations'}
          />
          <ActivityCard
            icon="📢"
            count={noticesPublished}
            label={lang === 'ne' ? 'प्रकाशित सूचना' : 'Notices published'}
          />
        </ul>
      </section>

      {/* ── Section 3 · How this works (the explainer) ─────────────── */}
      {/* Set apart in a tinted panel: this is where the numbers earn their
          trust, by explaining the rules that keep them honest (§29). */}
      <section>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {lang === 'ne'
              ? 'यी तथ्याङ्क कसरी बनाइन्छन्'
              : 'How these numbers work'}
          </h2>
          <ol className="mt-4 space-y-3">
            {TRUST_POINTS.map((point, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white"
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-700">
                  {point[lang]}
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/complaints/tracker"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            {lang === 'ne' ? 'सबै गुनासो हेर्नुहोस्' : 'View all complaints'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

// Pure-SVG progress ring — no chart library. The arc length is set from the
// percentage; the number is rendered as real text by the caller, so this
// graphic is purely decorative and marked aria-hidden.
function ResolutionRing({ pct, lang }: { pct: number; lang: Lang }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className="relative h-36 w-36 shrink-0"
      role="img"
      aria-label={
        lang === 'ne'
          ? `समाधान दर ${clamped} प्रतिशत`
          : `Resolution rate ${clamped} percent`
      }
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-200"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-700"
        />
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-900"
      >
        {clamped}%
      </span>
    </div>
  )
}

function ActivityCard({
  icon,
  count,
  label,
}: {
  icon: string
  count: number
  label: string
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-700"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-slate-900">
          {count}
        </span>
        <span className="mt-1 block text-sm leading-snug text-slate-600">
          {label}
        </span>
      </span>
    </li>
  )
}
