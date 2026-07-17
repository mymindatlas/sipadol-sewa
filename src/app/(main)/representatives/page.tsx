import type { Metadata } from 'next'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

// §20 — public, read-only. The query asks for active rows in display order;
// the "representatives_select_active" RLS policy is what actually excludes
// inactive rows, for every caller, regardless of what the page asks.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'जनप्रतिनिधि' : 'Representatives',
    description:
      lang === 'ne'
        ? 'वडा नं. ८ का जनप्रतिनिधि तथा कर्मचारीहरू र सम्पर्क विवरण।'
        : 'Elected representatives and staff of Ward No. 8, with contact details.',
    path: '/representatives',
  })
}

export default async function RepresentativesPage() {
  const lang = await getLang()
  const supabase = await createClient()

  const { data: representatives } = await supabase
    .from('representatives')
    .select(
      'id, full_name_ne, full_name_en, role_ne, role_en, bio_ne, bio_en, phone, email, photo_public_id'
    )
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const reps = representatives ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {lang === 'ne' ? 'जनप्रतिनिधि' : 'Representatives'}
      </h1>

      {reps.length === 0 ? (
        <p className="text-sm text-slate-500">
          {lang === 'ne'
            ? 'हाल कुनै विवरण उपलब्ध छैन।'
            : 'No representatives listed at the moment.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reps.map((rep) => {
            const name = localized(rep, 'full_name', lang)
            const role = localized(rep, 'role', lang)
            const bio = localized(rep, 'bio', lang)
            return (
              <li
                key={rep.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  {rep.photo_public_id ? (
                    <CloudinaryImage
                      publicId={rep.photo_public_id}
                      alt={name}
                      width={128}
                      className="h-16 w-16 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-400"
                    >
                      {name.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="text-sm text-blue-800">{role}</p>
                  </div>
                </div>

                {bio && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {bio}
                  </p>
                )}

                {(rep.phone || rep.email) && (
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
                    {rep.phone && (
                      <a
                        href={`tel:${rep.phone}`}
                        className="block font-medium text-blue-700 hover:underline"
                      >
                        📞 {rep.phone}
                      </a>
                    )}
                    {rep.email && (
                      <a
                        href={`mailto:${rep.email}`}
                        className="block break-all text-slate-600 hover:underline"
                      >
                        ✉️ {rep.email}
                      </a>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
