import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { formatDateOnly, todayInKathmandu } from '@/lib/dates'
import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { dateRange } from '@/lib/programs'
import { createClient } from '@/lib/supabase/server'

import { RegisterForm } from './register-form'

// §22 — public programme detail plus the resident register flow. The
// .eq('is_published', true) keeps the page honest even for a staff session
// (whose RLS would let drafts through); for everyone else the
// "programs_select_published" policy already excludes drafts, so an
// unpublished programme is indistinguishable from a nonexistent one: 404.

type ProgramRow = {
  id: number
  title_ne: string
  title_en: string
  description_ne: string
  description_en: string
  banner_public_id: string | null
  start_date: string
  end_date: string | null
  registration_open: boolean
  registration_deadline: string | null
}

// cache() dedupes between generateMetadata and the page render.
const getProgram = cache(async (id: number): Promise<ProgramRow | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('programs')
    .select(
      'id, title_ne, title_en, description_ne, description_en, banner_public_id, start_date, end_date, registration_open, registration_deadline'
    )
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle<ProgramRow>()

  return data
})

// Mirrors the delivery URL CloudinaryImage builds. Metadata needs a URL
// string rather than an element, and the transformation is not optional here
// either: this URL is handed to WhatsApp and Facebook, so it must be the
// EXIF-stripped, size-capped rendition, never the original (§10.3, §10.5).
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

function bannerImageUrl(publicId: string): string | undefined {
  if (!CLOUD_NAME) return undefined
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1200/${publicId}`
}

const EXCERPT_LENGTH = 160

function excerpt(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= EXCERPT_LENGTH) return collapsed
  return `${collapsed.slice(0, EXCERPT_LENGTH).trimEnd()}…`
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const programId = Number(id)
  if (!Number.isInteger(programId)) return buildMetadata()

  const [program, lang] = await Promise.all([getProgram(programId), getLang()])
  if (!program) return buildMetadata()

  return buildMetadata({
    title: localized(program, 'title', lang),
    description: excerpt(localized(program, 'description', lang)),
    image: program.banner_public_id
      ? bannerImageUrl(program.banner_public_id)
      : undefined,
    path: `/programs/${program.id}`,
  })
}

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params
  const programId = Number(id)
  if (!Number.isInteger(programId)) notFound()

  const [program, lang] = await Promise.all([getProgram(programId), getLang()])
  if (!program) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayInKathmandu()
  const deadlinePassed =
    program.registration_deadline !== null &&
    program.registration_deadline < today
  // The same rule the list page shows and program_is_open() enforces (§13).
  // For DISPLAY only — it decides which panel to render, never whether a row
  // may be written. The insert policy is what actually refuses a late signup,
  // including one submitted the instant after this page rendered.
  const isOpen = program.registration_open && !deadlinePassed

  // RLS lets a resident read only their OWN registrations
  // ("program_registrations_select_own"), so this returns their row or
  // nothing — it can never disclose whether anyone else has registered.
  const { data: registration } = user
    ? await supabase
        .from('program_registrations')
        .select('full_name, phone, email, note')
        .eq('program_id', program.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

  // Pre-fill only; the resident may change any of it before submitting.
  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const title = localized(program, 'title', lang)

  return (
    <div className="space-y-5">
      <Link
        href="/programs"
        className="inline-block text-sm font-medium text-slate-600 hover:text-blue-800 hover:underline"
      >
        {lang === 'ne' ? '← कार्यक्रममा फर्कनुहोस्' : '← Back to programmes'}
      </Link>

      {program.banner_public_id ? (
        <CloudinaryImage
          publicId={program.banner_public_id}
          alt={title}
          width={1200}
          className="h-48 w-full rounded-xl bg-slate-100 object-cover md:h-64"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-48 w-full items-center justify-center rounded-xl bg-slate-100 text-4xl text-slate-300 md:h-64"
        >
          📅
        </span>
      )}

      <header className="space-y-1">
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="text-sm font-medium text-blue-800">
          {dateRange(program, lang)}
        </p>
        {program.registration_deadline && (
          <p className="text-sm text-slate-600">
            {lang === 'ne'
              ? `दर्ता अन्तिम मिति: ${formatDateOnly(program.registration_deadline, lang)}`
              : `Register by: ${formatDateOnly(program.registration_deadline, lang)}`}
          </p>
        )}
      </header>

      {/* whitespace-pre-line: staff author paragraphs in a textarea, and the
          line breaks they typed are the only structure the text has. */}
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {localized(program, 'description', lang)}
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          {lang === 'ne' ? 'दर्ता' : 'Registration'}
        </h2>

        <div className="mt-3">
          {!user ? (
            // State 1 — not signed in.
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {lang === 'ne'
                  ? 'यस कार्यक्रममा दर्ता गर्न साइन इन गर्नुहोस्।'
                  : 'Sign in to register for this programme.'}
              </p>
              <Link
                href="/login"
                className="inline-block rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {lang === 'ne' ? 'साइन इन गर्नुहोस्' : 'Sign in'}
              </Link>
            </div>
          ) : registration ? (
            // State 2 — already registered. Shown whether or not registration
            // is still open: a resident who signed up is entitled to see what
            // the ward holds for them afterwards. Read from the stored row, so
            // this is the record itself, not an echo of the form.
            <div className="space-y-3">
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {lang === 'ne'
                  ? 'तपाईं दर्ता हुनुभएको छ।'
                  : 'You have registered for this programme.'}
              </p>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {lang === 'ne' ? 'पूरा नाम' : 'Full name'}
                  </dt>
                  <dd className="text-slate-900">{registration.full_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {lang === 'ne' ? 'फोन नम्बर' : 'Phone number'}
                  </dt>
                  <dd className="text-slate-900">{registration.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {lang === 'ne' ? 'इमेल' : 'Email address'}
                  </dt>
                  <dd className="text-slate-900">{registration.email}</dd>
                </div>
                {registration.note && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {lang === 'ne' ? 'थप जानकारी' : 'Note'}
                    </dt>
                    <dd className="whitespace-pre-line text-slate-900">
                      {registration.note}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : isOpen ? (
            // State 3 — signed in, not registered, registration open.
            <RegisterForm
              programId={program.id}
              lang={lang}
              defaultFullName={profile?.full_name ?? ''}
              defaultPhone={profile?.phone ?? ''}
              defaultEmail={user.email ?? ''}
            />
          ) : (
            // State 4 — signed in, not registered, registration shut. Name the
            // reason: "closed" alone leaves a resident wondering whether they
            // missed a date or the ward never opened signups.
            <p className="text-sm text-slate-600">
              {deadlinePassed
                ? lang === 'ne'
                  ? `दर्ताको अन्तिम मिति (${formatDateOnly(program.registration_deadline ?? '', lang)}) सकिएको छ।`
                  : `The registration deadline (${formatDateOnly(program.registration_deadline ?? '', lang)}) has passed.`
                : lang === 'ne'
                  ? 'यस कार्यक्रमको दर्ता हाल खुला छैन।'
                  : 'Registration for this programme is not open.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
