import { createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/onboarding/")({
  component: RouteComponent,
  loader: async () => {
    const progress = await api.onboarding.progress()

    if (!progress) {
      throw notFound()
    }

    if (progress.isCompleted) {
      throw redirect({
        to: "/dashboard",
      })
    }

    throw redirect({
      params: { step: String(progress.currentStep) },
      to: "/onboarding/step/$step",
    })
  },
})

function RouteComponent() {
  return <Spinner />
}
