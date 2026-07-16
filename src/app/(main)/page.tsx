import { getLang } from '@/lib/i18n'

// Placeholder — the real homepage (PRD §11: latest notices, current
// programmes, representatives preview, emergency contacts) is a separate
// later task. This page only proves the shell renders around content.

export default async function HomePage() {
  const lang = await getLang()

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        {lang === 'ne'
          ? 'सिपादोल सेवामा स्वागत छ'
          : 'Welcome to Sipadol Sewa'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {lang === 'ne'
          ? 'वडा नं. ८, सूर्यविनायक नगरपालिकाको आधिकारिक सेवा पोर्टल। सूचना, सेवा फारम, गुनासो र कार्यक्रमहरू चाँडै उपलब्ध हुनेछन्।'
          : 'The official service portal of Ward No. 8, Suryabinayak Municipality. Notices, service forms, complaints, and programmes are coming soon.'}
      </p>
    </section>
  )
}
