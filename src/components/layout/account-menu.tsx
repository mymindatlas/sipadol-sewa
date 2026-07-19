'use client'

import Link from 'next/link'
import { useState } from 'react'

import { signOut } from './actions'

type Props = {
  fullName: string | null
  roleLabel: string
  signOutLabel: string
  /**
   * Staff destination. Present ONLY when the server has already decided the
   * viewer is staff — this component performs no role check of its own, and
   * `undefined` is the entire instruction to render nothing. The role never
   * crosses to the client, so the browser has nothing to tamper with; and
   * even if it did, admin/layout.tsx re-checks the role live and every RLS
   * policy calls current_role(). This link is an affordance, not a gate.
   */
  adminHref?: string
  adminLabel?: string
}

// The signed-in account chip. At 375px a dropdown beats stacking more
// items into the header row: the trigger stays one compact element, and
// role + sign-out live in the menu. /account joins the menu when PRD §36
// is built.
//
// The Admin link lives HERE rather than in the nav row because this menu
// renders on every page — including the homepage, where SiteNav returns null
// and a staff member would otherwise have no visible route into /admin.
export function AccountMenu({
  fullName,
  roleLabel,
  signOutLabel,
  adminHref,
  adminLabel,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-[10rem] items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-left hover:bg-slate-100"
      >
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-slate-800">
            {fullName ?? roleLabel}
          </span>
          {fullName && (
            <span className="block truncate text-[10px] leading-tight text-emerald-700">
              {roleLabel}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* Invisible backdrop: a tap anywhere else closes the menu. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <div className="border-b border-slate-100 px-3 py-2">
              {fullName && (
                <p className="truncate text-sm font-semibold text-slate-900">
                  {fullName}
                </p>
              )}
              <p className="text-xs text-emerald-700">{roleLabel}</p>
            </div>
            {adminHref && adminLabel && (
              // Above sign-out and visually separated: a staff action, not a
              // routine one. Keeps the blue accent the nav Admin link carried.
              <Link
                href={adminHref}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block border-b border-slate-100 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
              >
                {adminLabel}
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
              >
                {signOutLabel}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
