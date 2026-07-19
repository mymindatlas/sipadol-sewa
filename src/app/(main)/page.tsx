import type { Metadata } from 'next'
import Link from 'next/link'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { formatDate, todayInKathmandu } from '@/lib/dates'
import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { dateRange, lastDay, registrationBadge } from '@/lib/programs'
import { createClient } from '@/lib/supabase/server'

import { EmergencyContacts } from './emergency-contacts'

// §11 — the ward's front door. This page AUTHORS nothing: every section is a
// window onto a list that already has its own page, using that page's query
// shape so the two can never disagree about what is published. Each query is
// filtered by RLS exactly as it is there — the .eq() calls state intent, the
// policies enforce it.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title:
      lang === 'ne'
        ? 'वडा नं. ८, सूर्यविनायक नगरपालिका'
        : 'Ward No. 8, Suryabinayak Municipality',
    description:
      lang === 'ne'
        ? 'सूचना, सेवा, गुनासो र कार्यक्रम — वडा नं. ८, सूर्यविनायक नगरपालिकाको आधिकारिक पोर्टल।'
        : 'Notices, services, complaints, and programmes — the official portal of Ward No. 8, Suryabinayak Municipality.',
    path: '/',
  })
}

const NOTICE_LIMIT = 3
const PROGRAM_LIMIT = 3
const REPRESENTATIVE_LIMIT = 3

type ProgramRow = {
  id: number
  title_ne: string
  title_en: string
  banner_public_id: string | null
  start_date: string
  end_date: string | null
  registration_open: boolean
  registration_deadline: string | null
}

// Only the icon chip carries the accent. Eight fully tinted cards would read
// as decoration competing for attention; a ward portal wants a resident to
// find the one thing they came for, so the colour is a landmark, not a mood.
const ACCENT_CHIP = {
  blue: 'bg-blue-50 text-blue-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-emerald-50 text-emerald-700',
  purple: 'bg-purple-50 text-purple-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
} as const

type NavCard = {
  href: string
  icon: string
  label_ne: string
  label_en: string
  hint_ne: string
  hint_en: string
  accent: keyof typeof ACCENT_CHIP
}

// §11 — the nav hub. Every destination the ward offers, in one grid: the front
// page IS the navigation rather than a preview of it.
const NAV_CARDS: NavCard[] = [
  {
    href: '/notices',
    icon: '📢',
    label_ne: 'सूचना',
    label_en: 'Notices',
    hint_ne: 'वडाका सूचना',
    hint_en: 'Ward announcements',
    accent: 'blue',
  },
  {
    href: '/programs',
    icon: '📅',
    label_ne: 'कार्यक्रम',
    label_en: 'Programmes',
    hint_ne: 'कार्यक्रम र दर्ता',
    hint_en: 'Events & registration',
    accent: 'indigo',
  },
  {
    href: '/forms',
    icon: '📝',
    label_ne: 'सेवा',
    label_en: 'Services',
    hint_ne: 'सेवाका लागि आवेदन',
    hint_en: 'Apply for ward services',
    accent: 'teal',
  },
  {
    href: '/complaints/tracker',
    icon: '📬',
    label_ne: 'गुनासो',
    label_en: 'Complaints',
    hint_ne: 'समस्या दर्ता गर्नुहोस्',
    hint_en: 'Report an issue',
    accent: 'amber',
  },
  {
    href: '/dashboard',
    icon: '📊',
    label_ne: 'जवाफदेहिता',
    label_en: 'Accountability',
    hint_ne: 'प्रगति हेर्नुहोस्',
    hint_en: 'Track resolutions',
    accent: 'green',
  },
  {
    href: '/gallery',
    icon: '🖼️',
    label_ne: 'ग्यालरी',
    label_en: 'Gallery',
    hint_ne: 'वडाका तस्बिर',
    hint_en: 'Ward photos',
    accent: 'purple',
  },
  {
    href: '/representatives',
    icon: '👥',
    label_ne: 'जनप्रतिनिधि',
    label_en: 'Representatives',
    hint_ne: 'वडा पदाधिकारी',
    hint_en: 'Ward officials',
    accent: 'rose',
  },
  {
    href: '/about',
    icon: 'ℹ️',
    label_ne: 'बारेमा र सम्पर्क',
    label_en: 'About & Contact',
    hint_ne: 'वडाको जानकारी र सम्पर्क',
    hint_en: 'Ward info & contact',
    accent: 'slate',
  },
]

function SectionHeading({
  title,
  href,
  seeAll,
}: {
  title: string
  href?: string
  seeAll?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      {href && seeAll && (
        <Link
          href={href}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          {seeAll} →
        </Link>
      )}
    </div>
  )
}

export default async function HomePage() {
  const lang = await getLang()
  const supabase = await createClient()
  const today = todayInKathmandu()

  const seeAll = lang === 'ne' ? 'सबै हेर्नुहोस्' : 'See all'

  // One round-trip's worth of latency instead of three sequential ones.
  const [noticesResult, programsResult, representativesResult] =
    await Promise.all([
      supabase
        .from('notices')
        .select(
          'id, title_ne, title_en, published_at, category_id, notice_categories(name_ne, name_en)'
        )
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(NOTICE_LIMIT),
      supabase
        .from('programs')
        .select(
          'id, title_ne, title_en, banner_public_id, start_date, end_date, registration_open, registration_deadline'
        )
        .eq('is_published', true)
        .order('start_date', { ascending: false }),
      supabase
        .from('representatives')
        .select('id, full_name_ne, full_name_en, role_ne, role_en, photo_public_id')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(REPRESENTATIVE_LIMIT),
    ])

  const notices = noticesResult.data ?? []
  const representatives = representativesResult.data ?? []

  // Same split as /programs: anything not yet finished is still live to a
  // resident. Soonest first here — a front page answers "what is next?", so
  // the LIMIT is applied after sorting, not by the database.
  const programs = ((programsResult.data ?? []) as ProgramRow[])
    .filter((program) => lastDay(program) >= today)
    .sort((a, b) => {
      const [x, y] = [lastDay(a), lastDay(b)]
      return x < y ? -1 : x > y ? 1 : 0
    })
    .slice(0, PROGRAM_LIMIT)

  return (
    <div className="space-y-10">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl bg-gradient-to-br from-blue-800 to-blue-900 px-5 py-5 text-white sm:px-7 sm:py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
            {lang === 'ne'
              ? 'सूर्यविनायक नगरपालिका'
              : 'Suryabinayak Municipality'}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {lang === 'ne'
              ? 'वडा नं. ८ — सिपाडोल'
              : 'Ward No. 8 — Sipadol'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            {lang === 'ne'
              ? 'तपाईंको वडाको आधिकारिक पोर्टलमा स्वागत छ। तलका सेवाहरूमध्ये छान्नुहोस् — सूचना पढ्न, कार्यक्रममा सहभागी हुन, ग्यालरी हेर्न वा जनप्रतिनिधिसम्म पुग्न। वडा नं. ८ का सबै सेवा एकै ठाउँमा।'
              : 'Welcome to your ward’s official portal. Choose a service below to read notices, join programmes, view the gallery, or reach your representatives — everything Ward No. 8 offers, in one place.'}
          </p>
        </div>
      </section>

      {/* ── Nav hub ────────────────────────────────────────────────── */}
      {/* No heading: this block is the navigation, not a preview of a list
          that lives elsewhere, so a "See all" would point at itself. */}
      <section>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {NAV_CARDS.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${ACCENT_CHIP[card.accent]}`}
                  >
                    {card.icon}
                  </span>
                  <span className="min-w-0 font-semibold leading-tight text-slate-900">
                    {lang === 'ne' ? card.label_ne : card.label_en}
                  </span>
                </span>
                <span className="mt-2 block text-xs leading-snug text-slate-500">
                  {lang === 'ne' ? card.hint_ne : card.hint_en}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Latest notices ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading
          title={lang === 'ne' ? 'पछिल्ला सूचना' : 'Latest Notices'}
          href="/notices"
          seeAll={seeAll}
        />

        {notices.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {lang === 'ne'
              ? 'हाल कुनै सूचना छैन।'
              : 'No notices at the moment.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className="block px-4 py-3 transition hover:bg-slate-50"
                >
                  <p className="font-medium leading-snug text-slate-900">
                    {localized(notice, 'title', lang)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {notice.notice_categories && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-800">
                        {localized(notice.notice_categories, 'name', lang)}
                      </span>
                    )}
                    {notice.published_at && (
                      <span>{formatDate(notice.published_at, lang)}</span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Current programmes ─────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading
          title={lang === 'ne' ? 'चालु कार्यक्रम' : 'Current Programmes'}
          href="/programs"
          seeAll={seeAll}
        />

        {programs.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {lang === 'ne'
              ? 'हाल कुनै कार्यक्रम छैन।'
              : 'No programmes at the moment.'}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {programs.map((program) => {
              const badge = registrationBadge(program, today, lang)
              const title = localized(program, 'title', lang)

              return (
                <li key={program.id}>
                  <Link
                    href={`/programs/${program.id}`}
                    className="block h-full overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300"
                  >
                    {program.banner_public_id ? (
                      <CloudinaryImage
                        publicId={program.banner_public_id}
                        alt={title}
                        width={640}
                        className="h-32 w-full bg-slate-100 object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-32 w-full items-center justify-center bg-slate-100 text-3xl text-slate-300"
                      >
                        📅
                      </span>
                    )}
                    <span className="block p-4">
                      <span className="block font-semibold leading-snug text-slate-900">
                        {title}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {dateRange(program, lang)}
                      </span>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Accountability (placeholder) ───────────────────────────── */}
      {/* Decision 9 / §11 — the resolution rate is the point of this system,
          so the section is reserved here rather than added later as an
          afterthought. No link while there is nothing behind it. */}
      <section className="space-y-3">
        <SectionHeading
          title={lang === 'ne' ? 'जवाफदेहिता' : 'Accountability'}
        />
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {lang === 'ne'
            ? 'गुनासो समाधानका तथ्याङ्क यहाँ चाँडै देखिनेछन्।'
            : 'Complaint resolution statistics will appear here soon.'}
        </p>
      </section>

      {/* ── Representatives preview ────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading
          title={lang === 'ne' ? 'जनप्रतिनिधि' : 'Your Representatives'}
          href="/representatives"
          seeAll={seeAll}
        />

        {representatives.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {lang === 'ne'
              ? 'हाल कुनै विवरण उपलब्ध छैन।'
              : 'No representatives listed at the moment.'}
          </p>
        ) : (
          // No bios here (§11) — the full profile lives on /representatives.
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {representatives.map((rep) => {
              const name = localized(rep, 'full_name', lang)
              const role = localized(rep, 'role', lang)

              return (
                <li
                  key={rep.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  {rep.photo_public_id ? (
                    <CloudinaryImage
                      publicId={rep.photo_public_id}
                      alt={name}
                      width={128}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400"
                    >
                      {name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-slate-900">
                      {name}
                    </p>
                    <p className="text-sm text-blue-800">{role}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Emergency contacts ─────────────────────────────────────── */}
      {/* Last on the page and headed more quietly than the sections above:
          this is reference material a resident scans for, not something the
          front page should lead with. The card treatment inside is
          EmergencyContacts' own and is untouched — the numbers still carry
          their own visual weight where it matters. */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-slate-600">
          {lang === 'ne' ? 'आपतकालीन सम्पर्क' : 'Emergency Contacts'}
        </h2>
        <EmergencyContacts lang={lang} />
      </section>
    </div>
  )
}
