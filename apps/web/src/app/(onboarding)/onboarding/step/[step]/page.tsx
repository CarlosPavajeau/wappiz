import type { OnboardingProgress } from "@wappiz/api-client/types/onboarding"
import { auth } from "@wappiz/auth"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { StepBarberForm } from "@/components/onboarding/step-barber-form"
import { StepServicesForm } from "@/components/onboarding/step-services-form"
import { StepTenantForm } from "@/components/onboarding/step-tenant-form"
import { StepWhatsAppForm } from "@/components/onboarding/step-whatsapp-form"
import { getServerApi } from "@/lib/server-api"

const MIN_STEP = 1
const MAX_STEP = 4

type Props = {
  params: Promise<{ step: string }>
}

export default async function StepPage({ params }: Readonly<Props>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  console.log("session", session)

  if (!session) {
    redirect("/login")
  }

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
    notFound()
  }

  if (progress.isCompleted) {
    redirect("/dashboard")
  }

  if (step !== progress.currentStep) {
    redirect(`/onboarding/step/${progress.currentStep}`)
  }

  if (step === 1) {
    return <StepTenantForm />
  }
  if (step === 2) {
    return <StepBarberForm />
  }
  if (step === 3) {
    return <StepServicesForm />
  }

  return <StepWhatsAppForm initialEmail={session.user.email} />
}
