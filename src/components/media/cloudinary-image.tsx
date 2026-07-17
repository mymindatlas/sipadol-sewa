// Public Cloudinary delivery, ALWAYS through a transformation — never the
// raw original (Decision 7, §10.3, §20.5). Two reasons the transformation is
// not optional:
//   • Phone photos carry GPS coordinates in EXIF; these images are public.
//     Any Cloudinary transformation strips EXIF as a side effect.
//   • The free media quota does not survive full-resolution originals.
//
// f_auto (best format per browser), q_auto (auto quality), w_<width>
// (resize). Not a client component — it renders a plain <img> with a
// computed URL, so it works in server and client trees alike.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

type Props = {
  publicId: string
  alt: string
  /** Delivered pixel width; also drives the resize transformation. */
  width?: number
  className?: string
}

export function CloudinaryImage({ publicId, alt, width = 800, className }: Props) {
  // A transformed delivery URL. The transformation segment sits between
  // `/upload/` and the public_id — that is what strips EXIF and caps size.
  const src = CLOUD_NAME
    ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`
    : ''

  // Cloudinary already does format/size optimisation via the transformation
  // above; next/image would double-optimise and need remote-host config for
  // no added benefit here — so a plain <img> is deliberate.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} className={className} loading="lazy" />
}
