'use server'

import { createClient } from '@/lib/supabase/server'

// §26 — a resident files a complaint. Like the register flow (§22), everything
// that decides WHETHER this insert is allowed lives in the database:
//
//   • complaints_insert_own_rate_limited — the row must be the caller's own
//     (user_id = auth.uid()) AND fewer than 3 complaints in the last hour
//     (Decision 8). The rate limit lives in the WITH CHECK so it holds even
//     against a direct API call, not just this form.
//   • column grants — a resident may set ONLY category_id, description,
//     location_text (and, later, photo_file). status, ticket_id, user_id,
//     is_published, and every timestamp are DB-set (§9.2). Sending them is not
//     "trusted then ignored"; the grant makes the attempt itself fail.
//
// Neither is re-implemented here. This action sends the three resident-authored
// fields, reads back the DB-generated ticket, and TRANSLATES the database's
// refusal into a sentence — because the rate-limit refusal is a normal outcome
// a resident is owed a reason for.

export type ComplaintState =
  | { success: true; ticketId: string }
  | { success: false; error?: string }

// Postgres error codes, not message text: the message is localized and
// version-dependent, the code is neither.
const INSUFFICIENT_PRIVILEGE = '42501'

export async function submitComplaint(
  _prevState: ComplaintState,
  formData: FormData
): Promise<ComplaintState> {
  const category_id = Number(formData.get('category_id'))
  if (!Number.isInteger(category_id) || category_id <= 0) {
    return {
      success: false,
      error: 'कृपया विषय छान्नुहोस्। (Please choose a category.)',
    }
  }

  const description = formData.get('description')?.toString().trim() ?? ''
  const location_text = formData.get('location_text')?.toString().trim() ?? ''

  if (!description || !location_text) {
    return {
      success: false,
      error:
        'विवरण र स्थान आवश्यक छ। (Description and location are required.)',
    }
  }

  const supabase = await createClient()

  // Guard, not enforcement: the page is only rendered to a signed-in resident
  // (and the middleware redirects an anonymous visitor away), and the insert
  // policy would refuse an anonymous caller anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      error: 'गुनासो दर्ता गर्न साइन इन गर्नुहोस्। (Please sign in to file a complaint.)',
    }
  }

  // Only the three resident-authored fields. user_id defaults to auth.uid();
  // ticket_id, status, and is_published are DB-set, and the column grants
  // forbid a resident setting them anyway (§9.2). photo_file is not wired yet.
  // .select('ticket_id').single() reads back the DB-generated reference so we
  // can show the resident their number.
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      category_id,
      description,
      location_text,
    })
    .select('ticket_id')
    .single()

  if (error) {
    // The policy refused the row. For a signed-in resident, the remaining
    // WITH CHECK clause is the 3/hr rate limit (Decision 8), so this means
    // they have submitted several complaints in the last hour.
    if (
      error.code === INSUFFICIENT_PRIVILEGE ||
      error.message.toLowerCase().includes('row-level security')
    ) {
      return {
        success: false,
        error:
          "तपाईंले हालै धेरै गुनासो पठाउनुभएको छ — कृपया केही समय पर्खनुहोस्। (You've submitted several complaints recently. Please wait a little while before submitting another.)",
      }
    }
    return {
      success: false,
      error:
        'गुनासो दर्ता गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्। (Could not submit your complaint. Please try again.)',
    }
  }

  // No revalidatePath: this page has no list to refresh. The resident is shown
  // the ticket number read back from the stored row, then follows the link to
  // My Complaints, which reads the record itself.
  return { success: true, ticketId: data.ticket_id }
}
