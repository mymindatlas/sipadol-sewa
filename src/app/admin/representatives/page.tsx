import Link from 'next/link'

import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button'
import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { createClient } from '@/lib/supabase/server'

import { deleteRepresentative, toggleRepresentativeActive } from './actions'

// §32.4 — all representatives including inactive (staff RLS). Reads run as
// the signed-in staff user; "representatives_select_staff" is what makes
// inactive rows visible here.

export default async function AdminRepresentativesPage() {
  const supabase = await createClient()

  const { data: representatives } = await supabase
    .from('representatives')
    .select(
      'id, full_name_ne, full_name_en, role_ne, role_en, photo_public_id, display_order, is_active'
    )
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Representatives · जनप्रतिनिधि
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Shown on the public page in display order. Inactive rows are
            visible only here.
          </p>
        </div>
        <Link
          href="/admin/representatives/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          + New representative
        </Link>
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5">Order</th>
              <th className="px-3 py-2.5">Photo</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">State</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(representatives ?? []).map((rep) => (
              <tr key={rep.id} className="border-b border-slate-100">
                <td className="px-3 py-2.5 text-slate-600">
                  {rep.display_order}
                </td>
                <td className="px-3 py-2.5">
                  {rep.photo_public_id ? (
                    <CloudinaryImage
                      publicId={rep.photo_public_id}
                      alt={rep.full_name_en}
                      width={80}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                      —
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="block font-medium text-slate-900">
                    {rep.full_name_ne}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {rep.full_name_en}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{rep.role_ne}</td>
                <td className="px-3 py-2.5">
                  {rep.is_active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/representatives/${rep.id}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </Link>
                    <form action={toggleRepresentativeActive}>
                      <input type="hidden" name="id" value={rep.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {rep.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteRepresentative}>
                      <input type="hidden" name="id" value={rep.id} />
                      <ConfirmSubmitButton
                        message={`Delete "${rep.full_name_ne}"? This cannot be undone.`}
                        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(representatives ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No representatives yet. Add the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
