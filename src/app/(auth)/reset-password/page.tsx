'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'

import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from '@/components/auth/turnstile-widget'

import { requestPasswordReset, type AuthFormState } from './actions'

const initialState: AuthFormState = {
  success: false,
  message: '',
  error: '',
}

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState
  )
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const [captchaToken, setCaptchaToken] = useState('')

  // Turnstile tokens are single-use: any completed submission — failed or
  // successful — spends the token, so reset the widget before the next try.
  // reset() clears captchaToken via onVerify('') and the re-run challenge
  // delivers the fresh token the same way; the submit button stays disabled
  // in between.
  useEffect(() => {
    if (state.error || state.success) {
      turnstileRef.current?.reset()
    }
  }, [state])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-sm flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
            Sipadol Sewa
          </p>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-slate-600">
            Enter your email address and we will send you a link to set a new
            password.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </div>

          <TurnstileWidget ref={turnstileRef} onVerify={setCaptchaToken} />
          <input type="hidden" name="captchaToken" value={captchaToken} />

          {state.error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          {state.success && state.message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || !captchaToken}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isPending ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-sm text-slate-600">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  )
}
