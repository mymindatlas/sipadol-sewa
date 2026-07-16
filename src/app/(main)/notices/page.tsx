import type { Metadata } from 'next'

import { formatDate } from '@/lib/dates'
import { getLang, localized } from '@/lib/i18n'
import { buildMetadata } from '@/lib/metadata'
import { createClient } from '@/lib/supabase/server'

import { NoticeList, type NoticeListItem } from './notice-list'

// §15 — public notice board. The query asks for published rows; the RLS
// policy "notices_select_published" is what actually guarantees drafts
// are excluded, for every caller, regardless of what any page asks for.

type NoticeRow = {
  id: number
  title_ne: string
  title_en: string
  published_at: string | null
  category_id: number
  notice_categories: { name_ne: string; name_en: string } | null
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return buildMetadata({
    title: lang === 'ne' ? 'सूचना' : 'Notices',
    description:
      lang === 'ne'
        ? 'वडा नं. ८ का आधिकारिक सूचनाहरू।'
        : 'Official notices from Ward No. 8.',
    path: '/notices',
  })
}

export default async function NoticesPage() {
  const lang = await getLang()
  const supabase = await createClient()

  const { data: notices } = await supabase
    .from('notices')
    .select(
      'id, title_ne, title_en, published_at, category_id, notice_categories(name_ne, name_en)'
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .returns<NoticeRow[]>()

  const items: NoticeListItem[] = (notices ?? []).map((notice) => ({
    id: notice.id,
    title: localized(notice, 'title', lang),
    categoryId: notice.category_id,
    categoryName: notice.notice_categories
      ? localized(notice.notice_categories, 'name', lang)
      : '',
    dateLabel: notice.published_at
      ? formatDate(notice.published_at, lang)
      : '',
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {lang === 'ne' ? 'सूचना' : 'Notices'}
      </h1>
      <NoticeList
        items={items}
        allLabel={lang === 'ne' ? 'सबै' : 'All'}
        emptyLabel={
          lang === 'ne'
            ? 'हाल कुनै सूचना छैन।'
            : 'No notices at the moment.'
        }
      />
    </div>
  )
}
