'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

export async function loginUser(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formData.get('email')?.toString().trim() ?? ''
  const password = formData.get('password')?.toString() ?? ''
  const captchaToken = formData.get('captchaToken')?.toString() ?? ''

  if (!email || !password) {
    return {
      success: false,
      error: 'Please enter both your email and password.',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken: captchaToken || undefined,
    },
  })

  if (error) {
    return {
      success: false,
      error: formatAuthError(error),
    }
  }

  revalidatePath('/')
  redirect('/')
}
