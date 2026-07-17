'use client'

import { useRef, useState } from 'react'

import { CloudinaryImage } from './cloudinary-image'

// Client half of the signed-upload flow (§10.3, Decision 7). It never sees
// the api_secret and cannot choose folder or delivery type — it asks
// /api/media/sign-upload for permission, then posts the file straight to
// Cloudinary with the signature the server returned. The file never touches
// our own server: the platform's request-body limit is well under 8 MB
// (Decision 14), and there is no reason to proxy bytes we don't inspect.

type SignResponse = {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
  transformation: string
  preset: string
}

type Props = {
  /** Matches an UPLOAD_PURPOSES key on the server. */
  purpose: string
  /** Extensions accepted, for the local fast-fail (server re-checks). */
  formats: readonly string[]
  /** Size ceiling for the local fast-fail (server re-checks). */
  maxBytes: number
  /** Current stored public_id, if any — shown as a preview. */
  value?: string | null
  /** Hidden field name so the public_id posts with the parent form. */
  name: string
  label?: string
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

export function SignedUpload({
  purpose,
  formats,
  maxBytes,
  value,
  name,
  label,
}: Props) {
  const [publicId, setPublicId] = useState<string | null>(value ?? null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const maxMb = Math.floor(maxBytes / (1024 * 1024))

  async function handleFile(file: File) {
    setError(null)

    // 1. Local fast-fail — cheap UX, not the enforcement (that is the
    //    server, §10.3). Extension and size only.
    const ext = extensionOf(file.name)
    if (!formats.includes(ext)) {
      setStatus('error')
      setError(`Unsupported file type. Allowed: ${formats.join(', ')}.`)
      return
    }
    if (file.size > maxBytes) {
      setStatus('error')
      setError(`File too large. Maximum ${maxMb} MB.`)
      return
    }

    setStatus('uploading')
    setProgress(0)

    try {
      // 2. Ask permission. Server decides folder + delivery; we send only
      //    what it needs to judge the request.
      const signRes = await fetch('/api/media/sign-upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ purpose, format: ext, bytes: file.size }),
      })
      if (!signRes.ok) {
        const data = (await signRes.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(data.error ?? 'Could not authorise the upload.')
      }
      const signed = (await signRes.json()) as SignResponse

      // 3. Post the file directly to Cloudinary. The signed params must be
      //    sent back exactly as signed (folder, timestamp, transformation,
      //    upload_preset) or the signature check fails; api_key rides along
      //    unsigned as Cloudinary requires.
      const form = new FormData()
      form.append('file', file)
      form.append('api_key', signed.api_key)
      form.append('timestamp', String(signed.timestamp))
      form.append('signature', signed.signature)
      form.append('folder', signed.folder)
      form.append('transformation', signed.transformation)
      form.append('upload_preset', signed.preset)

      const uploaded = await postToCloudinary(
        signed.cloud_name,
        form,
        setProgress
      )

      // 4. Hand the public_id back to the parent form.
      setPublicId(uploaded)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      // 5. Readable message, never a raw object.
      setError(err instanceof Error ? err.message : 'Upload failed.')
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <span className="block text-sm font-medium text-slate-700">{label}</span>
      )}

      {/* Posts with the parent form; the server reads THIS, not the file. */}
      <input type="hidden" name={name} value={publicId ?? ''} />

      {publicId && (
        <div className="flex items-center gap-3">
          <CloudinaryImage
            publicId={publicId}
            alt="Uploaded photo"
            width={96}
            className="h-24 w-24 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPublicId(null)
              setError(null)
            }}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={formats.map((f) => `.${f}`).join(',')}
        disabled={status === 'uploading'}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          // Reset so re-selecting the same file fires onChange again.
          e.target.value = ''
        }}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 disabled:opacity-50"
      />

      <p className="text-xs text-slate-500">
        {formats.join(', ')} · up to {maxMb} MB
      </p>

      {status === 'uploading' && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-blue-600 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === 'error' && error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

// XHR rather than fetch: fetch has no upload-progress event, and §10.3's
// client half is expected to "show progress".
function postToCloudinary(
  cloudName: string,
  form: FormData,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    )

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as {
          public_id?: string
          error?: { message?: string }
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
          resolve(data.public_id)
        } else {
          reject(new Error(data.error?.message ?? 'Cloudinary rejected the file.'))
        }
      } catch {
        reject(new Error('Unexpected response from the image service.'))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(form)
  })
}
