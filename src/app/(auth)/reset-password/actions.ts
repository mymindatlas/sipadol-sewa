'use server'

import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  success: boolean
  message?: string
  error?: string
}

// PRD §14.2 — shown identically whether or not the address is registered,
// so this page cannot be used to discover who has an account.
const CONFIRMATION_MESSAGE =
  'If an account exists for this email, a password reset link is on its way. Check your inbox.'

export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email')?.toString().trim() ?? ''
  const captchaToken = formData.get('captchaToken')?.toString() ?? ''

  if (!email) {
    return {
      success: false,
      error: 'Please enter your email address.',
    }
  }

  const supabase = await createClient()
  // The recovery email template points at /auth/confirm (PRD §10.2), which
  // validates the token, establishes a session, and forwards to
  // /reset-password/update.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken: captchaToken || undefined,
  })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''

    // Failures about the requester — not about whether the email is
    // registered — are safe to surface.
    if (message.includes('captcha')) {
      return {
        success: false,
        error: 'Human verification failed. Please complete the check and try again.',
      }
    }

    if (message.includes('rate limit') || message.includes('too many')) {
      return {
        success: false,
        error: 'Too many reset requests. Please wait a moment and try again.',
      }
    }

    // Anything else falls through to the identical confirmation — surfacing
    // it could reveal whether the address has an account (PRD §14.2).
  }

  return {
    success: true,
    message: CONFIRMATION_MESSAGE,
  }
}
