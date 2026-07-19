import Link from 'next/link'

import { AccountMenu } from '@/components/layout/account-menu'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { SiteNav } from '@/components/layout/site-nav'
import { getLang, type Lang } from '@/lib/i18n'
import { roleFromClaims, STAFF_ROLES, type UserRole } from '@/lib/roles'
import { createClient } from '@/lib/supabase/server'

// PRD §11.5 — the account indicator reads the role from the session token
// (via lib/roles.ts), never the database: this header is on every page and
// must stay fast for anonymous visitors. Display only — RLS enforces.

const NAV_ITEMS: { href: string; ne: string; en: string }[] = [
  { href: '/', ne: 'गृहपृष्ठ', en: 'Home' },
  { href: '/notices', ne: 'सूचना', en: 'Notices' },
  { href: '/programs', ne: 'कार्यक्रम', en: 'Programmes' },
  { href: '/forms', ne: 'सेवा फारम', en: 'Services' },
  { href: '/complaints/tracker', ne: 'गुनासो', en: 'Complaints' },
  { href: '/dashboard', ne: 'जवाफदेहिता', en: 'Accountability' },
  { href: '/gallery', ne: 'ग्यालरी', en: 'Gallery' },
  { href: '/representatives', ne: 'जनप्रतिनिधि', en: 'Representatives' },
]

const ROLE_LABELS: Record<UserRole, { ne: string; en: string }> = {
  resident: { ne: 'निवासी', en: 'Resident' },
  ward_secretary: { ne: 'वडा सचिव', en: 'Ward Secretary' },
  admin: { ne: 'प्रशासक', en: 'Admin' },
}

const STRINGS = {
  // The brand is stored as its two words rather than one string, so each can
  // be coloured without splitting on whitespace at render time — a split that
  // would quietly mis-colour the day someone edits the name.
  brandFirst: { ne: 'सिपाडोल', en: 'Sipadol' },
  brandSecond: { ne: 'सेवा', en: 'Sewa' },
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
          {/* Two-tone wordmark: the place name in the deeper blue, the service
              word in the brighter one. Weight and size carry the identity;
              the colour pair is the only ornament, which is about as much as
              a government masthead should have. */}
          <span className="block truncate text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-blue-900">{STRINGS.brandFirst[lang]}</span>{' '}
            <span className="text-blue-600">{STRINGS.brandSecond[lang]}</span>
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {STRINGS.ward[lang]}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle lang={lang} />

          {role ? (
            // The staff check stays here, on the server, where the claims
            // are. AccountMenu receives a link or nothing — never a role to
            // branch on. It renders on every page, so this is the one route
            // into /admin that survives the homepage, where SiteNav is null.
            <AccountMenu
              fullName={fullName}
              roleLabel={ROLE_LABELS[role][lang]}
              signOutLabel={STRINGS.signOut[lang]}
              adminHref={STAFF_ROLES.includes(role) ? '/admin' : undefined}
              adminLabel={
                STAFF_ROLES.includes(role) ? STRINGS.admin[lang] : undefined
              }
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

      {/* Localized here, on the server; SiteNav only decides which one is
          active. Admin is deliberately NOT in this list — it belongs to the
          account, not to the ward's content, and this row disappears on the
          homepage. */}
      <SiteNav
        items={NAV_ITEMS.map((item) => ({
          href: item.href,
          label: item[lang],
        }))}
      />
    </header>
  )
}
