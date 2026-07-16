'use client'

import { useActionState } from 'react'

import {
  createCategory,
  moveCategory,
  updateCategory,
  type CategoryFormState,
} from './actions'

type Category = {
  id: number
  name_ne: string
  name_en: string
  display_order: number
  is_active: boolean
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none'

// §32.1 — categories are managed in a small interface on the notices
// page. Add, edit, reorder; retire with the active flag. No delete —
// existing notices reference these rows.
export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-800">
        Categories · वर्गहरू
      </h2>

      <ul className="space-y-2">
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
          />
        ))}
      </ul>

      <AddCategoryForm />
    </section>
  )
}

function CategoryRow({
  category,
  isFirst,
  isLast,
}: {
  category: Category
  isFirst: boolean
  isLast: boolean
}) {
  const [state, formAction, isPending] = useActionState<
    CategoryFormState,
    FormData
  >(updateCategory, {})

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-2">
        <form action={formAction} className="flex grow flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={category.id} />
          <label className="grow basis-40 text-xs text-slate-600">
            नाम (ne)
            <input
              name="name_ne"
              defaultValue={category.name_ne}
              required
              className={inputClass}
            />
          </label>
          <label className="grow basis-40 text-xs text-slate-600">
            Name (en)
            <input
              name="name_en"
              defaultValue={category.name_en}
              required
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-1.5 pb-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={category.is_active}
              className="h-4 w-4"
            />
            Active
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Save
          </button>
        </form>

        <div className="flex gap-1">
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              aria-label="Move up"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              ↑
            </button>
          </form>
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              aria-label="Move down"
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              ↓
            </button>
          </form>
        </div>
      </div>

      {state.error && (
        <p className="mt-2 text-xs text-red-700">{state.error}</p>
      )}
    </li>
  )
}

function AddCategoryForm() {
  const [state, formAction, isPending] = useActionState<
    CategoryFormState,
    FormData
  >(createCategory, {})

  return (
    <form
      action={formAction}
      className="rounded-lg border border-dashed border-slate-300 p-3"
    >
      <p className="mb-2 text-xs font-semibold text-slate-600">
        Add a category
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grow basis-40 text-xs text-slate-600">
          नाम (ne)
          <input name="name_ne" required className={inputClass} />
        </label>
        <label className="grow basis-40 text-xs text-slate-600">
          Name (en)
          <input name="name_en" required className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-xs text-red-700">{state.error}</p>
      )}
    </form>
  )
}
