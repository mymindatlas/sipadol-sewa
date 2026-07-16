'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  success: boolean
  message?: string
  error?: string
}

function formatAuthError(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? ''

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }

  if (
    message.includes('already registered') ||
    message.includes('user already exists') ||
    error.code === 'user_already_exists'
  ) {
    return 'An account with this email already exists. Please sign in instead.'
  }

  if (message.includes('confirm')) {
    return 'Please confirm your email before signing in.'
  }

  if (message.includes('captcha')) {
    return 'Human verification failed. Please complete the check and try again.'
  }

  return error.message || 'We could not complete that request right now. Please try again.'
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
