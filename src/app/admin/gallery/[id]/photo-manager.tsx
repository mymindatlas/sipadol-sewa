import { ConfirmSubmitButton } from '@/components/admin/confirm-submit-button'
import { CloudinaryImage } from '@/components/media/cloudinary-image'
import { createClient } from '@/lib/supabase/server'

import { deletePhoto, setCover, updatePhoto } from '../actions'
import { MultiPhotoUpload } from './multi-photo-upload'

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

type Props = {
  albumId: number
  /** So the grid can badge the photo that is currently the album's cover. */
  coverPhotoId: number | null
}

export async function PhotoManager({ albumId, coverPhotoId }: Props) {
  const supabase = await createClient()

  // Staff RLS — photos of a draft album are visible here regardless of the
  // album's publish state.
  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('id, photo_public_id, caption_ne, caption_en, display_order')
    .eq('album_id', albumId)
    .order('display_order', { ascending: true })

  const list = photos ?? []

  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold tracking-tight">
        Photos · तस्बिरहरू
      </h2>

      {/* Batch add. Captions are not collected here on purpose — they are
          authored per photo in the grid below, after the files land. */}
      <MultiPhotoUpload albumId={albumId} />

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          अझै फोटो छैन। माथिबाट पहिलो फोटो थप्नुहोस्। (No photos yet — add the
          first one above.)
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((photo) => {
            const isCover = photo.id === coverPhotoId
            return (
              <li
                key={photo.id}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="relative">
                  <CloudinaryImage
                    publicId={photo.photo_public_id}
                    alt={photo.caption_ne ?? photo.caption_en ?? 'Album photo'}
                    width={480}
                    className="h-44 w-full rounded-lg bg-slate-100 object-cover"
                  />
                  {isCover && (
                    <span className="absolute left-2 top-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Cover
                    </span>
                  )}
                </div>

                <form action={updatePhoto} className="space-y-3">
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="album_id" value={albumId} />

                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      क्याप्सन (Nepali)
                    </span>
                    <input
                      name="caption_ne"
                      defaultValue={photo.caption_ne ?? ''}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Caption (English)
                    </span>
                    <input
                      name="caption_en"
                      defaultValue={photo.caption_en ?? ''}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      Display order
                    </span>
                    <input
                      name="display_order"
                      type="number"
                      defaultValue={photo.display_order}
                      className={inputClass}
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Save
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  {isCover ? (
                    <span className="text-xs text-slate-500">
                      यो एल्बमको मुख्य फोटो हो।
                    </span>
                  ) : (
                    <form action={setCover}>
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="album_id" value={albumId} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Set as cover
                      </button>
                    </form>
                  )}

                  <form action={deletePhoto} className="ml-auto">
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="album_id" value={albumId} />
                    <ConfirmSubmitButton
                      message="Delete this photo? This cannot be undone."
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
