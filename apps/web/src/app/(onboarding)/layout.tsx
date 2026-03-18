import { auth } from "@wappiz/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col items-center gap-8 px-4 py-10">
        <span className="text-lg font-semibold tracking-tight">wappiz</span>
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  )
}
