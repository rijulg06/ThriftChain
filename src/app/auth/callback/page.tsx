import { Suspense } from "react"
import { CallbackClient } from "./CallbackClient"

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl p-8">Loading...</div>}>
      <CallbackClient />
    </Suspense>
  )
}
