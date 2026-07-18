// ─────────────────────────────────────────────────────────────────────────
// SERVER ONLY. This file is the upload security boundary (Decision 7, §10.3).
//
// CLOUDINARY_API_SECRET must never leave this module. It is read here, used
// here to compute signatures, and returned nowhere. The `node:crypto` import
// below means any accidental client-side import fails at build — that is the
// guard; do not "fix" it by moving the secret somewhere importable.
//
// Decision 7's two independent axes, kept apart on purpose:
//   • Signing an upload  → WHO may put a file into the ward's account.
//   • Delivery type      → WHO may read the file once it is there.
// A signed upload can still produce a perfectly public image. Every purpose
// below is signed; `delivery` records the separate read decision.
// ─────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'

export type UploadDelivery = 'public' | 'private'

export type UploadPurposeConfig = {
  /** Cloudinary upload preset name. Server-held; never accepted from a client. */
  preset: string | undefined
  /** Destination folder. Server-fixed — the browser cannot influence it. */
  folder: string
  /**
   * Incoming transformation, applied by Cloudinary BEFORE the asset is
   * stored (Decision 7). The stored asset IS the normalized one — there is
   * no full-res original behind it, so there is no strip-the-transformation
   * path in the URL back to an EXIF-laden original, and storage is capped at
   * the source. Signed like folder/preset, so the browser can neither choose
   * it nor tamper with it in transit.
   */
  transformation: string
  /** Read decision (Decision 7). Independent of the fact that we sign. */
  delivery: UploadDelivery
  /**
   * Formats accepted, enforced HERE (step 4 of sign-upload). Cloudinary's
   * console does not expose an allowed-formats gate on signed uploads, so
   * this list is the gate. NOT put into the signature — it is a pre-sign
   * reject, not a signed parameter.
   */
  formats: readonly string[]
  /** Hard size ceiling, enforced before signing. */
  maxBytes: number
  /** Public-facing purposes require a staff role (§10.3 step 2). */
  requiresStaff: boolean
}

// Only representative_photo exists for now. Gallery, programme banner,
// notice attachment, application document and complaint photograph each get
// added here as their modules land — same shape, their own delivery type.
export const UPLOAD_PURPOSES = {
  representative_photo: {
    preset: process.env.CLOUDINARY_UPLOAD_PRESET_PUBLIC,
    folder: 'sipadol/public/representatives',
    // Cap the stored asset at 2000px on its longest side (c_limit only
    // shrinks — a smaller upload is left alone) and re-encode at q_auto:good.
    // Applied before storage, so this normalized asset is the original.
    transformation: 'c_limit,w_2000,h_2000,q_auto:good',
    delivery: 'public',
    // No svg: SVGs can carry embedded JavaScript and these are delivered
    // publicly, so a stored SVG would be a stored-XSS vector.
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 8 * 1024 * 1024,
    requiresStaff: true,
  },
  // Mirrors representative_photo exactly except for the folder: staff-uploaded
  // public images, served through a transformation that strips EXIF and caps
  // the stored size (Decision 7, §18). Same no-svg reasoning as above.
  gallery_photo: {
    preset: process.env.CLOUDINARY_UPLOAD_PRESET_PUBLIC,
    folder: 'sipadol/public/gallery',
    transformation: 'c_limit,w_2000,h_2000,q_auto:good',
    delivery: 'public',
    formats: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 8 * 1024 * 1024,
    requiresStaff: true,
  },
} as const satisfies Record<string, UploadPurposeConfig>

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === 'string' && value in UPLOAD_PURPOSES
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

export type SignedUpload = {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
  transformation: string
  preset: string
}

/**
 * Signs an upload for a purpose. The params that enter the signature come
 * ONLY from the purpose's server-side constants plus a server-generated
 * timestamp — never from the request body. If the browser could add to what
 * is signed, it could change `folder` (and thus delivery), and every
 * private-delivery guarantee in the PRD would evaporate (§10.3).
 *
 * Cloudinary's signature algorithm: take every signed param except `file`,
 * `cloud_name`, `resource_type` and `api_key`; sort by key; join as
 * `k=v&k=v`; append the api_secret; SHA-1; hex.
 */
export function signUpload(purpose: UploadPurpose): SignedUpload {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Cloudinary credentials are not configured.')
  }

  const config = UPLOAD_PURPOSES[purpose]
  if (!config.preset) {
    throw new Error(`No upload preset configured for purpose "${purpose}".`)
  }

  const timestamp = Math.floor(Date.now() / 1000)

  // The ONLY params that are signed. Deliberately nothing from the request.
  const paramsToSign: Record<string, string | number> = {
    folder: config.folder,
    timestamp,
    transformation: config.transformation,
    upload_preset: config.preset,
  }

  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&')

  const signature = createHash('sha1')
    .update(toSign + API_SECRET)
    .digest('hex')

  return {
    signature,
    timestamp,
    api_key: API_KEY,
    cloud_name: CLOUD_NAME,
    folder: config.folder,
    transformation: config.transformation,
    preset: config.preset,
  }
}
