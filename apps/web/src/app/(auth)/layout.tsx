import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-border border-b bg-background/75 backdrop-blur-xl">
        <nav
          aria-label="Navegacion principal"
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <Link
            className="inline-flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
            href="/"
          >
            <span className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-accent text-xs">
              W
            </span>
            Wappiz
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        {children}
      </main>
    </div>
  )
}
