'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { addPhoto } from '../actions'

// Batch sibling of src/components/media/signed-upload.tsx. It deliberately
// does NOT reuse that component: SignedUpload holds ONE public_id in state
// and hands it to a parent form, which is the wrong shape for a batch that
// files each photo as it lands. The upload technique below is the same one,
// applied in a loop — ask /api/media/sign-upload for permission per file,
// then XHR the bytes straight to Cloudinary. The api_secret is never here,
// and the client still cannot choose folder or delivery type (§10.3,
// Decision 7).
//
// Sequential, not parallel: ward wifi is the constraint, and one in-flight
// request at a time makes "4 of 10" honest rather than approximate.

// Client-side mirror of the server's gallery_photo constraints
// (src/lib/cloudinary.ts) — local fast-fail only. The server re-checks all of
// it, so a drift here weakens nothing.
const PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
const PHOTO_MAX_BYTES = 8 * 1024 * 1024
const PHOTO_MAX_MB = Math.floor(PHOTO_MAX_BYTES / (1024 * 1024))

type SignResponse = {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
  transformation: string
  preset: string
}

type Failure = { fileName: string; reason: string }

type BatchResult = { succeeded: number; failures: Failure[] }

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

export function MultiPhotoUpload({ albumId }: { albumId: number }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isRunning, setIsRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState<BatchResult | null>(null)

  async function uploadOne(file: File): Promise<void> {
    // 1. Local fast-fail. Cheap UX, never the gate.
    const ext = extensionOf(file.name)
    if (!PHOTO_FORMATS.includes(ext as (typeof PHOTO_FORMATS)[number])) {
      throw new Error(
        `Unsupported file type. Allowed: ${PHOTO_FORMATS.join(', ')}.`
      )
    }
    if (file.size > PHOTO_MAX_BYTES) {
      throw new Error(`File too large. Maximum ${PHOTO_MAX_MB} MB.`)
    }

    // 2. Ask permission. The server decides folder + delivery type.
    const signRes = await fetch('/api/media/sign-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        purpose: 'gallery_photo',
        format: ext,
        bytes: file.size,
      }),
    })
    if (!signRes.ok) {
      const data = (await signRes.json().catch(() => ({}))) as {
        error?: string
      }
      throw new Error(data.error ?? 'Could not authorise the upload.')
    }
    const signed = (await signRes.json()) as SignResponse

    // 3. Post the bytes straight to Cloudinary. The signed params must go
    //    back exactly as signed or the signature check fails.
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', signed.api_key)
    form.append('timestamp', String(signed.timestamp))
    form.append('signature', signed.signature)
    form.append('folder', signed.folder)
    form.append('transformation', signed.transformation)
    form.append('upload_preset', signed.preset)

    const publicId = await postToCloudinary(signed.cloud_name, form)

    // 4. File the row. Captions stay empty — they are added per photo in the
    //    grid below, after the batch (§32.2).
    const action = new FormData()
    action.append('album_id', String(albumId))
    action.append('photo_public_id', publicId)
    await addPhoto(action)
  }

  async function handleFiles(files: File[]) {
    setIsRunning(true)
    setResult(null)
    setDone(0)
    setTotal(files.length)

    let succeeded = 0
    const failures: Failure[] = []

    // Skip-and-report: one bad file must never abort the batch, so every
    // iteration is wrapped. The loop is sequential by construction.
    for (const file of files) {
      try {
        await uploadOne(file)
        succeeded += 1
      } catch (err) {
        failures.push({
          fileName: file.name,
          reason: err instanceof Error ? err.message : 'Upload failed.',
        })
      }
      setDone((n) => n + 1)
    }

    setIsRunning(false)
    setResult({ succeeded, failures })

    // The grid below is server-rendered from the DB. addPhoto revalidates
    // this path, but that only marks the cache stale — refresh pulls the new
    // rows in without the operator reloading by hand.
    router.refresh()

    // Clean slate for the next selection.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-700">फोटो थप्नुहोस्</h3>
        <p className="mt-1 text-xs text-slate-500">
          एक वा धेरै फोटो एकैपटक छान्न सक्नुहुन्छ। क्याप्सन पछि तलको सूचीमा
          छुट्टाछुट्टै थप्न सकिन्छ। (Select one or many photos — captions are
          added per photo below, after upload.)
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PHOTO_FORMATS.map((f) => `.${f}`).join(',')}
        disabled={isRunning}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) void handleFiles(files)
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 disabled:opacity-50"
      />

      <p className="text-xs text-slate-500">
        {PHOTO_FORMATS.join(', ')} · up to {PHOTO_MAX_MB} MB per photo
      </p>

      {isRunning && (
        <div
          className="space-y-2 rounded-lg bg-blue-50 px-3 py-2.5"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-blue-900">
            फोटो अपलोड हुँदैछ… (Uploading {Math.min(done + 1, total)} of{' '}
            {total})
          </p>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div
              className="h-full bg-blue-600 transition-[width]"
              style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
            />
          </div>
          <p className="text-xs font-medium text-blue-900">
            यो पृष्ठ बन्द नगर्नुहोस्। (Do not close this page until all photos
            finish.)
          </p>
        </div>
      )}

      {result && !isRunning && (
        <div className="space-y-2" aria-live="polite">
          {result.succeeded > 0 && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {result.succeeded} फोटो थपियो। ({result.succeeded} photo
              {result.succeeded === 1 ? '' : 's'} added.)
            </p>
          )}
          {result.failures.length > 0 && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">
                {result.failures.length} फोटो थप्न सकिएन। (
                {result.failures.length} could not be added — the rest were
                added.)
              </p>
              <ul className="mt-1.5 space-y-1">
                {result.failures.map((failure, i) => (
                  <li key={`${failure.fileName}-${i}`} className="text-xs">
                    <span className="font-medium">{failure.fileName}</span> —{' '}
                    {failure.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// XHR rather than fetch so a stalled upload is still a real error rather
// than a silent hang. Progress is tracked per batch, not per byte, so no
// onprogress handler is needed here.
function postToCloudinary(cloudName: string, form: FormData): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as {
          public_id?: string
          error?: { message?: string }
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
          resolve(data.public_id)
        } else {
          reject(
            new Error(data.error?.message ?? 'Cloudinary rejected the file.')
          )
        }
      } catch {
        reject(new Error('Unexpected response from the image service.'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(form)
  })
}
