import type { UserResponse } from "@wappiz/api-client/types/auth"
import type { OnboardingProgress } from "@wappiz/api-client/types/onboarding"
import { notFound, redirect } from "next/navigation"

import { StepBarberForm } from "@/components/onboarding/step-barber-form"
import { StepServicesForm } from "@/components/onboarding/step-services-form"
import { StepWhatsAppForm } from "@/components/onboarding/step-whatsapp-form"
import { getServerApi } from "@/lib/server-api"

const MIN_STEP = 2
const MAX_STEP = 4

export default async function StepPage({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step: stepStr } = await params
  const step = Number(stepStr)

  if (!Number.isInteger(step) || step < MIN_STEP || step > MAX_STEP) {
    notFound()
  }

  let progress: OnboardingProgress | null = null

  try {
    const api = await getServerApi()
    progress = await api.onboarding.progress()
  } catch {
    redirect("/login")
  }

  if (progress.isCompleted) {
    redirect("/")
  }

  if (step !== progress.currentStep) {
    redirect(`/onboarding/step/${progress.currentStep}`)
  }

  if (step === 2) {
    return <StepBarberForm />
  }
  if (step === 3) {
    return <StepServicesForm />
  }

  // Step 4 — needs the user's email to pre-fill the contact field
  let user: Pick<UserResponse, "email"> | null = null

  try {
    const api = await getServerApi()
    user = await api.auth.me()
  } catch {
    redirect("/login")
  }

  console.log("[onboarding/page]: current user are", user)

  return <StepWhatsAppForm initialEmail={user.email} />
}
