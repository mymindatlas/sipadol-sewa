'use client'

import { useActionState } from 'react'

import type { Lang } from '@/lib/i18n'

import { registerForProgram, type RegisterState } from './actions'

// §22 — the resident-facing half of the register flow. A client component
// only because useActionState needs one; it holds no rule about who may
// register. The page decides whether to render this at all, and the insert
// policy decides whether the row lands.

const initialState: RegisterState = { success: false }

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

type Props = {
  programId: number
  lang: Lang
  /**
   * Pre-fill from the resident's profile. Editable on purpose: these values
   * are FROZEN onto the registration row (migration 0011), so this is where
   * someone gives a different contact for this programme without touching
   * their account.
   */
  defaultFullName: string
  defaultPhone: string
  defaultEmail: string
}

export function RegisterForm({
  programId,
  lang,
  defaultFullName,
  defaultPhone,
  defaultEmail,
}: Props) {
  const [state, formAction, isPending] = useActionState(
    registerForProgram,
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="program_id" value={programId} />

      <div className="space-y-2">
        <label
          htmlFor="full_name"
          className="text-sm font-medium text-slate-700"
        >
          {lang === 'ne' ? 'पूरा नाम' : 'Full name'}
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          defaultValue={defaultFullName}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium text-slate-700">
          {lang === 'ne' ? 'फोन नम्बर' : 'Phone number'}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={defaultPhone}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          {lang === 'ne' ? 'इमेल' : 'Email address'}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
          className={inputClass}
        />
        <p className="text-xs text-slate-500">
          {lang === 'ne'
            ? 'यस कार्यक्रमका लागि मात्र — तपाईंको खाताको इमेल बदलिँदैन।'
            : 'For this programme only — your account email is unchanged.'}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="note" className="text-sm font-medium text-slate-700">
          {lang === 'ne' ? 'थप जानकारी (वैकल्पिक)' : 'Note (optional)'}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
      >
        {isPending
          ? lang === 'ne'
            ? 'दर्ता हुँदै…'
            : 'Registering…'
          : lang === 'ne'
            ? 'दर्ता गर्नुहोस्'
            : 'Register'}
      </button>
    </form>
  )
}
