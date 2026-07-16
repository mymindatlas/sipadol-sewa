'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { updatePassword, type AuthFormState } from './actions'

const initialState: AuthFormState = {
  success: false,
  message: '',
  error: '',
}

// No Turnstile here — Decision 8's password-reset gate is the request form
// (the email-sending abuse vector). This page is reachable only with the
// single-use recovery session established by /auth/confirm.
export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-sm flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
            Sipadol Sewa
          </p>
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-sm text-slate-600">
            Choose a new password for your account. You will sign in with it
            from now on.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Repeat your new password"
            />
          </div>

          {state.error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isPending ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        <p className="text-sm text-slate-600">
          Link expired?{' '}
          <Link href="/reset-password" className="font-semibold text-blue-700 hover:text-blue-800">
            Request a new one
          </Link>
        </p>
      </div>
    </main>
  )
}
