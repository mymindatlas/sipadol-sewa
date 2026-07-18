import Link from 'next/link'

import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button'
import { createClient } from '@/lib/supabase/server'

import { deleteAlbum, toggleAlbumPublished } from './actions'

// §32.2 — all albums including drafts (staff RLS). Reads run as the
// signed-in staff user; "gallery_albums_select_staff" is what makes
// unpublished rows visible here.

export default async function AdminGalleryPage() {
  const supabase = await createClient()

  const { data: albums } = await supabase
    .from('gallery_albums')
    .select(
      'id, year_bs, slug, title_ne, title_en, display_order, is_published'
    )
    .order('year_bs', { ascending: false })
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Gallery · ग्यालरी
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Newest year first. Draft albums are visible only here.
          </p>
        </div>
        <Link
          href="/admin/gallery/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + New album
        </Link>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Year (BS)</th>
              <th className="px-3 py-2.5">Slug</th>
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">State</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(albums ?? []).map((album) => (
              <tr key={album.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-slate-600">{album.year_bs}</td>
                <td className="px-3 py-2.5 text-slate-600">{album.slug}</td>
                <td className="px-3 py-2.5">
                  <span className="block font-medium text-slate-900">
                    {album.title_ne}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {album.title_en}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {album.is_published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/gallery/${album.id}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                    <form action={toggleAlbumPublished}>
                      <input type="hidden" name="id" value={album.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {album.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </form>
                    <form action={deleteAlbum}>
                      <input type="hidden" name="id" value={album.id} />
                      <ConfirmSubmitButton
                        message={`Delete "${album.title_ne}"? This cannot be undone.`}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(albums ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No albums yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
