import Link from 'next/link'

import { AccountMenu } from '@/components/layout/account-menu'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { getLang, type Lang } from '@/lib/i18n'
import { roleFromClaims, STAFF_ROLES, type UserRole } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'

// PRD §11.5 — the account indicator reads the role from the session token
// (via lib/roles.ts), never the database: this header is on every page and
// must stay fast for anonymous visitors. Display only — RLS enforces.

const NAV_ITEMS: { href: string; ne: string; en: string }[] = [
  { href: '/', ne: 'गृहपृष्ठ', en: 'Home' },
  { href: '/notices', ne: 'सूचना', en: 'Notices' },
  { href: '/forms', ne: 'सेवा फारम', en: 'Services' },
  { href: '/complaints/tracker', ne: 'गुनासो', en: 'Complaints' },
  { href: '/programs', ne: 'कार्यक्रम', en: 'Programmes' },
  { href: '/dashboard', ne: 'जवाफदेहिता', en: 'Accountability' },
]

const ROLE_LABELS: Record<UserRole, { ne: string; en: string }> = {
  resident: { ne: 'निवासी', en: 'Resident' },
  ward_secretary: { ne: 'वडा सचिव', en: 'Ward Secretary' },
  admin: { ne: 'प्रशासक', en: 'Admin' },
}

const STRINGS = {
  brand: { ne: 'सिपादोल सेवा', en: 'Sipadol Sewa' },
  ward: {
    ne: 'वडा नं. ८, सूर्यविनायक नगरपालिका',
    en: 'Ward No. 8, Suryabinayak Municipality',
  },
  signIn: { ne: 'साइन इन', en: 'Sign in' },
  signOut: { ne: 'साइन आउट', en: 'Sign out' },
  admin: { ne: 'व्यवस्थापन', en: 'Admin' },
} satisfies Record<string, Record<Lang, string>>

export async function SiteHeader() {
  const lang = await getLang()

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const role = roleFromClaims(data?.claims)
  const fullName =
    (data?.claims?.user_metadata as { full_name?: string } | undefined)
      ?.full_name ?? null

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0">
          <span className="block truncate text-lg font-bold tracking-tight text-blue-800">
            {STRINGS.brand[lang]}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {STRINGS.ward[lang]}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle lang={lang} />

          {role ? (
            <AccountMenu
              fullName={fullName}
              roleLabel={ROLE_LABELS[role][lang]}
              signOutLabel={STRINGS.signOut[lang]}
            />
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              {STRINGS.signIn[lang]}
            </Link>
          )}
        </div>
      </div>

      {/* Nav scrolls horizontally at 375px; no hamburger needed for a
          six-item list. */}
      <nav className="border-t border-slate-100">
        <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 py-1.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className="block rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-800"
              >
                {item[lang]}
              </Link>
            </li>
          ))}
          {role && STAFF_ROLES.includes(role) && (
            <li className="shrink-0">
              <Link
                href="/admin"
                className="block rounded-md px-2.5 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-50"
              >
                {STRINGS.admin[lang]}
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}
