import { getLang, type Lang } from '@/lib/i18n'

const STRINGS = {
  office: {
    ne: 'वडा कार्यालय, वडा नं. ८',
    en: 'Ward Office, Ward No. 8',
  },
  municipality: {
    ne: 'सूर्यविनायक नगरपालिका, भक्तपुर',
    en: 'Suryabinayak Municipality, Bhaktapur',
  },
  tagline: {
    ne: 'सिपादोल सेवा — तपाईंको वडा, तपाईंको सेवा',
    en: 'Sipadol Sewa — your ward, your services',
  },
} satisfies Record<string, Record<Lang, string>>

export async function SiteFooter() {
  const lang = await getLang()

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-1 px-4 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">{STRINGS.office[lang]}</p>
        <p>{STRINGS.municipality[lang]}</p>
        <p className="pt-2">{STRINGS.tagline[lang]}</p>
      </div>
    </footer>
  )
}
