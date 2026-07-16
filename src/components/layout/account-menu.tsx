'use client'

import { useState } from 'react'

import { signOut } from './actions'

type Props = {
  fullName: string | null
  roleLabel: string
  signOutLabel: string
}

// The signed-in account chip. At 375px a dropdown beats stacking more
// items into the header row: the trigger stays one compact element, and
// role + sign-out live in the menu. /account joins the menu when PRD §36
// is built.
export function AccountMenu({ fullName, roleLabel, signOutLabel }: Props) {
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
