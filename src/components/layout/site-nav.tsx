'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The nav row, split out of SiteHeader for one reason: it needs the current
// path, and SiteHeader is a server component that reads the session. Keeping
// the header on the server (no session work shipped to the browser) while this
// small, data-free list re-renders on the client is the cheaper half of the
// trade. Labels arrive pre-localized so this component holds no i18n logic.

export type SiteNavItem = {
  href: string
  label: string
}

type Props = {
  items: SiteNavItem[]
}

/**
 * Whether `href` is the section the viewer is currently in.
 *
 * '/' is matched exactly: prefix-matching it would make Home active on every
 * page, since every path starts with a slash. Everything else matches its own
 * path or anything beneath it, so /notices/5 lights up Notices.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteNav({ items }: Props) {
  const pathname = usePathname()

  // §11 — on the homepage the 8-card hub IS the navigation. Repeating it as a
  // strip directly above would be the same links twice on the one screen
  // where they are already unmissable.
  if (pathname === '/') return null

  const linkClass = (href: string) =>
    isActive(pathname, href)
      ? 'block rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-800'
      : 'block rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-800'

  return (
    // Nav scrolls horizontally at 375px; no hamburger needed for a
    // eight-item list.
    <nav className="border-t border-slate-100">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 py-1.5">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              // Announces the current page to a screen reader, which the
              // colour change alone does not.
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={linkClass(item.href)}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
