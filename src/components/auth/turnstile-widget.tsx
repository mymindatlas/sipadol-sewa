'use client'

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

// Cloudflare Turnstile, explicit rendering mode (PRD §12.3). The script is
// loaded once and shared between mounts (login and signup both use this).
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string
      callback: (token: string) => void
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve()
  }

  let script = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`
  )
  if (!script) {
    script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    document.head.appendChild(script)
  }

  const pending = script
  return new Promise((resolve, reject) => {
    pending.addEventListener('load', () => resolve())
    pending.addEventListener('error', () =>
      reject(new Error('Failed to load the Turnstile script.'))
    )
  })
}

export type TurnstileWidgetHandle = {
  /**
   * Turnstile tokens are single-use — a failed submission spends the token.
   * The parent form MUST call this after ANY failed submission, or the next
   * attempt fails with a captcha error instead of the real one (PRD §12.3).
   */
  reset: () => void
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void
  ref?: Ref<TurnstileWidgetHandle>
}

export function TurnstileWidget({ onVerify, ref }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Keep the latest callback without re-rendering the widget.
  const onVerifyRef = useRef(onVerify)
  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetIdRef.current !== null) {
          window.turnstile?.reset(widgetIdRef.current)
          // The old token is spent and the re-challenge is asynchronous —
          // report the token as gone immediately so the parent form can't
          // resubmit the spent one during the gap. The re-run challenge
          // calls back with the fresh token when it completes.
          onVerifyRef.current('')
        }
      },
    }),
    []
  )

  useEffect(() => {
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
          callback: (token) => onVerifyRef.current(token),
        })
      })
      .catch(() => {
        // Script blocked or offline — the widget simply doesn't render and
        // the server-side captcha check reports the failure on submit.
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} />
}
