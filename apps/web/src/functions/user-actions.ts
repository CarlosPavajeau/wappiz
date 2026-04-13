"use server"

import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@wappiz/auth"

import { authMiddleware } from "@/middleware/auth"

export const banUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { userId: string; banReason?: string }) => data)
  .handler(async ({ data: { userId, banReason } }) => {
    const headers = await getRequestHeaders()
    return auth.api.banUser({ headers, body: { userId, banReason } })
  })

export const unbanUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data: { userId } }) => {
    const headers = await getRequestHeaders()
    return auth.api.unbanUser({ headers, body: { userId } })
  })
