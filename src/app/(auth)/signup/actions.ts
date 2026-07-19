'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  success: boolean
  message?: string
  error?: string
}

// Signup can fail with a 500 `unexpected_failure` — currently when Resend's
// sandbox refuses a recipient that is not on the allowlist, so the
// confirmation email never sends. That shape matched no branch below and hit
// a final line that returned `error.message` UNCHECKED: a non-string there
// (or an error object that does not survive Server Action serialization)
// reached state.error and rendered as the literal "{}". A resident saw
// punctuation instead of a reason.
//
// Every return below is a non-empty string. That is the fix — not another
// branch, but making it impossible for a non-string to escape this function.

const EMAIL_SEND_ERROR =
  'We could not complete your signup — the confirmation email could not be sent. Please contact the ward office. / दर्ता पूरा हुन सकेन — पुष्टिकरण इमेल पठाउन सकिएन। कृपया वडा कार्यालयमा सम्पर्क गर्नुहोस्।'

const GENERIC_ERROR =
  'We could not complete that request right now. Please try again, or contact the ward office. / अहिले यो अनुरोध पूरा हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्, वा वडा कार्यालयमा सम्पर्क गर्नुहोस्।'

function formatAuthError(error: { message?: unknown; code?: unknown }): string {
  // supabase-js types `message` as string, but it is not one on every 500
  // path — and .toLowerCase() on an object throws, taking down the action.
  const raw = typeof error?.message === 'string' ? error.message : ''
  const message = raw.toLowerCase()
  const code = typeof error?.code === 'string' ? error.code : ''

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }

  if (
    message.includes('already registered') ||
    message.includes('user already exists') ||
    code === 'user_already_exists'
  ) {
    return 'An account with this email already exists. Please sign in instead.'
  }

  // Deliberately BEFORE the 'confirm' branch: "Error sending confirmation
  // email" contains "confirm", so in the old order a failed SEND was answered
  // with "please confirm your email" — advice about a message that never
  // arrived. Matched narrowly on 'sending' / 'confirmation email' / the 500
  // code rather than on bare 'email', which would swallow the genuine
  // "Email not confirmed" case below.
  if (
    message.includes('sending') ||
    message.includes('confirmation email') ||
    code === 'unexpected_failure'
  ) {
    return EMAIL_SEND_ERROR
  }

  // §12 — surfaced as itself. Genericising this locks real residents out with
  // no explanation of why their password is being refused.
  if (message.includes('confirm')) {
    return 'Please confirm your email before signing in.'
  }

  if (message.includes('captcha')) {
    return 'Human verification failed. Please complete the check and try again.'
  }

  // A specific sentence from Supabase still beats a generic one, so it is
  // passed through — but only once it is provably a non-empty string. String()
  // is belt-and-braces on an already-narrowed value.
  const passthrough = String(raw).trim()
  return passthrough || GENERIC_ERROR
}

export async function signUpUser(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fullName = formData.get('full_name')?.toString().trim() ?? ''
  const phone = formData.get('phone')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const password = formData.get('password')?.toString() ?? ''
  const captchaToken = formData.get('captchaToken')?.toString() ?? ''

  if (!fullName || !phone || !email || !password) {
    return {
      success: false,
      error: 'Please fill in your name, phone number, email, and password.',
    }
  }

  if (password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters long.',
    }
  }

  const supabase = await createClient()
  // full_name and phone land in raw_user_meta_data, where the
  // handle_new_user() trigger copies them onto the profile row.
  // Role is hardcoded to 'resident' in the trigger — never sent from here.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken: captchaToken || undefined,
      data: {
        full_name: fullName,
        phone,
      },
    },
  })

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    }
  }

  revalidatePath('/')

  return {
    success: true,
    message: 'Check your email to confirm your account before logging in.',
  }
}
