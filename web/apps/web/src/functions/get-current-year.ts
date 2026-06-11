import { createServerFn } from "@tanstack/react-start"

export const getCurrentYear = createServerFn({ method: "GET" }).handler(
  async () => new Date().getFullYear()
)
