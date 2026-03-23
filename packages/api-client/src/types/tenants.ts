export type Tenant = {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  plan: string
  settings: TenantSettings
}

export type TenantSettings = {
  welcomeMessage: string
  botName: string
  cancellationMessage: string
  contactEmail: string
  lateCancelHours: number
  autoBlockAfterNoShows: number
  autoBlockAfterLateCancel: number
  sendWarningBeforeBlock: boolean
}

export type CreateTenantRequest = {
  name: string
}

export type UpdateTenantSettingsRequest = Partial<TenantSettings>
