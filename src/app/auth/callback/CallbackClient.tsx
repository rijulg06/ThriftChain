"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export function CallbackClient() {
  const params = useSearchParams()
  const [status, setStatus] = useState<string>("Processing...")
  const [idToken, setIdToken] = useState<string | null>(null)

  useEffect(() => {
    // Enoki returns OAuth params in the hash. If present, forward to the server.
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      setStatus('Completing zkLogin via Enoki…')
      fetch('/api/zklogin/enoki/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      })
        .then(async (r) => {
          const data = await r.json()
          if (r.ok && data.ok) {
            setStatus('zkLogin session established. You can close this tab/window.')
          } else {
            setStatus(data?.message || 'Failed to complete zkLogin via Enoki')
          }
        })
        .catch((e) => {
          console.error(e)
          setStatus('Failed to complete zkLogin via Enoki')
        })
      return
    }

    // Fallback: read id_token directly from query params
    const token = params.get('id_token') || params.get('credential')
    if (token) {
      setIdToken(token)
      setStatus('Received id_token from provider. Finish zkLogin setup on the server.')
    } else {
      setStatus('No OAuth parameters found. Check your provider configuration.')
    }
  }, [params])

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
      <a href="/" className="underline">Go back home</a>
    </div>
  )
}
