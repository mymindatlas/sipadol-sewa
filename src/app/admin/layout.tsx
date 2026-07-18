import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getCurrentRole, STAFF_ROLES } from '@/lib/roles'

// The role gate (PRD §31.5). Reads the `user_role` claim from the JWT via
// lib/roles.ts — display/redirect use only, exactly what §3.1 allots the
// token. THIS IS A UX CONVENIENCE, NOT ENFORCEMENT: a resident who slips
// past this redirect (stale token, direct server action call) hits RLS
// policies that check current_role() live and return nothing. Every
// module below independently enforces its own rules in the database.

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/notices', label: 'Notices · सूचना' },
  { href: '/admin/representatives', label: 'Representatives · जनप्रतिनिधि' },
  { href: '/admin/gallery', label: 'Gallery · ग्यालरी' },
]

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const role = await getCurrentRole()

  if (!role || !STAFF_ROLES.includes(role)) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:flex-row">
      {/* Sidebar on lg; compact top bar on mobile */}
      <aside className="shrink-0 border-b border-slate-200 bg-slate-900 text-slate-100 lg:min-h-screen lg:w-60 lg:border-b-0">
        <div className="px-4 py-3 lg:py-5">
          <p className="text-sm font-bold tracking-tight">सिपादोल सेवा</p>
          <p className="text-[11px] text-slate-400">
            Ward Administration
            {role === 'admin' ? ' · Admin' : ' · Ward Secretary'}
          </p>
        </div>
        <nav className="px-2 pb-2 lg:pb-4">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0 lg:mt-4">
              <Link
                href="/"
                className="block rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ← Public site
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
