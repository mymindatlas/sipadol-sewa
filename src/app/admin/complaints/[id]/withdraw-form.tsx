'use client'

import { useActionState } from 'react'

import { withdrawComplaint, type ComplaintFormState } from '../actions'

// §34 — the Admin-only withdraw control. Client only because it must SHOW the
// error the withdrawComplaint action returns (a ward_secretary who reaches this
// action — e.g. via a stale role — is rejected by the database trigger, and we
// surface that as a sentence). The control is rendered only for admins; this is
// the message path for the case the button was never meant to allow.

const initialState: ComplaintFormState = {}

export function WithdrawForm({ complaintId }: { complaintId: number }) {
  const [state, formAction, isPending] = useActionState(
    withdrawComplaint,
    initialState
  )

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={complaintId} />
      <textarea
        name="withdrawal_reason"
        rows={3}
        required
        placeholder="Reason for withdrawal (required — recorded permanently)"
        className="w-full rounded-md border border-red-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-400"
      >
        {isPending ? 'Withdrawing…' : 'Withdraw complaint'}
      </button>
    </form>
  )
}
