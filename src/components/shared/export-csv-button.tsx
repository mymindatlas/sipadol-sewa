'use client'

// §10.7 — export is the on-screen data saved as a file, nothing more. The CSV
// text is built on the server and arrives as a prop, so there is no export
// endpoint to secure separately: whatever RLS already allowed the staff member
// to READ is exactly what this can save. A dedicated /export route would be a
// second door onto the same rows, needing its own authorisation to get right.

type Props = {
  /** Suggested name for the saved file, including the .csv extension. */
  filename: string
  /** Complete CSV text, BOM included — see lib/csv.ts. */
  csv: string
  label?: string
}

export function ExportCsvButton({ filename, csv, label }: Props) {
  function download() {
    // charset=utf-8 alongside the BOM the CSV already carries: the header
    // covers browsers that respect it, the BOM covers Excel, which does not.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    // The object URL pins the blob in memory until revoked, and a staff
    // member exporting repeatedly would otherwise accumulate copies.
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {label ?? 'CSV निर्यात · Export CSV'}
    </button>
  )
}
