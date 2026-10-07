import { redirect } from "@tanstack/react-router"

import { getUser } from "@/functions/get-user"

// Sign-in and sign-up are pointless with an active session, so send the user
// straight to the dashboard. `_authed` takes care of banned users from there.
export async function redirectIfAuthenticated() {
  const session = await getUser()

  if (session) {
    throw redirect({ to: "/dashboard" })
  }
}
