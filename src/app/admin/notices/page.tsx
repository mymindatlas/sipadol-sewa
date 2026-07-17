import Link from 'next/link'

import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button'
import { formatDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

import { deleteNotice, toggleNoticePublished } from './actions'
import { CategoryManager } from './category-manager'

// §32.1 — all notices including drafts (staff RLS), publish/unpublish,
// category management on the same page. Reads run as the signed-in staff
// user; the "notices_select_staff" policy is what makes drafts visible.

export default async function AdminNoticesPage() {
  const supabase = await createClient()

  const [{ data: notices }, { data: categories }] = await Promise.all([
    supabase
      .from('notices')
      .select(
        'id, title_ne, title_en, is_published, published_at, created_at, notice_categories(name_ne, name_en)'
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('notice_categories')
      .select('id, name_ne, name_en, display_order, is_active')
      .order('display_order', { ascending: true }),
  ])

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Notices · सूचना
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Drafts are visible only here until published.
          </p>
        </div>
        <Link
          href="/admin/notices/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + New notice
        </Link>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">State</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(notices ?? []).map((notice) => (
              <tr key={notice.id} className="border-b border-slate-100">
                <td className="max-w-xs px-3 py-2.5">
                  <span className="block truncate font-medium text-slate-900">
                    {notice.title_ne}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {notice.title_en}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {notice.notice_categories?.name_ne ?? '—'}
                </td>
                <td className="px-3 py-2.5">
                  {notice.is_published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {formatDate(notice.published_at ?? notice.created_at, 'en')}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/notices/${notice.id}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                    <form action={toggleNoticePublished}>
                      <input type="hidden" name="id" value={notice.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {notice.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </form>
                    <form action={deleteNotice}>
                      <input type="hidden" name="id" value={notice.id} />
                      <ConfirmSubmitButton
                        message={`Delete "${notice.title_ne}"? This cannot be undone.`}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(notices ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No notices yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <CategoryManager categories={categories ?? []} />
    </div>
  )
}
