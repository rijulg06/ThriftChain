"use client"

import { useWallet } from "@suiet/wallet-kit"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: Props) {
  const { connected, account, allAvailableWallets, select, disconnect } = useWallet()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="px-5 pt-5 text-2xl">Connect Wallet</DialogTitle>
          <DialogDescription className="px-5">
            Connect your Sui wallet to start trading on ThriftChain.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 px-5">
          {connected ? (
            <div className="space-y-4">
              <div className="retro-card p-4 text-center">
                <p className="text-sm opacity-70 mb-2">Connected Address</p>
                <p className="font-mono font-bold text-lg">
                  {account?.address?.slice(0, 6)}...{account?.address?.slice(-4)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  disconnect()
                  onOpenChange(false)
                }}
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allAvailableWallets.map((w) => (
                <Button
                  key={w.name}
                  variant="outline"
                  className="w-full h-12 justify-start text-base"
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
                <div className="retro-card p-6 text-center">
                  <p className="text-sm opacity-70 mb-3">
                    No Sui wallets detected
                  </p>
                  <a
                    href="https://suiet.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Install Suiet Wallet →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 pb-5">
          <Button onClick={() => onOpenChange(false)} variant="ghost" className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
