import type { Lang } from '@/lib/i18n'
import type { Database } from '@/lib/types/database'

// §26–28, §34 — complaint status is a Postgres enum stored LOWERCASE
// (received / in_progress / action_required / resolved / closed). The raw value
// is never shown; every surface (admin, public tracker, My Complaints) displays
// the Title-Case bilingual label from the map below. This lives here, not in a
// page, because all three surfaces need the same labels — a second copy would
// drift.

export type ComplaintStatus = Database['public']['Enums']['complaint_status']

/**
 * The five statuses in workflow order, for dropdowns and list filters.
 * received / in_progress / action_required are open; resolved is the success
 * ending (counts on the dashboard), closed is a finish without a fix.
 */
export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = [
  'received',
  'in_progress',
  'action_required',
  'resolved',
  'closed',
]

/** Bilingual display labels, like ROLE_LABELS — never render the raw enum. */
export const COMPLAINT_STATUS_LABELS: Record<
  ComplaintStatus,
  { ne: string; en: string }
> = {
  received: { ne: 'प्राप्त', en: 'Received' },
  in_progress: { ne: 'प्रगतिमा', en: 'In Progress' },
  action_required: { ne: 'कारबाही आवश्यक', en: 'Action Required' },
  resolved: { ne: 'समाधान भयो', en: 'Resolved' },
  closed: { ne: 'बन्द', en: 'Closed' },
}

/** Tailwind badge classes per status. Shared by the admin list and detail. */
export const COMPLAINT_STATUS_BADGE: Record<ComplaintStatus, string> = {
  received: 'bg-slate-200 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  action_required: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-300 text-slate-700',
}

/** The Title-Case label for a status in the given language. */
export function complaintStatusLabel(
  status: ComplaintStatus,
  lang: Lang
): string {
  return COMPLAINT_STATUS_LABELS[status][lang]
}

/** Narrowing guard for an untrusted string (form value, search param). */
export function isComplaintStatus(value: string): value is ComplaintStatus {
  return (COMPLAINT_STATUSES as readonly string[]).includes(value)
}
