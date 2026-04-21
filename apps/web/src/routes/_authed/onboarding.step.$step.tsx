import { createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { StepBarberForm } from "@/components/onboarding/step-barber-form"
import { StepServicesForm } from "@/components/onboarding/step-services-form"
import { StepTenantForm } from "@/components/onboarding/step-tenant-form"
import { StepWhatsAppForm } from "@/components/onboarding/step-whatsapp-form"
import { Skeleton } from "@/components/ui/skeleton"
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

    const progress = await context.queryClient.fetchQuery({
      ...onboardingProgressQuery,
      staleTime: 0,
    })

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
  pendingComponent: PendingComponent,
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

function PendingComponent() {
  return (
    <section className="flex w-full flex-col items-center">
      <div className="flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    </section>
  )
}
