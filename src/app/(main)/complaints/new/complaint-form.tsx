'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { Lang } from '@/lib/i18n'

import { submitComplaint, type ComplaintState } from './actions'

// §26 — the resident-facing half of the complaint flow. A client component
// only because useActionState needs one; it holds no rule about who may file
// or what lands. The page decides whether to render this at all, and the
// insert policy (own row + 3/hr rate limit) decides whether the row lands.

const initialState: ComplaintState = { success: false }

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100'

type Category = {
  id: number
  name_ne: string
  name_en: string
}

type Props = {
  lang: Lang
  categories: Category[]
}

export function ComplaintForm({ lang, categories }: Props) {
  const [state, formAction, isPending] = useActionState(
    submitComplaint,
    initialState
  )

  // Success — hide the form entirely and show the ticket number. This is what
  // the resident must save; it is how they track the complaint (§27, tracker).
  if (state.success) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">
          {lang === 'ne'
            ? 'तपाईंको गुनासो दर्ता भयो।'
            : 'Your complaint has been submitted.'}
        </p>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            {lang === 'ne' ? 'तपाईंको सन्दर्भ नम्बर' : 'Your reference number'}
          </p>
          <p className="select-all font-mono text-2xl font-bold tracking-tight text-emerald-900">
            {state.ticketId}
          </p>
        </div>

        <p className="text-sm text-emerald-800">
          {lang === 'ne'
            ? 'कृपया यो नम्बर सुरक्षित राख्नुहोस् — यसैले तपाईं आफ्नो गुनासो ट्र्याक गर्न सक्नुहुन्छ।'
            : 'Please save it — you can track your complaint with it.'}
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/complaints/my-complaints"
            className="inline-block rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            {lang === 'ne' ? 'मेरा गुनासोहरू' : 'My complaints'}
          </Link>
          <Link
            href="/complaints/tracker"
            className="inline-block rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {lang === 'ne' ? 'गुनासो ट्र्याकर' : 'Complaint tracker'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* §26.2 — the two consent notices, shown plainly BEFORE the fields so a
          resident reads them before typing anything, not after. */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          {lang === 'ne'
            ? 'तपाईंको नाम सार्वजनिक ट्र्याकरमा देखिने छैन। वडा कर्मचारी र तपाईंको आफ्नै खाताले सधैं यो गुनासो कसले पठायो भन्ने देख्न सक्नेछन्।'
            : 'Your name will not appear on the public tracker. Ward staff and your own account will always be able to see who filed this complaint.'}
        </p>
        <p>
          {lang === 'ne'
            ? 'वडा कर्मचारीले व्यक्तिगत विवरणका लागि समीक्षा गरेपछि तपाईंको गुनासो सार्वजनिक ट्र्याकरमा देखिनेछ। तपाईंले पठाएको क्षणदेखि नै यसको स्थिति सार्वजनिक ड्यासबोर्डमा गनिन्छ।'
            : 'Your complaint will appear on the public tracker after ward staff review it for personal information. Its status is counted on the public dashboard from the moment you submit.'}
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="category_id"
          className="text-sm font-medium text-slate-700"
        >
          {lang === 'ne' ? 'विषय' : 'Category'}
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue=""
          required
          className={inputClass}
        >
          <option value="" disabled>
            {lang === 'ne' ? 'विषय छान्नुहोस्…' : 'Choose a category…'}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {lang === 'ne' ? category.name_ne : category.name_en}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-slate-700"
        >
          {lang === 'ne' ? 'विवरण' : 'Description'}
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="location_text"
          className="text-sm font-medium text-slate-700"
        >
          {lang === 'ne' ? 'स्थान वा टोलको नाम' : 'Location or tole name'}
        </label>
        <input
          id="location_text"
          name="location_text"
          type="text"
          required
          className={inputClass}
        />
        <p className="text-xs text-slate-500">
          {lang === 'ne'
            ? 'अनुमानित स्थान भए पनि हुन्छ।'
            : 'An approximate location is fine.'}
        </p>
      </div>

      {/* TODO: optional private photo upload — wire after complaint_photo
          preset is added. Uploads are signed (purpose → private delivery) and
          the returned public_id goes to complaints.photo_file. Not built yet. */}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400 sm:w-auto"
      >
        {isPending
          ? lang === 'ne'
            ? 'दर्ता हुँदै…'
            : 'Submitting…'
          : lang === 'ne'
            ? 'गुनासो दर्ता गर्नुहोस्'
            : 'Submit complaint'}
      </button>
    </form>
  )
}
