'use client'

import Link from 'next/link'
import { useState } from 'react'

// §15.3 — the category filter works on the already-loaded list. No
// modals, no refetch. Rows arrive pre-localized and pre-formatted from
// the server component.

export type NoticeListItem = {
  id: number
  title: string
  categoryId: number
  categoryName: string
  dateLabel: string
}

type Props = {
  items: NoticeListItem[]
  allLabel: string
  emptyLabel: string
}

export function NoticeList({ items, allLabel, emptyLabel }: Props) {
  const [activeCategory, setActiveCategory] = useState<number | null>(null)

  // Filter options come from the notices on screen, so no empty filters.
  const categories = [
    ...new Map(
      items.map((item) => [item.categoryId, item.categoryName])
    ).entries(),
  ]

  const visible =
    activeCategory === null
      ? items
      : items.filter((item) => item.categoryId === activeCategory)

  return (
    <div className="space-y-4">
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterPill
            label={allLabel}
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map(([id, name]) => (
            <FilterPill
              key={id}
              label={name}
              active={activeCategory === id}
              onClick={() => setActiveCategory(id)}
            />
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Link
              href={`/notices/${item.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400"
            >
              <h2 className="font-semibold leading-snug text-slate-900">
                {item.title}
              </h2>
              <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                <span className="font-medium text-blue-800">
                  {item.categoryName}
                </span>
                <span>{item.dateLabel}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {emptyLabel}
        </p>
      )}
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? 'bg-blue-700 text-white'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )
}
