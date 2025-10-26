"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export function CallbackClient() {
  const params = useSearchParams()
  const [status, setStatus] = useState<string>("Processing...")
  const [idToken, setIdToken] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let isCancelled = false

    const completeAuth = async () => {
      const hash = window.location.hash

      if (hash) {
        startTransition(() => {
          if (!isCancelled) {
            setStatus('Completing zkLogin via Enoki…')
          }
        })

        try {
          const response = await fetch('/api/zklogin/enoki/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash }),
          })

          const data: { ok?: boolean; message?: string } = await response.json()

          startTransition(() => {
            if (isCancelled) return
            if (response.ok && data.ok) {
              setStatus('zkLogin session established. You can close this tab/window.')
            } else {
              setStatus(data?.message || 'Failed to complete zkLogin via Enoki')
            }
          })
        } catch (error) {
          console.error(error)
          startTransition(() => {
            if (!isCancelled) {
              setStatus('Failed to complete zkLogin via Enoki')
            }
          })
        }

        return
      }

      const token = params.get('id_token') || params.get('credential')
      startTransition(() => {
        if (isCancelled) return
        if (token) {
          setIdToken(token)
          setStatus('Received id_token from provider. Finish zkLogin setup on the server.')
        } else {
          setStatus('No OAuth parameters found. Check your provider configuration.')
        }
      })
    }

    void completeAuth()

    return () => {
      isCancelled = true
    }
  }, [params, startTransition])

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold mb-2">zkLogin Callback</h1>
      <p className="mb-4 text-sm opacity-80">{status}</p>
      {idToken && (
        <details>
          <summary className="cursor-pointer mb-2">Show id_token (debug)</summary>
          <pre className="whitespace-pre-wrap break-all text-xs p-3 rounded bg-black/5 dark:bg-white/5">{idToken}</pre>
        </details>
      )}
      <Link href="/" className="underline">Go back home</Link>
    </div>
  )
}
