import NepaliDate from 'nepali-date-converter'

import type { Lang } from '@/lib/i18n'

// PRD §4.2 — every timestamp renders in Nepal Standard Time (UTC+05:45).
// The 45-minute offset is not cosmetic: for anything recorded between
// 18:15 and midnight Kathmandu time, a UTC (or US-hosted-server) rendering
// shows the wrong DAY. So every formatter here first resolves the calendar
// date IN Asia/Kathmandu, and only then formats or converts it.
//
// Bikram Sambat when lang=ne, Gregorian when lang=en (PRD §4.2).

const TIME_ZONE = 'Asia/Kathmandu'

type KtmParts = {
  year: number
  month: number // 1-12
  day: number
  hour: number // 0-23
  minute: number
}

/** The wall-clock date/time in Kathmandu for the given instant. */
function ktmParts(date: Date): KtmParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/**
 * nepali-date-converter reads a JS Date's LOCAL components (verified in its
 * source: `adDateObject.getFullYear()` etc.), so handing it the raw
 * timestamp would convert the server's local calendar date, not
 * Kathmandu's. Instead we resolve the Kathmandu date first and hand the
 * converter a Date built from those exact components (noon, to keep any
 * boundary arithmetic away from midnight).
 */
function toBikramSambat({ year, month, day }: KtmParts): NepaliDate {
  return new NepaliDate(new Date(year, month - 1, day, 12))
}

const NE_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

/**
 * Devanagari digits for an already-formatted string. Pure text substitution
 * — no calendar logic — so it is also the right tool for numbers that are
 * not dates at all (a Bikram Sambat year label, a photo count).
 */
export function toNepaliDigits(value: string): string {
  return value.replace(/\d/g, (d) => NE_DIGITS[Number(d)])
}

function asDate(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input)
}

/**
 * Date only — "२९ असार २०८३" (BS) when ne, "13 July 2026" when en.
 */
export function formatDate(input: string | Date, lang: Lang): string {
  const date = asDate(input)
  if (Number.isNaN(date.getTime())) return ''

  if (lang === 'ne') {
    return toBikramSambat(ktmParts(date)).format('D MMMM YYYY', 'np')
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Date + wall-clock time in Kathmandu — for complaint timestamps, status
 * events, and anywhere the hour matters.
 */
export function formatDateTime(input: string | Date, lang: Lang): string {
  const date = asDate(input)
  if (Number.isNaN(date.getTime())) return ''

  const parts = ktmParts(date)
  const hh = String(parts.hour).padStart(2, '0')
  const mm = String(parts.minute).padStart(2, '0')

  if (lang === 'ne') {
    const bs = toBikramSambat(parts).format('D MMMM YYYY', 'np')
    return `${bs}, ${toNepaliDigits(`${hh}:${mm}`)}`
  }

  return `${formatDate(date, 'en')}, ${hh}:${mm}`
}
