'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { signUpUser, type AuthFormState } from '@/app/auth/actions'

const initialState: AuthFormState = {
  success: false,
  message: '',
  error: '',
}

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpUser, initialState)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-sm flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">
            Sipadol Sewa
          </p>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-slate-600">
            Join the ward community to stay connected with local notices and services.
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
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
            disabled={isPending}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
