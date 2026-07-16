'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  success: boolean
  message?: string
  error?: string
}

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = formData.get('password')?.toString() ?? ''
  const confirmPassword = formData.get('confirm_password')?.toString() ?? ''

  if (!password || !confirmPassword) {
    return {
      success: false,
      error: 'Please enter and confirm your new password.',
    }
  }

  if (password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters long.',
    }
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'The passwords do not match. Please try again.',
    }
  }

  const supabase = await createClient()

  // This page is reachable only through the recovery session that
  // /auth/confirm established from the emailed link (PRD §14). No session
  // means the link was never clicked, or it expired.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: 'Your reset link is invalid or has expired. Please request a new one.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const message = error.message?.toLowerCase() ?? ''

    if (message.includes('different from the old password') || message.includes('should be different')) {
      return {
        success: false,
        error: 'Your new password must be different from the old one.',
      }
    }

    return {
      success: false,
      error: error.message || 'We could not update your password right now. Please try again.',
    }
  }

  // PRD §14.2 — after setting the new password the resident is returned to
  // login. End the recovery session so they sign in with the new password.
  await supabase.auth.signOut()
  redirect('/login')
}
