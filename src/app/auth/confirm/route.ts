import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

// PRD §10.2 — every emailed link (signup confirmation, password reset) lands
// here. The single-use token is exchanged for a session, then the visitor is
// forwarded onward. Route handler, not a page.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const destination =
        type === 'recovery' ? '/reset-password/update' : '/login?confirmed=1'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', request.url)
  )
}
