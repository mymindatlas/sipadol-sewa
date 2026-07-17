'use client'

import { useActionState, useRef } from 'react'

import { SignedUpload } from '@/components/media/signed-upload'

import type { RepFormState } from './actions'

// Client-side mirror of the server's representative_photo constraints
// (src/lib/cloudinary.ts), used only for the local fast-fail and the file
// picker's accept list. The server re-checks all of this — this copy is UX,
// never the gate, so a drift here weakens nothing.
const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
const PHOTO_MAX_BYTES = 8 * 1024 * 1024

type RepInitial = {
  id: number
  full_name_ne: string
  full_name_en: string
  role_ne: string
  role_en: string
  bio_ne: string
  bio_en: string
  phone: string | null
  email: string | null
  photo_public_id: string | null
  display_order: number
  is_active: boolean
}

type Props = {
  action: (
    prevState: RepFormState,
    formData: FormData
  ) => Promise<RepFormState>
  /** Present when editing, absent when creating. */
  initial?: RepInitial
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

// §32.4 — both languages required, with the copy-from-Nepali convenience
// the notice editor established: draft in Nepali, copy across, translate in
// place rather than retyping the structure.
export function RepresentativeEditor({ action, initial }: Props) {
  const [state, formAction, isPending] = useActionState<RepFormState, FormData>(
    action,
    {}
  )

  const nameNeRef = useRef<HTMLInputElement>(null)
  const nameEnRef = useRef<HTMLInputElement>(null)
  const roleNeRef = useRef<HTMLInputElement>(null)
  const roleEnRef = useRef<HTMLInputElement>(null)
  const bioNeRef = useRef<HTMLTextAreaElement>(null)
  const bioEnRef = useRef<HTMLTextAreaElement>(null)

  function copyFromNepali() {
    if (nameEnRef.current && nameNeRef.current)
      nameEnRef.current.value = nameNeRef.current.value
    if (roleEnRef.current && roleNeRef.current)
      roleEnRef.current.value = roleNeRef.current.value
    if (bioEnRef.current && bioNeRef.current)
      bioEnRef.current.value = bioNeRef.current.value
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      {/* Photo — public delivery, signed upload (§10.3, Decision 7). */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">Photo · फोटो</h2>
        <SignedUpload
          purpose="representative_photo"
          formats={PHOTO_FORMATS}
          maxBytes={PHOTO_MAX_BYTES}
          value={initial?.photo_public_id}
          name="photo_public_id"
        />
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-700">नेपाली</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            नाम (Name, Nepali)
          </span>
          <input
            ref={nameNeRef}
            name="full_name_ne"
            defaultValue={initial?.full_name_ne}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            पद (Role, Nepali)
          </span>
          <input
            ref={roleNeRef}
            name="role_ne"
            defaultValue={initial?.role_ne}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            परिचय (Bio, Nepali)
          </span>
          <textarea
            ref={bioNeRef}
            name="bio_ne"
            defaultValue={initial?.bio_ne}
            required
            rows={4}
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
            Name (English)
          </span>
          <input
            ref={nameEnRef}
            name="full_name_en"
            defaultValue={initial?.full_name_en}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Role (English)
          </span>
          <input
            ref={roleEnRef}
            name="role_en"
            defaultValue={initial?.role_en}
            required
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Bio (English)
          </span>
          <textarea
            ref={bioEnRef}
            name="bio_en"
            defaultValue={initial?.bio_en}
            required
            rows={4}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Phone · फोन
          </span>
          <input
            name="phone"
            type="tel"
            defaultValue={initial?.phone ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Email · इमेल
          </span>
          <input
            name="email"
            type="email"
            defaultValue={initial?.email ?? ''}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Display order · क्रम
          </span>
          <input
            name="display_order"
            type="number"
            defaultValue={initial?.display_order ?? 0}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Lower numbers appear first — Chairperson before Members.
          </span>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial ? initial.is_active : true}
            className="h-4 w-4"
          />
          Active (shown on the public page)
        </label>
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
        {isPending
          ? 'Saving…'
          : initial
            ? 'Save changes'
            : 'Add representative'}
      </button>
    </form>
  )
}
