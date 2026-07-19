import { createProgram } from '../actions'
import { ProgramEditor } from '../program-editor'

export default function NewProgramPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">New programme</h1>
      <ProgramEditor action={createProgram} />
    </div>
  )
}
