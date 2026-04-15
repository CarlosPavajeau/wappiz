import { createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { StepBarberForm } from "@/components/onboarding/step-barber-form"
import { StepServicesForm } from "@/components/onboarding/step-services-form"
import { StepTenantForm } from "@/components/onboarding/step-tenant-form"
import { StepWhatsAppForm } from "@/components/onboarding/step-whatsapp-form"
import { onboardingProgressQuery } from "@/queries/onboarding"

const MIN_STEP = 1
const MAX_STEP = 4

export const Route = createFileRoute("/_authed/onboarding/step/$step")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const { step: stepStr } = params
    const step = Number(stepStr)

    if (!Number.isInteger(step) || step < MIN_STEP || step > MAX_STEP) {
      throw notFound()
    }

    const progress = await context.queryClient.ensureQueryData(
      onboardingProgressQuery
    )

    if (!progress) {
      throw notFound()
    }

    if (progress.isCompleted) {
      throw redirect({
        to: "/dashboard",
      })
    }

    if (step !== progress.currentStep) {
      throw redirect({
        params: { step: String(progress.currentStep) },
        to: "/onboarding/step/$step",
      })
    }

    return { step }
  },
})

function RouteComponent() {
  const { step } = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  if (step === 1) {
    return <StepTenantForm />
  }

  if (step === 2) {
    return <StepBarberForm />
  }

  if (step === 3) {
    return <StepServicesForm />
  }

  return <StepWhatsAppForm initialEmail={user.user.email} />
}
