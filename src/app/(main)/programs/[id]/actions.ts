'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

// §22 — the first resident write in the system. Everything that decides
// WHETHER this insert is allowed lives in the database:
//
//   • program_registrations_insert_own_if_open — the row must be the caller's
//     own (user_id = auth.uid()) AND program_is_open(program_id) must be true.
//   • program_registrations_unique_per_person  — one row per resident per
//     programme.
//
// Neither is re-implemented here. This action's job is to send the resident's
// own values and to TRANSLATE the database's refusal into a sentence, because
// a refusal is the normal outcome of two ordinary situations (already
// registered; registration closed) and a resident is owed a reason. Checking
// "is it open?" here as well would add a second, drifting source of truth —
// the exact thing program_is_open() exists to prevent (§13).

export type RegisterState = {
  success: boolean
  error?: string
}

// Postgres error codes, not message text: the message is localized and
// version-dependent, the code is neither.
const UNIQUE_VIOLATION = '23505'
const INSUFFICIENT_PRIVILEGE = '42501'

export async function registerForProgram(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const program_id = Number(formData.get('program_id'))
  if (!Number.isInteger(program_id)) {
    return { success: false, error: 'Missing programme. कार्यक्रम फेला परेन।' }
  }

  const full_name = formData.get('full_name')?.toString().trim() ?? ''
  const phone = formData.get('phone')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  // Optional — null rather than '' so an unanswered field reads as absent.
  const note = formData.get('note')?.toString().trim() || null

  if (!full_name || !phone || !email) {
    return {
      success: false,
      error:
        'नाम, फोन र इमेल आवश्यक छ। (Name, phone, and email are required.)',
    }
  }

  const supabase = await createClient()

  // Guard, not enforcement: the form is only rendered to a signed-in
  // resident, and the insert policy would refuse an anonymous caller anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      error:
        'दर्ता गर्न साइन इन गर्नुहोस्। (Please sign in to register.)',
    }
  }

  // user_id is sent because the policy compares it to auth.uid() — sending
  // someone else's id fails the WITH CHECK rather than impersonating them.
  // Nothing else is set: created_at is database-set.
  const { error } = await supabase.from('program_registrations').insert({
    program_id,
    user_id: user.id,
    full_name,
    phone,
    email,
    note,
  })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error:
          'तपाईंले यस कार्यक्रमका लागि पहिले नै दर्ता गर्नुभएको छ। (You have already registered for this programme.)',
      }
    }
    // The policy refused the row. For a signed-in resident sending their own
    // user_id, the only remaining WITH CHECK clause is program_is_open(), so
    // this means registration is shut: toggled off, or past its deadline.
    if (
      error.code === INSUFFICIENT_PRIVILEGE ||
      error.message.toLowerCase().includes('row-level security')
    ) {
      return {
        success: false,
        error:
          'यस कार्यक्रमको दर्ता बन्द भएको छ। (Registration for this programme is closed.)',
      }
    }
    return {
      success: false,
      error:
        'दर्ता गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्। (Could not complete your registration. Please try again.)',
    }
  }

  // Re-renders the page into the "already registered" state, which reads the
  // stored row back — so what the resident sees confirmed is what the
  // database actually holds, not what the form happened to post.
  revalidatePath(`/programs/${program_id}`)
  return { success: true }
}
