import type { Lang } from '@/lib/i18n'

// §11 — the emergency block. Hardcoded rather than table-backed on purpose:
// these are fixed ward facts, not staff-authored content, and a resident
// reaching for this card during an emergency should never be one failed
// database round-trip away from an ambulance number. If the ward ever needs
// to edit these without a deploy, that is a table and an admin screen — a
// deliberate decision, not a default.

type ContactNumber = {
  /** Which station/branch this number reaches, when a card lists more than one. */
  note_ne?: string
  note_en?: string
  tel: string
}

type EmergencyContact = {
  icon: string
  label_ne: string
  label_en: string
  /** Who answers — shown once above the numbers when they share a provider. */
  provider_ne?: string
  provider_en?: string
  /** First entry is the primary number and is rendered prominently. */
  numbers: ContactNumber[]
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    icon: '🏛️',
    label_ne: 'वडा कार्यालय',
    label_en: 'Ward Office',
    numbers: [{ tel: '01-5157033' }],
  },
  {
    icon: '🚓',
    label_ne: 'प्रहरी',
    label_en: 'Police',
    numbers: [
      { note_ne: 'डोलेश्वर', note_en: 'Doleshwor', tel: '01-5920590' },
      { note_ne: 'जगाती', note_en: 'Jagati', tel: '01-6612203' },
    ],
  },
  {
    icon: '🚑',
    label_ne: 'एम्बुलेन्स',
    label_en: 'Ambulance',
    provider_ne: 'भक्तपुर रेडक्रस',
    provider_en: 'Bhaktapur Red Cross',
    numbers: [{ tel: '01-6612266' }, { tel: '9841489408' }],
  },
  {
    icon: '🚒',
    label_ne: 'दमकल',
    label_en: 'Fire Brigade',
    provider_ne: 'भक्तपुर',
    provider_en: 'Bhaktapur',
    numbers: [{ tel: '01-6610798' }, { tel: '01-6610049' }],
  },
  {
    icon: '🏥',
    label_ne: 'अस्पताल',
    label_en: 'Hospital',
    provider_ne: 'सूर्यविनायक नगर अस्पताल',
    provider_en: 'Suryabinayak Municipal Hospital',
    numbers: [{ tel: '01-6618946' }],
  },
  {
    icon: '🩺',
    label_ne: 'स्वास्थ्य चौकी',
    label_en: 'Health Post',
    provider_ne: 'सिपाडोल स्वास्थ्य चौकी',
    provider_en: 'Sipadol Health Post',
    numbers: [{ tel: '9841394658' }],
  },
]

/**
 * tel: wants digits. The displayed number keeps its hyphens because that is
 * how the ward writes them and how a resident checks they dialled the right
 * one; the href strips them so the dialler is never handed a character it
 * has to guess about.
 */
function telHref(tel: string): string {
  return `tel:${tel.replace(/[^\d+]/g, '')}`
}

export function EmergencyContacts({ lang }: { lang: Lang }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {EMERGENCY_CONTACTS.map((contact) => {
        const label = lang === 'ne' ? contact.label_ne : contact.label_en
        const secondary = lang === 'ne' ? contact.label_en : contact.label_ne
        const provider =
          lang === 'ne' ? contact.provider_ne : contact.provider_en
        const [primary, ...alternates] = contact.numbers

        return (
          <li
            key={contact.label_en}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-red-200"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="text-2xl leading-none">
                {contact.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight text-slate-900">
                  {label}
                </p>
                <p className="text-xs text-slate-500">{secondary}</p>

                {provider && (
                  <p className="mt-1 text-xs text-slate-500">{provider}</p>
                )}

                {/* The primary number is the one thing on this card that has
                    to be findable at a glance and hittable with a thumb. */}
                <a
                  href={telHref(primary.tel)}
                  className="mt-2 block text-lg font-bold tracking-tight text-red-700 hover:underline"
                >
                  {primary.tel}
                </a>
                {(primary.note_ne || primary.note_en) && (
                  <p className="text-xs text-slate-500">
                    {lang === 'ne' ? primary.note_ne : primary.note_en}
                  </p>
                )}

                {alternates.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
                    {alternates.map((alternate) => (
                      <a
                        key={alternate.tel}
                        href={telHref(alternate.tel)}
                        className="block text-sm text-slate-600 hover:text-red-700 hover:underline"
                      >
                        {alternate.tel}
                        {(alternate.note_ne || alternate.note_en) && (
                          <span className="ml-1 text-xs text-slate-400">
                            ·{' '}
                            {lang === 'ne'
                              ? alternate.note_ne
                              : alternate.note_en}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
