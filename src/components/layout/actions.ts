'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

// Sign-out is a mutation, so it's a Server Action like login/signup —
// the server client clears the session cookies on the response.
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Flush the client router cache so no navigation serves a header
  // rendered for the old session.
  revalidatePath('/', 'layout')
  redirect('/')
}
