import { Polar } from "@polar-sh/sdk"

export function createPolarClient(
  accessToken: string,
  server: "sandbox" | "production" = "sandbox"
) {
  return new Polar({
    accessToken: accessToken,
    server: server,
  })
}
