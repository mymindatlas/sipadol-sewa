'use client'

import { useCallback, useEffect, useState } from 'react'

import { CloudinaryImage } from '@/components/media/cloudinary-image'
import type { Lang } from '@/lib/i18n'

// §18 — the grid plus the full-screen viewer it opens. One component, because
// the two share the selected index and nothing else needs it. No lightbox
// package: the whole behaviour is an index in state, three key handlers, and
// a fixed-position overlay.

export type GalleryPhoto = {
  id: number
  publicId: string
  caption: string
}

type Props = {
  photos: GalleryPhoto[]
  lang: Lang
}

const STRINGS = {
  open: { ne: 'तस्बिर हेर्नुहोस्', en: 'View photo' },
  close: { ne: 'बन्द गर्नुहोस्', en: 'Close' },
  previous: { ne: 'अघिल्लो', en: 'Previous' },
  next: { ne: 'अर्को', en: 'Next' },
} satisfies Record<string, Record<Lang, string>>

export function PhotoGrid({ photos, lang }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current
        // Wraps, so the arrow keys never dead-end on the first or last photo.
        return (current + delta + photos.length) % photos.length
      })
    },
    [photos.length]
  )

  // Keyboard control belongs on the document, not the overlay: the overlay
  // may not hold focus after a click, and Esc must work regardless.
  useEffect(() => {
    if (openIndex === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') step(1)
      else if (event.key === 'ArrowLeft') step(-1)
    }

    document.addEventListener('keydown', onKeyDown)
    // The page behind must not scroll while the viewer is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [openIndex, close, step])

  const active = openIndex === null ? null : photos[openIndex]

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={photo.caption || STRINGS.open[lang]}
                className="block w-full cursor-zoom-in"
              >
                <CloudinaryImage
                  publicId={photo.publicId}
                  alt={photo.caption}
                  width={640}
                  className="h-48 w-full bg-slate-100 object-cover"
                />
              </button>
              {/* Captions are optional — no empty bar when there is none. */}
              {photo.caption && (
                <figcaption className="px-4 py-3 text-sm leading-relaxed text-slate-600">
                  {photo.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      {/* openIndex is tested alongside `active` so the counter below can use
          it without a non-null assertion. */}
      {openIndex !== null && active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption || STRINGS.open[lang]}
          // Backdrop click closes; clicks inside the figure below stop
          // propagating, so tapping the image itself does not close it.
          onClick={close}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label={STRINGS.close[lang]}
            className="absolute right-3 top-3 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            ✕
          </button>

          <figure
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full w-full max-w-4xl flex-col items-center gap-3"
          >
            <CloudinaryImage
              publicId={active.publicId}
              alt={active.caption}
              width={1200}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
            {active.caption && (
              <figcaption className="text-center text-sm leading-relaxed text-white/80">
                {active.caption}
              </figcaption>
            )}
          </figure>

          {photos.length > 1 && (
            <div
              onClick={(event) => event.stopPropagation()}
              className="mt-4 flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={STRINGS.previous[lang]}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                ←
              </button>
              <span className="text-sm text-white/70">
                {openIndex + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={STRINGS.next[lang]}
                className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
