import { createFileRoute, notFound } from "@tanstack/react-router"
import { ApiError } from "@wappiz/api-client"

import { NotFoundPage } from "@/components/not-found-page"
import { BookingFlow } from "@/components/public-booking/booking-flow"
import { publicTenantQuery } from "@/queries/public-booking"

// Public booking page shared by businesses on social media. Static routes
// (/privacy, /sign-in, /dashboard, ...) always win over this dynamic one,
// and the API refuses to issue tenant slugs that collide with them.
//
// `loader` must stay before `head`: TypeScript infers the loader data type
// from the options in source order, and `head` depends on it.
// oxlint-disable-next-line sort-keys
export const Route = createFileRoute("/$slug")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.query(
        publicTenantQuery(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  // oxlint-disable-next-line sort-keys
  component: RouteComponent,
  head: ({ loaderData }) => {
    if (loaderData === undefined) {
      return { meta: [{ title: "Página no encontrada · wappiz" }] }
    }
    const title = `Reserva en ${loaderData.name}`
    const description = `Agenda tu cita en ${loaderData.name} en segundos y recibe la confirmación por WhatsApp.`
    return {
      meta: [
        { title },
        { content: description, name: "description" },
        { content: title, property: "og:title" },
        { content: description, property: "og:description" },
        { content: "website", property: "og:type" },
      ],
    }
  },
  notFoundComponent: NotFoundPage,
})

function RouteComponent() {
  const tenant = Route.useLoaderData()

  return (
    <main className="row-span-2 overflow-y-auto">
      <BookingFlow tenant={tenant} />
    </main>
  )
}
