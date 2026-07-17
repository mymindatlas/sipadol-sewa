import { createRepresentative } from '../actions'
import { RepresentativeEditor } from '../representative-editor'

export default function NewRepresentativePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">New representative</h1>
      <RepresentativeEditor action={createRepresentative} />
    </div>
  )
}
