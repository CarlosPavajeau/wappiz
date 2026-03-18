import { MessageCircle } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        >
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]">
              <MessageCircle
                className="h-4 w-4 text-white"
                aria-hidden="true"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight">wappiz</span>
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        {children}
      </main>
    </div>
  )
}
