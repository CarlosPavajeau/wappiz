import { createFileRoute, redirect } from "@tanstack/react-router"

import { getUser } from "@/functions/get-user"

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const user = await getUser()

    if (!user) {
      throw redirect({
        search: { redirect: location.href },
        to: "/sign-in",
      })
    }

    // Pass user to child routes
    return { isSuperAdmin: user.user.role === "admin", user }
  },
})
