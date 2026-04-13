"use server"

import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { auth } from "@wappiz/auth"

import { authMiddleware } from "@/middleware/auth"

export type AdminUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: string | null
}

const toIso = (v: Date | string | null | undefined): string | null =>
  v == null ? null : new Date(v).toISOString()

export const listUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { page: number; limit: number }) => data)
  .handler(async ({ data: { page, limit } }) => {
    const headers = await getRequestHeaders()
    const result = await auth.api.listUsers({
      headers,
      query: { limit, offset: (page - 1) * limit },
    })

    const users: AdminUser[] = result.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image ?? null,
      createdAt: new Date(u.createdAt).toISOString(),
      updatedAt: new Date(u.updatedAt).toISOString(),
      role: u.role ?? null,
      banned: u.banned ?? null,
      banReason: u.banReason ?? null,
      banExpires: toIso(u.banExpires),
    }))

    return { users, total: result.total }
  })
