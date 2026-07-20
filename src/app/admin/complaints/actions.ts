'use server'

import { revalidatePath } from 'next/cache'

import { isComplaintStatus } from '@/lib/complaints'
import { createClient } from '@/lib/supabase/server'

// §34 — staff complaint management. Every write here runs as the signed-in
// staff user, so the complaints RLS policies (complaints_update_staff, checking
// current_role() live per §3.1) decide whether it lands. The accountability
// guarantees belong to the DATABASE, not this file:
//   • the status-history row is written by the 0012 trigger on every status
//     change — never inserted from here (Decision 10, append-only).
//   • withdrawal is gated to Admin by the 0012 enforce_withdrawal_is_admin
//     trigger, which also stamps withdrawn_by from the session — never set
//     here. A ward_secretary's withdraw is rejected BY THE DATABASE.

export type ComplaintFormState = { error?: string }

// §34 — the admin list, the detail page, the public tracker, and the homepage
// dashboard all reflect complaint state; a change must refresh all of them.
function revalidateComplaintPaths(id: number) {
  revalidatePath('/admin/complaints')
  revalidatePath(`/admin/complaints/${id}`)
  revalidatePath('/complaints/tracker')
  revalidatePath('/')
}

export async function updateComplaintStatus(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const status = formData.get('status')?.toString() ?? ''
  // Statuses are a Postgres enum — an out-of-range value would be rejected by
  // the column type anyway; validating here makes a bad value a no-op rather
  // than an error page.
  if (!isComplaintStatus(status)) return

  const supabase = await createClient()
  // Only status. The 0012 trigger records the history row (new status, actor =
  // auth.uid()) automatically — inserting one here would double-log.
  await supabase.from('complaints').update({ status }).eq('id', id)

  revalidateComplaintPaths(id)
}

export async function updateStaffNote(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  // Empty textarea clears the note to null — an absent note reads as absent on
  // My Complaints, not as an empty string.
  const staff_note = formData.get('staff_note')?.toString().trim() || null

  const supabase = await createClient()
  await supabase.from('complaints').update({ staff_note }).eq('id', id)

  revalidateComplaintPaths(id)
}

// One-click publish/unpublish (Decision 9 — staff publish after review),
// mirroring toggleProgramPublished. Publishing makes the ANONYMISED row visible
// on the public tracker; identity never crosses into complaints_public.
export async function toggleComplaintPublished(
  formData: FormData
): Promise<void> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()

  const { data: complaint } = await supabase
    .from('complaints')
    .select('is_published')
    .eq('id', id)
    .maybeSingle()
  if (!complaint) return

  await supabase
    .from('complaints')
    .update({ is_published: !complaint.is_published })
    .eq('id', id)

  revalidateComplaintPaths(id)
}

// Withdrawal (Admin only). This action does NOT enforce the role — the 0012
// enforce_withdrawal_is_admin trigger does, rejecting a ward_secretary at the
// database. We set only withdrawn_at + withdrawal_reason; withdrawn_by is
// stamped by the trigger from the session, so it cannot be forged. When the
// trigger rejects a non-admin, we translate the error into a sentence.
export async function withdrawComplaint(
  _prevState: ComplaintFormState,
  formData: FormData
): Promise<ComplaintFormState> {
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Missing complaint id.' }

  const withdrawal_reason =
    formData.get('withdrawal_reason')?.toString().trim() ?? ''
  if (!withdrawal_reason) {
    return {
      error:
        'A reason is required to withdraw a complaint. फिर्ता लिने कारण आवश्यक छ।',
    }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from('complaints')
    .update(
      { withdrawn_at: new Date().toISOString(), withdrawal_reason },
      { count: 'exact' }
    )
    .eq('id', id)

  if (error) {
    // enforce_withdrawal_is_admin raised — the caller is a ward_secretary, not
    // an admin. The two-tier trust model, enforced in the database (§34).
    return {
      error:
        'Only an Admin may withdraw a complaint. गुनासो फिर्ता लिने अधिकार प्रशासकको मात्र हो।',
    }
  }
  if (count === 0) {
    return { error: 'Complaint not found.' }
  }

  revalidateComplaintPaths(id)
  return {}
}
