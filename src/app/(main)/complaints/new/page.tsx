import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getLang } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

import { ComplaintForm } from './complaint-form'

// §26 — the complaint submission page. Resident-only: the middleware already
// redirects an anonymous visitor away from /complaints/new, and we guard again
// here so the page never renders a form to someone who cannot file.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'गुनासो दर्ता' : 'Submit a Complaint',
    path: '/complaints/new',
  })
}

export default async function NewComplaintPage() {
  const [lang, supabase] = await Promise.all([getLang(), createClient()])

  // Guard, not enforcement: middleware handles the redirect, but a page that
  // renders a resident-write form must not assume a session it hasn't checked.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Active categories only, in the staff-chosen order. RLS lets everyone read
  // complaint_categories, so this is a plain ordered select.
  const { data: categories } = await supabase
    .from('complaint_categories')
    .select('id, name_ne, name_en')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-slate-900">
          {lang === 'ne' ? 'गुनासो दर्ता' : 'Submit a Complaint'}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {lang === 'ne'
            ? 'वडाभित्रको कुनै समस्या वडा कार्यालयलाई जानकारी गराउनुहोस्। तपाईंले पछि यसको स्थिति ट्र्याक गर्न सक्नुहुन्छ।'
            : 'Report a problem in the ward to the ward office. You can track its status afterwards.'}
        </p>
      </header>

      <ComplaintForm lang={lang} categories={categories ?? []} />
    </div>
  )
}
