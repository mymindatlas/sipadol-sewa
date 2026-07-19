import type { Metadata } from 'next'
import Link from 'next/link'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { formatDateOnly } from '@/lib/dates'
import { getLang, localized, type Lang } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

// §21 — public programme list. The .eq('is_published', true) states the
// intent; the "programs_select_published" RLS policy is what actually
// excludes drafts, for every caller, regardless of what this page asks for.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'कार्यक्रम' : 'Programmes',
    description:
      lang === 'ne'
        ? 'वडाका कार्यक्रम तथा गतिविधिहरू।'
        : 'Ward programmes and activities.',
    path: '/programs',
  })
}

type ProgramRow = {
  id: number
  title_ne: string
  title_en: string
  description_ne: string
  description_en: string
  banner_public_id: string | null
  start_date: string
  end_date: string | null
  registration_open: boolean
  registration_deadline: string | null
}

/**
 * Today in Kathmandu as 'YYYY-MM-DD'. The programme columns are `date`, so
 * "has it finished?" is a calendar-day question and both sides of the
 * comparison must be calendar days in the SAME place — the ward's. Comparing
 * a Date built on the server (which may be hosted anywhere) against a bare
 * date string would put a programme in the wrong section for the 5h45m the
 * two calendars disagree. ISO 'YYYY-MM-DD' sorts correctly as plain text, so
 * string comparison is the whole of the date maths here.
 */
function todayInKathmandu(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

/** The last day a programme occupies: its end, or its start if it is one day. */
function lastDay(program: ProgramRow): string {
  return program.end_date ?? program.start_date
}

// The badge answers "can I register?", not "is the event over?" — so the
// labels name registration explicitly. `state` is the same answer in a form
// the card can branch on, so the deadline line below cannot drift out of
// agreement with the badge above it.
type Badge = {
  state: 'open' | 'upcoming' | 'closed'
  label: string
  className: string
}

// Mirrors program_is_open() for DISPLAY only (§13). The database function
// remains the enforcement — a badge is never a gate, and the detail page's
// registration will call the real thing.
function registrationBadge(
  program: ProgramRow,
  today: string,
  lang: Lang
): Badge {
  const deadlinePassed =
    program.registration_deadline !== null &&
    program.registration_deadline < today

  if (program.registration_open && !deadlinePassed) {
    return {
      state: 'open',
      label: lang === 'ne' ? 'दर्ता खुला' : 'Registration open',
      className: 'bg-emerald-100 text-emerald-800',
    }
  }
  if (program.start_date > today) {
    return {
      state: 'upcoming',
      label: lang === 'ne' ? 'आगामी' : 'Upcoming',
      className: 'bg-blue-100 text-blue-800',
    }
  }
  return {
    state: 'closed',
    label: lang === 'ne' ? 'दर्ता बन्द' : 'Registration closed',
    className: 'bg-slate-200 text-slate-600',
  }
}

/** Localized dates: start, and "– end" only when the programme spans days. */
function dateRange(program: ProgramRow, lang: Lang): string {
  const start = formatDateOnly(program.start_date, lang)
  if (!program.end_date) return start
  return `${start} – ${formatDateOnly(program.end_date, lang)}`
}

const EXCERPT_LENGTH = 140

function excerpt(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= EXCERPT_LENGTH) return collapsed
  return `${collapsed.slice(0, EXCERPT_LENGTH).trimEnd()}…`
}

export default async function ProgramsPage() {
  const lang = await getLang()
  const today = todayInKathmandu()
  const supabase = await createClient()

  const { data } = await supabase
    .from('programs')
    .select(
      'id, title_ne, title_en, description_ne, description_en, banner_public_id, start_date, end_date, registration_open, registration_deadline'
    )
    .eq('is_published', true)
    .order('start_date', { ascending: false })

  const programs = (data ?? []) as ProgramRow[]

  // §21 — a programme that has not finished yet is still live to a resident,
  // whether it starts tomorrow or is running today. Everything else has
  // passed. The boundary is inclusive: a programme ending TODAY is current.
  // The query's start_date-descending order is right for what has already
  // happened — most recent first — but backwards for what is still to come: a
  // resident wants the next programme at the top, not the furthest-away one.
  // Sorted on the same date the split uses, so section and order agree.
  // filter() returns a fresh array, so sorting it in place cannot disturb
  // `programs` or the completed section.
  const current = programs
    .filter((p) => lastDay(p) >= today)
    .sort((a, b) => {
      const [x, y] = [lastDay(a), lastDay(b)]
      return x < y ? -1 : x > y ? 1 : 0
    })
  const completed = programs.filter((p) => lastDay(p) < today)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {lang === 'ne' ? 'कार्यक्रम' : 'Programmes'}
      </h1>

      {programs.length === 0 ? (
        <p className="text-sm text-slate-500">
          {lang === 'ne'
            ? 'हाल कुनै कार्यक्रम छैन।'
            : 'No programmes at the moment.'}
        </p>
      ) : (
        <>
          {current.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight text-slate-700">
                {lang === 'ne' ? 'चालु तथा आगामी' : 'Active & Upcoming'}
              </h2>
              <ProgramGrid programs={current} today={today} lang={lang} />
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold tracking-tight text-slate-700">
                {lang === 'ne' ? 'भर्खरै सम्पन्न' : 'Recently Completed'}
              </h2>
              <ProgramGrid programs={completed} today={today} lang={lang} />
            </section>
          )}
        </>
      )}
    </div>
  )
}

function ProgramGrid({
  programs,
  today,
  lang,
}: {
  programs: ProgramRow[]
  today: string
  lang: Lang
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => {
        const badge = registrationBadge(program, today, lang)
        const title = localized(program, 'title', lang)

        return (
          <li key={program.id}>
            <Link
              href={`/programs/${program.id}`}
              className="block overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-blue-300"
            >
              {program.banner_public_id ? (
                <CloudinaryImage
                  publicId={program.banner_public_id}
                  alt={title}
                  width={640}
                  className="h-44 w-full bg-slate-100 object-cover"
                />
              ) : (
                // Neutral tile, never a broken image: a programme can be
                // announced before its banner is ready.
                <span
                  aria-hidden
                  className="flex h-44 w-full items-center justify-center bg-slate-100 text-3xl text-slate-300"
                >
                  📅
                </span>
              )}
              <span className="block p-4">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900">{title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {dateRange(program, lang)}
                </span>
                {/* Only while registering is actually possible AND there is a
                    date to act before. An open programme with no deadline
                    takes signups until it starts, so there is nothing to
                    announce; a closed or finished one would just be noise. */}
                {badge.state === 'open' && program.registration_deadline && (
                  <span className="mt-1 block text-sm font-medium text-emerald-700">
                    {lang === 'ne'
                      ? `दर्ता अन्तिम मिति: ${formatDateOnly(program.registration_deadline, lang)}`
                      : `Register by: ${formatDateOnly(program.registration_deadline, lang)}`}
                  </span>
                )}
                <span className="mt-2 block text-sm text-slate-600">
                  {excerpt(localized(program, 'description', lang))}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
