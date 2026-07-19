'use client'

import { useActionState, useRef } from 'react'

import { SignedUpload } from '@/components/media/signed-upload'

import type { ProgramFormState } from './actions'

// Client-side mirror of the server's gallery_photo constraints
// (src/lib/cloudinary.ts), used only for the local fast-fail and the file
// picker's accept list. The server re-checks all of this — this copy is UX,
// never the gate, so a drift here weakens nothing.
const BANNER_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
const BANNER_MAX_BYTES = 8 * 1024 * 1024

type ProgramInitial = {
  id: number
  title_ne: string
  title_en: string
  description_ne: string
  description_en: string
  start_date: string
  end_date: string | null
  registration_deadline: string | null
  registration_open: boolean
  is_published: boolean
  banner_public_id: string | null
}

type Props = {
  action: (
    prevState: ProgramFormState,
    formData: FormData
  ) => Promise<ProgramFormState>
  /** Present when editing, absent when creating. */
  initial?: ProgramInitial
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

// §32.5 — both languages required, with the copy-from-Nepali convenience the
// notice editor established: draft in Nepali, copy across, translate in place
// rather than retyping the structure.
export function ProgramEditor({ action, initial }: Props) {
  const [state, formAction, isPending] = useActionState<
    ProgramFormState,
    FormData
  >(action, {})

  const titleNeRef = useRef<HTMLInputElement>(null)
  const titleEnRef = useRef<HTMLInputElement>(null)
  const descNeRef = useRef<HTMLTextAreaElement>(null)
  const descEnRef = useRef<HTMLTextAreaElement>(null)

  function copyFromNepali() {
    if (titleEnRef.current && titleNeRef.current) {
      titleEnRef.current.value = titleNeRef.current.value
    }
    if (descEnRef.current && descNeRef.current) {
      descEnRef.current.value = descNeRef.current.value
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      {/* Banner — a public image, so it reuses the existing public-image
          purpose rather than introducing a new one (§10.3, Decision 7). */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">Banner · ब्यानर</h2>
        <SignedUpload
          purpose="program_banner"
          formats={BANNER_FORMATS}
          maxBytes={BANNER_MAX_BYTES}
          value={initial?.banner_public_id}
          name="banner_public_id"
        />
        <p className="text-xs text-slate-500">
          ब्यानर वैकल्पिक हो — पछि थप्न सकिन्छ। (Optional: a programme can be
          announced before its banner is ready.)
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">नेपाली</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            शीर्षक (Title, Nepali)
          </span>
          <input
            ref={titleNeRef}
            name="title_ne"
            defaultValue={initial?.title_ne}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            विवरण (Description, Nepali)
          </span>
          <textarea
            ref={descNeRef}
            name="description_ne"
            defaultValue={initial?.description_ne}
            required
            rows={8}
            className={inputClass}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-700">English</h2>
          <button
            type="button"
            onClick={copyFromNepali}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Copy from Nepali ↓ translate in place
          </button>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Title (English)
          </span>
          <input
            ref={titleEnRef}
            name="title_en"
            defaultValue={initial?.title_en}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Description (English)
          </span>
          <textarea
            ref={descEnRef}
            name="description_en"
            defaultValue={initial?.description_en}
            required
            rows={8}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Start date · सुरु मिति
          </span>
          <input
            name="start_date"
            type="date"
            defaultValue={initial?.start_date}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            End date · अन्त्य मिति
          </span>
          <input
            name="end_date"
            type="date"
            defaultValue={initial?.end_date ?? ''}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Leave empty for a single-day programme.
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Registration deadline · दर्ता अन्तिम मिति
          </span>
          <input
            name="registration_deadline"
            type="date"
            defaultValue={initial?.registration_deadline ?? ''}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            अन्तिम मिति — यसपछि दर्ता बन्द हुन्छ। (After this date, registration
            closes.)
          </span>
        </label>
        <div className="space-y-2 self-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="registration_open"
              defaultChecked={initial ? initial.registration_open : false}
              className="h-4 w-4"
            />
            दर्ता खुला (Registration open)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={initial ? initial.is_published : false}
              className="h-4 w-4"
            />
            Published (visible to the public)
          </label>
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add programme'}
      </button>
    </form>
  )
}
