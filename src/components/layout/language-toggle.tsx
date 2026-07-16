'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { Lang } from '@/lib/i18n'

// Writes the language cookie and refreshes the route so server components
// re-render in the new language (PRD §4 — cookie, never localStorage: the
// server can't read localStorage, so every page would arrive in the wrong
// language and then visibly switch).
//
// Cookie name must match LANG_COOKIE in src/lib/i18n.ts — that module
// imports next/headers, so a client component can't import it directly.
const LANG_COOKIE = 'lang'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function LanguageToggle({ lang }: { lang: Lang }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const nextLang: Lang = lang === 'ne' ? 'en' : 'ne'

  function switchLanguage() {
    document.cookie = `${LANG_COOKIE}=${nextLang}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
    // router.refresh() re-runs every server component with the new cookie.
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={isPending}
      aria-label={nextLang === 'en' ? 'Switch to English' : 'नेपालीमा हेर्नुहोस्'}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {nextLang === 'en' ? 'EN' : 'नेपाली'}
    </button>
  )
}
