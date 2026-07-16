'use client'

import { useActionState, useRef } from 'react'

import type { NoticeFormState } from './actions'

type Category = {
  id: number
  name_ne: string
  name_en: string
  is_active: boolean
}

type NoticeInitial = {
  id: number
  title_ne: string
  title_en: string
  body_ne: string
  body_en: string
  category_id: number
}

type Props = {
  action: (
    prevState: NoticeFormState,
    formData: FormData
  ) => Promise<NoticeFormState>
  categories: Category[]
  /** Present when editing, absent when creating. */
  initial?: NoticeInitial
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

// §32.1 — both languages are required, with a copy-from-Nepali
// convenience: staff draft in Nepali, copy it across, then translate in
// place instead of retyping the structure.
export function NoticeEditor({ action, categories, initial }: Props) {
  const [state, formAction, isPending] = useActionState<
    NoticeFormState,
    FormData
  >(action, {})

  const titleNeRef = useRef<HTMLInputElement>(null)
  const titleEnRef = useRef<HTMLInputElement>(null)
  const bodyNeRef = useRef<HTMLTextAreaElement>(null)
  const bodyEnRef = useRef<HTMLTextAreaElement>(null)

  function copyFromNepali() {
    if (titleEnRef.current && titleNeRef.current) {
      titleEnRef.current.value = titleNeRef.current.value
    }
    if (bodyEnRef.current && bodyNeRef.current) {
      bodyEnRef.current.value = bodyNeRef.current.value
    }
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
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            विवरण (Body, Nepali)
          </span>
          <textarea
            ref={bodyNeRef}
            name="body_ne"
            defaultValue={initial?.body_ne}
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
            Body (English)
          </span>
          <textarea
            ref={bodyEnRef}
            name="body_en"
            defaultValue={initial?.body_en}
            required
            rows={8}
            className={inputClass}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Category · वर्ग
          </span>
          <select
            name="category_id"
            defaultValue={initial?.category_id ?? ''}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories
              .filter((c) => c.is_active || c.id === initial?.category_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ne} · {c.name_en}
                </option>
              ))}
          </select>
        </label>

        {!initial && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="publish_now" className="h-4 w-4" />
            Publish immediately (otherwise saved as a draft)
          </label>
        )}
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
        {isPending ? 'Saving…' : initial ? 'Save changes' : 'Create notice'}
      </button>
    </form>
  )
}
