import { NextResponse } from 'next/server'

import {
  isUploadPurpose,
  signUpload,
  UPLOAD_PURPOSES,
} from '@/lib/cloudinary'
import { createClient } from '@/lib/supabase/server'

// Upload authorisation (§10.3, Decision 7). The browser asks permission
// BEFORE uploading; the server decides folder, delivery type and filename,
// never the browser. The one property that must hold: nothing in the request
// body can influence what gets signed. See src/lib/cloudinary.ts — the signed
// params come only from the purpose's server-side constants.

// Rate limit per user (§10.3: "rate-limited per account"). In-memory sliding
// window — adequate at ward volume and for the threat here (a signed-in user
// spraying signatures to burn quota). It does not survive a redeploy or span
// instances; that is an acceptable trade at this scale, and the real quota
// ceiling still lives in Cloudinary.
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 1000
const hits = new Map<string, number[]>()

function rateLimited(userId: string): boolean {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(userId, recent)
    return true
  }
  recent.push(now)
  hits.set(userId, recent)
  return false
}

type Body = {
  purpose?: unknown
  format?: unknown
  bytes?: unknown
}

export async function POST(request: Request) {
  const supabase = await createClient()

  // 1. An active session, or nothing. Uploading into the ward's media
  //    account is never anonymous.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  if (rateLimited(user.id)) {
    return NextResponse.json(
      { error: 'Too many upload requests. Wait a minute and try again.' },
      { status: 429 }
    )
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // 2. Purpose must be one we know.
  if (!isUploadPurpose(body.purpose)) {
    return NextResponse.json({ error: 'Unknown upload purpose.' }, { status: 400 })
  }
  const config = UPLOAD_PURPOSES[body.purpose]

  // 3. Public-facing purposes require staff. This is an AUTHORIZATION
  //    decision, so the role is read LIVE from profiles (identical to what
  //    current_role() reads) — never the JWT claim, which §3.1 reserves for
  //    UI/redirects and which stays stale for up to an hour after a demotion.
  if (config.requiresStaff) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ward_secretary' && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'This upload requires staff access.' },
        { status: 403 }
      )
    }
  }

  // 4. Format gate. Cloudinary's console does not expose an allowed-formats
  //    field on signed uploads, so it is enforced here (§10.3).
  const format =
    typeof body.format === 'string' ? body.format.toLowerCase() : ''
  if (!(config.formats as readonly string[]).includes(format)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Allowed: ${config.formats.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  // 5. Size ceiling.
  const bytes = typeof body.bytes === 'number' ? body.bytes : NaN
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > config.maxBytes) {
    return NextResponse.json(
      {
        error: `File too large. Maximum ${Math.floor(
          config.maxBytes / (1024 * 1024)
        )} MB.`,
      },
      { status: 400 }
    )
  }

  // 6/7. Sign the server-side constants only, return everything the browser
  //      needs to upload — but never the api_secret.
  try {
    const signed = signUpload(body.purpose)
    return NextResponse.json(signed)
  } catch {
    return NextResponse.json(
      { error: 'Upload signing is not available right now.' },
      { status: 500 }
    )
  }
}
