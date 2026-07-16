import Link from 'next/link'

// Admin landing (PRD §31). Modules arrive phase by phase — only Notices
// exists so far. No Users link yet (Admin-only, page not built); no
// Dashboard link ever — the Accountability Dashboard is a public page
// with nothing to configure (§8.6).
export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage the ward&apos;s public content and resident submissions.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/notices"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-400"
        >
          <h2 className="font-semibold text-slate-900">Notices · सूचना</h2>
          <p className="mt-1 text-xs text-slate-500">
            Publish ward notices, manage categories.
          </p>
        </Link>

        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-slate-400">
          <h2 className="text-sm font-semibold">Coming in later phases</h2>
          <p className="mt-1 text-xs">
            Gallery · Directory · Representatives · Programmes ·
            Applications · Complaints
          </p>
        </div>
      </section>
    </div>
  )
}
