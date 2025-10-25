"use client"

import { ItemForm } from "@/components/ItemForm"

export default function ListItemPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        {/* Header */}
        <div className="retro-card retro-shadow p-5 mb-6">
          <h1 className="text-3xl sm:text-4xl tracking-tight">
            List Your Item
          </h1>
          <p className="mt-2 opacity-80">
            Create a blockchain-backed listing with decentralized image storage
          </p>
        </div>

        {/* Form */}
        <ItemForm />
      </div>
    </div>
  )
}
