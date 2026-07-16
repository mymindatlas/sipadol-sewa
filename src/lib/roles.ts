import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────
// UI AND REDIRECTS ONLY — NEVER AUTHORIZATION.
//
// The role read here comes from the visitor's JWT, which stays stale for up
// to an hour after a demotion (PRD §3.1). Every actual restriction is
// enforced by RLS policies calling current_role(), which reads the profiles
// table live. Use this module to decide what to RENDER (header account
// badge, admin menu link) and where to REDIRECT — nothing it returns may
// ever gate data access.
//
// THE CLAIM IS `user_role`, NOT `role`. The JWT already carries
// `role: "authenticated"` — that is Postgres's own role, set by GoTrue for
// every signed-in user, unrelated to our four-tier model. Our custom access
// token hook injects the separate `user_role` claim (verified in
// production: user_role: "resident"). Reading `role` would silently return
// "authenticated" on every request — matching none of our roles, so the
// header would render nothing and admin redirects would misfire, with no
// error anywhere to explain why.
// ─────────────────────────────────────────────────────────────────────────

export const USER_ROLES = ['resident', 'ward_secretary', 'admin'] as const

/**
 * The three signed-in tiers of the four-tier model (PRD §2). The fourth —
 * Guest, any visitor without a session — is represented as `null`.
 */
export type UserRole = (typeof USER_ROLES)[number]

export const STAFF_ROLES: readonly UserRole[] = ['ward_secretary', 'admin']

/**
 * Extracts and validates the `user_role` claim from a decoded JWT payload.
 * Returns null for a missing or unrecognised value — never trust the token
 * to be well-formed.
 */
export function roleFromClaims(
  claims: Record<string, unknown> | null | undefined
): UserRole | null {
  const value = claims?.['user_role']
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null
}

/**
 * Current user's role from the session JWT's `user_role` claim.
 * `null` = Guest (signed out, or a token our hook never stamped).
 *
 * UI and redirects only — see the header comment.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return roleFromClaims(data?.claims)
}
