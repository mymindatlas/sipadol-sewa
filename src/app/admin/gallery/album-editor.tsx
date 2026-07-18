'use client'

import { useActionState, useRef } from 'react'

import type { AlbumFormState } from './actions'

type AlbumInitial = {
  id: number
  year_bs: number
  slug: string
  title_ne: string
  title_en: string
  display_order: number
  is_published: boolean
}

type Props = {
  action: (
    prevState: AlbumFormState,
    formData: FormData
  ) => Promise<AlbumFormState>
  /** Present when editing, absent when creating. */
  initial?: AlbumInitial
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

// §32.2 — album metadata only. No photo upload here by design: photos and
// the cover are managed after creation, on the album's own page, because
// §32.2 uploads one photo at a time and an album must exist to hold them.
export function AlbumEditor({ action, initial }: Props) {
  const [state, formAction, isPending] = useActionState<
    AlbumFormState,
    FormData
  >(action, {})

  const titleNeRef = useRef<HTMLInputElement>(null)
  const titleEnRef = useRef<HTMLInputElement>(null)

  function copyFromNepali() {
    if (titleEnRef.current && titleNeRef.current)
      titleEnRef.current.value = titleNeRef.current.value
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

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
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Year (BS) · वर्ष
          </span>
          <input
            name="year_bs"
            type="number"
            defaultValue={initial?.year_bs}
            required
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Bikram Sambat year, e.g. 2082
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Slug · ठेगाना
          </span>
          <input
            name="slug"
            defaultValue={initial?.slug}
            required
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            lowercase ASCII used in the web address, e.g. dashain-2082
          </span>
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
            Lower numbers appear first within the same year.
          </span>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={initial ? initial.is_published : false}
            className="h-4 w-4"
          />
          Published (visible to the public)
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
        {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add album'}
      </button>
    </form>
  )
}
