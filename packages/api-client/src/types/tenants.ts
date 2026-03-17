export type Tenant = {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  plan: string
  settings: Record<string, string>
}
