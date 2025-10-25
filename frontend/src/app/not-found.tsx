import Link from "next/link"

export default function NotFound() {
  // Force a light look regardless of any dark toggles by using CSS variables directly.
  return (
    <main
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      className="h-[80vh] flex items-center justify-center p-6"
    >
      <div className="retro-card retro-shadow border-black max-w-xl w-full p-8 text-center">
        <h1 className="font-sans text-3xl mb-3">404 — Not Found</h1>
        <p className="mb-6 opacity-80">
          The page you were looking for doesn’t exist, moved, or was thrifted away.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="retro-btn px-4 py-2 bg-secondary hover:opacity-90">
            Go home
          </Link>
          <Link href="/" className="underline">
            Explore latest listings
          </Link>
        </div>
      </div>
    </main>
  )
}
