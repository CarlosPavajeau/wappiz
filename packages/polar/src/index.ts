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

export * from "@polar-sh/sdk/models/components/customerstate"
export * from "@polar-sh/sdk/models/components/subscription"
export * from "@polar-sh/sdk/models/components/order"
