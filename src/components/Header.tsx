"use client"

import { useState } from "react"
import { useWallet } from "@suiet/wallet-kit"
import { LoginModal } from "./LoginModal"

function short(addr?: string | null) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function Header() {
  const { connected, account, disconnect, status } = useWallet()
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <header className="w-full bg-transparent">
      <div className="mx-auto max-w-5xl px-4 pt-6 flex items-center justify-between">
        <a href="/" className="text-base font-semibold retro-card retro-shadow px-3 py-2 font-sans">ThriftChain</a>
        <div className="flex items-center gap-3">
          <a href="/listings" className="text-sm opacity-80 hover:opacity-100">Browse</a>
          <a href="/list-item" className="text-sm opacity-80 hover:opacity-100">List Item</a>

          {connected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm px-3 py-1 border bg-black/5 dark:bg-white/10">
                {short(account?.address)}
              </span>
              <button
                className="text-sm px-3 py-1 border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="text-sm px-3 py-2 border-2 border-black bg-white hover:bg-black/5 dark:bg-black dark:hover:bg-white/10 retro-btn"
              onClick={() => setLoginOpen(true)}
            >
              {status === 'connecting' ? 'Connecting…' : 'Login'}
            </button>
          )}
        </div>
      </div>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  )
}
