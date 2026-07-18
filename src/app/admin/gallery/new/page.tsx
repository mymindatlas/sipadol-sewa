import { createAlbum } from '../actions'
import { AlbumEditor } from '../album-editor'

export default function NewAlbumPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">New album</h1>
      <AlbumEditor action={createAlbum} />
    </div>
  )
}
