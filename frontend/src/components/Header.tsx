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
      <div className="mx-20 px-4 pt-6 flex items-center justify-between">
        <a href="/" className="text-base font-semibold retro-card retro-shadow px-3 py-2 font-sans">ThriftChain</a>
        <div className="flex items-center gap-5">
          <a href="/listings" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            Browse Items
          </a>
          {connected && (
            <>
              <a href="/list-item" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                List Item
              </a>
              <a href="/stash" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-2">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 7H4v10a2 2 0 002 2h12a2 2 0 002-2V7zM4 7V5a2 2 0 012-2h12a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                My Stash
              </a>
            </>
          )}

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
