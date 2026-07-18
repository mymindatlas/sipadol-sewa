import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { updateAlbum } from '../actions'
import { AlbumEditor } from '../album-editor'
import { PhotoManager } from './photo-manager'

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const albumId = Number(id)
  if (!Number.isInteger(albumId)) notFound()

  const supabase = await createClient()
  const { data: album } = await supabase
    .from('gallery_albums')
    .select(
      'id, year_bs, slug, title_ne, title_en, display_order, is_published, cover_photo_id'
    )
    .eq('id', albumId)
    .maybeSingle()

  if (!album) notFound()

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <header>
          <h1 className="text-xl font-bold tracking-tight">Edit album</h1>
          {/* The slug stays editable so a typo can be corrected — but it is
              the album's public address, so say what changing it costs. Noted
              here rather than in AlbumEditor, which is shared with /new where
              there is no address to break yet. */}
          <p className="mt-1 text-sm text-slate-600">
            ठेगाना परिवर्तन गर्दा वेब ठेगाना पनि बदलिन्छ। (Changing the slug
            changes the album&rsquo;s web address.)
          </p>
        </header>
        <AlbumEditor action={updateAlbum} initial={album} />
      </div>

      <PhotoManager albumId={album.id} coverPhotoId={album.cover_photo_id} />
    </div>
  )
}
