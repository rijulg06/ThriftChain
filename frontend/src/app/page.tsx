"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Home() {
  const router = useRouter()
  const [q, setQ] = useState("")

  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16">
        <div className="retro-card retro-shadow p-5">
          <h1 className="text-3xl sm:text-5xl tracking-tight">
            Discover and trade on-chain thrift finds
          </h1>
          <p className="mt-3 opacity-80 max-w-2xl">
            ThriftChain is a decentralized marketplace on Sui. Own your listings, store images on Walrus, and search by meaning using vectors.
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <form
            className="flex-1 flex items-center gap-2 retro-card retro-shadow px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault()
              const query = q.trim()
              router.push(`/listings${query ? `?q=${encodeURIComponent(query)}` : ''}`)
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jackets, shoes, tags…"
              className="flex-1 bg-transparent outline-none text-base"
            />
            <button className="text-sm px-4 py-2 bg-black text-white dark:bg-white dark:text-black retro-btn">
              Search
            </button>
          </form>

          <a href="/listings" className="text-sm flex items-center justify-center px-4 py-2 border-2 border-black bg-white dark:bg-zinc-950 text-center retro-btn">
            Browse
          </a>
          <a href="/list-item" className="text-sm flex items-center justify-center px-4 py-2 border-2 border-black bg-white dark:bg-zinc-950 text-center retro-btn">
            List Item
          </a>
        </div>
      </section>
    </div>
  )
}
