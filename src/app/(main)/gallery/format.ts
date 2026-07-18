import { toNepaliDigits } from '@/lib/dates'
import type { Lang } from '@/lib/i18n'

// Gallery-local display helpers. Deliberately NOT in lib/dates.ts:
// gallery_albums.year_bs is an integer a staff member typed, not a date. It
// is never parsed, converted, or compared against a calendar — only shown.
// Routing it through the BS date machinery would invite exactly the bug
// that separation prevents.

/**
 * The album year as a label: "२०८२" in Nepali, "2082 BS" in English. The
 * English form keeps the era suffix because a bare "2082" reads as a
 * Gregorian year to an English speaker.
 */
export function formatYearBs(year: number, lang: Lang): string {
  return lang === 'ne' ? toNepaliDigits(String(year)) : `${year} BS`
}

/** "१२ तस्बिर" / "12 photos" — the count, localized digits included. */
export function formatPhotoCount(count: number, lang: Lang): string {
  if (lang === 'ne') return `${toNepaliDigits(String(count))} तस्बिर`
  return `${count} ${count === 1 ? 'photo' : 'photos'}`
}

// Mirrors the delivery URL that CloudinaryImage builds. Metadata needs a URL
// string rather than an element, and the transformation is not optional here
// either: this URL is handed to WhatsApp and Facebook, so it must be the
// EXIF-stripped, size-capped rendition, never the original (§10.3, §10.5).
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

export function coverImageUrl(publicId: string): string | undefined {
  if (!CLOUD_NAME) return undefined
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1200/${publicId}`
}
