"use client"

import { useWallet } from "@suiet/wallet-kit"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: Props) {
  const { connected, account, allAvailableWallets, select, disconnect, status } = useWallet()

  async function startZkLogin() {
    try {
      const res = await fetch('/api/zklogin/enoki/start')
      const data = await res.json()
      if (data.loginUrl) {
        window.location.href = data.loginUrl
      } else if (data.message) {
        alert(data.message)
      } else {
        alert('Unable to start zkLogin. Check server logs and env vars.')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to start zkLogin flow')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="px-5 pt-5">Sign in</DialogTitle>
          <DialogDescription className="px-5">
            Choose a wallet or use Google via zkLogin (managed by Enoki).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4 px-5">
          <section>
            <h3 className="text-sm font-medium mb-2">Crypto-native</h3>
            {connected ? (
              <div className="flex items-center gap-3">
                <span className="text-sm px-3 py-1 rounded-full bg-black/5 dark:bg-white/10">
                  {account?.address?.slice(0, 6)}…{account?.address?.slice(-4)}
                </span>
                <Button variant="outline" onClick={() => disconnect()}>Disconnect</Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {allAvailableWallets.map((w) => (
                  <Button
                    key={w.name}
                    variant="outline"
                    className="justify-start"
                    onClick={async () => {
                      try {
                        await select(w.name)
                        onOpenChange(false)
                      } catch (e) {
                        console.error(e)
                        alert(`Failed to connect: ${w.name}`)
                      }
                    }}
                  >
                    Connect {w.name}
                  </Button>
                ))}
                {allAvailableWallets.length === 0 && (
                  <div className="text-sm opacity-70">No wallets detected. Install a Sui wallet extension.</div>
                )}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-medium mb-2">Web2 (zkLogin)</h3>
            <Button variant="outline" onClick={startZkLogin}>
              Continue with Google
            </Button>
            <p className="mt-2 text-xs opacity-70">Uses zkLogin (Enoki) to create a Sui address from your Google account.</p>
          </section>
        </div>

        <DialogFooter className="px-5 pb-5">
          <Button onClick={() => onOpenChange(false)} variant="ghost">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
