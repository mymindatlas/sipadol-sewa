import type { Metadata } from 'next'

// PRD §10.5 — every public page carries Open Graph tags so a notice shared
// into WhatsApp renders as an official-looking preview card (title,
// description, image) instead of a bare link. Pages with their own image
// (a notice attachment, a gallery cover) pass it in; everything else falls
// back to the ward's default card.

export const SITE_NAME = 'सिपादोल सेवा — Sipadol Sewa'

const DEFAULT_DESCRIPTION =
  'वडा नं. ८, सूर्यविनायक नगरपालिकाको आधिकारिक सेवा पोर्टल — सूचना, सिफारिस, गुनासो र कार्यक्रम। ' +
  'Official service portal of Ward No. 8, Suryabinayak Municipality — notices, services, complaints, and programmes.'

const DEFAULT_OG_IMAGE = '/og-default.png'

export function siteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
}

type BuildMetadataInput = {
  title?: string
  description?: string
  /** Absolute URL or site-relative path. Falls back to /og-default.png. */
  image?: string
  /** Site-relative path of the page, for og:url (e.g. `/notices/42`). */
  path?: string
}

export function buildMetadata({
  title,
  description,
  image,
  path,
}: BuildMetadataInput = {}): Metadata {
  const resolvedTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const resolvedDescription = description ?? DEFAULT_DESCRIPTION
  const resolvedImage = image ?? DEFAULT_OG_IMAGE

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: SITE_NAME,
      type: 'website',
      ...(path ? { url: path } : {}),
      images: [{ url: resolvedImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description: resolvedDescription,
      images: [resolvedImage],
    },
  }
}
