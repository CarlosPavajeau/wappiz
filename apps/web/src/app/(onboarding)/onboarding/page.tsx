import type { OnboardingProgress } from "@wappiz/api-client/types/onboarding"
import { redirect } from "next/navigation"

import { getServerApi } from "@/lib/server-api"

export default async function OnboardingPage() {
  let progress: OnboardingProgress | null = null

  try {
    const api = await getServerApi()
    progress = await api.onboarding.progress()
  } catch (error) {
    console.error("[onboarding/page] failed to fetch progress:", error)
    redirect("/login")
  }

  if (progress.isCompleted) {
    redirect("/")
  }

  if (progress.currentStep <= 1) {
    redirect("/register")
  }

  redirect(`/onboarding/step/${progress.currentStep}`)
}
