import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { formatDate } from '@/lib/dates'
import { getLang, localized, type Lang } from '@/lib/i18n'
import { buildMetadata, siteUrl } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

// §16 — public notice detail. The .eq('is_published', true) keeps the
// page honest even for a staff session (whose RLS would let drafts
// through); for everyone else the RLS policy already excludes drafts, so
// an unpublished id is indistinguishable from a nonexistent one: 404.

type NoticeRow = {
  id: number
  title_ne: string
  title_en: string
  body_ne: string
  body_en: string
  published_at: string | null
  notice_categories: { name_ne: string; name_en: string } | null
}

// cache() dedupes between generateMetadata and the page render.
const getNotice = cache(async (id: string): Promise<NoticeRow | null> => {
  const noticeId = Number(id)
  if (!Number.isInteger(noticeId) || noticeId <= 0) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('notices')
    .select(
      'id, title_ne, title_en, body_ne, body_en, published_at, notice_categories(name_ne, name_en)'
    )
    .eq('id', noticeId)
    .eq('is_published', true)
    .maybeSingle<NoticeRow>()

  return data
})

function excerpt(body: string, length = 160): string {
  const flattened = body.replace(/\s+/g, ' ').trim()
  return flattened.length <= length
    ? flattened
    : `${flattened.slice(0, length - 1)}…`
}

type Props = { params: Promise<{ id: string }> }

// §10.5 — a notice shared into WhatsApp must render a preview card
// (title + excerpt), not a bare link.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [notice, lang] = await Promise.all([getNotice(id), getLang()])
  if (!notice) return buildMetadata()

  return buildMetadata({
    title: localized(notice, 'title', lang),
    description: excerpt(localized(notice, 'body', lang)),
    path: `/notices/${notice.id}`,
  })
}

export default async function NoticeDetailPage({ params }: Props) {
  const { id } = await params
  const [notice, lang] = await Promise.all([getNotice(id), getLang()])
  if (!notice) notFound()

  const otherLang: Lang = lang === 'ne' ? 'en' : 'ne'
  const title = localized(notice, 'title', lang)
  const pageUrl = new URL(`/notices/${notice.id}`, siteUrl()).toString()
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`${title} — ${pageUrl}`)}`

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <p className="flex flex-wrap gap-x-3 text-xs text-slate-500">
          {notice.notice_categories && (
            <span className="font-medium text-blue-800">
              {localized(notice.notice_categories, 'name', lang)}
            </span>
          )}
          {notice.published_at && (
            <span>{formatDate(notice.published_at, lang)}</span>
          )}
        </p>
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-slate-900">
          {title}
        </h1>
      </header>

      <a
        href={shareHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {lang === 'ne' ? 'WhatsApp मा साझा गर्नुहोस्' : 'Share on WhatsApp'}
      </a>

      <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800">
        {localized(notice, 'body', lang)}
      </div>

      {/* §16 — the detail page carries the FULL bilingual notice: the
          other language follows, so a shared link reads for everyone. */}
      <section className="space-y-2 border-t border-slate-200 pt-5">
        <h2 className="text-lg font-bold leading-snug text-slate-700">
          {localized(notice, 'title', otherLang)}
        </h2>
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {localized(notice, 'body', otherLang)}
        </div>
      </section>
    </article>
  )
}
