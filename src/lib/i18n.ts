import { cookies } from 'next/headers'

// PRD §4 — the language choice lives in a COOKIE, never localStorage.
// Pages are assembled on the server; the server can read a cookie but not
// browser storage. localStorage would mean every page arrives in the wrong
// language and then visibly switches, on every page, on every visit.
//
// This module reads next/headers, so it is server-only. The client-side
// language toggle (src/components/layout/language-toggle.tsx) writes the
// same cookie by name — keep the two in sync.

export const LANG_COOKIE = 'lang'

export type Lang = 'ne' | 'en'

export const DEFAULT_LANG: Lang = 'ne'

/**
 * Current language from the `lang` cookie. A first-time visitor with no
 * cookie (or a tampered value) gets Nepali — the PRD §4 default.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies()
  return store.get(LANG_COOKIE)?.value === 'en' ? 'en' : DEFAULT_LANG
}

/**
 * Picks the right value from a bilingual DB row (PRD §4: content tables
 * store `_ne` + `_en` column pairs, staff author both).
 *
 *   localized(notice, 'title', lang)  →  notice.title_ne | notice.title_en
 *
 * Falls back to the other language if the requested one is empty, so a
 * half-authored row degrades to the wrong language rather than to a blank.
 */
export function localized(
  row: Record<string, unknown>,
  base: string,
  lang: Lang
): string {
  const preferred = row[`${base}_${lang}`]
  const fallback = row[`${base}_${lang === 'ne' ? 'en' : 'ne'}`]
  if (typeof preferred === 'string' && preferred.trim() !== '') return preferred
  if (typeof fallback === 'string') return fallback
  return ''
}
