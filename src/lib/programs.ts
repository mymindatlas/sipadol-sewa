import { formatDateOnly } from '@/lib/dates'
import type { Lang } from '@/lib/i18n'

// Programme display rules, in ONE place (§13). These were previously copied
// into both /programs and the homepage, which put the "is registration open?"
// question in three places counting the database — exactly the drift
// program_is_open() exists to prevent. The SQL function remains the
// enforcement; everything here is display, and now says the same thing
// wherever it is shown.

/**
 * The fields these rules read. Structural, not the full row: every caller
 * selects a different set of columns for its own cards, and none of them
 * should have to widen that select to satisfy a shared helper.
 */
export type ProgramDates = {
  start_date: string
  end_date: string | null
  registration_open: boolean
  registration_deadline: string | null
}

export type ProgramBadge = {
  state: 'open' | 'upcoming' | 'closed'
  label: string
  className: string
}

/** The last day a programme occupies: its end, or its start if it is one day. */
export function lastDay(program: ProgramDates): string {
  return program.end_date ?? program.start_date
}

/** Localized dates: start, and "– end" only when the programme spans days. */
export function dateRange(program: ProgramDates, lang: Lang): string {
  const start = formatDateOnly(program.start_date, lang)
  if (!program.end_date) return start
  return `${start} – ${formatDateOnly(program.end_date, lang)}`
}

// The badge answers "can I register?", not "is the event over?" — so the
// labels name registration explicitly. `state` is the same answer in a form a
// card can branch on, so a deadline line rendered beneath the badge cannot
// drift out of agreement with it.
//
// Mirrors program_is_open() for DISPLAY only. The database function remains
// the enforcement — a badge is never a gate.
export function registrationBadge(
  program: ProgramDates,
  today: string,
  lang: Lang
): ProgramBadge {
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
