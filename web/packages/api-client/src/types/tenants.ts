export type Tenant = {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  settings: TenantSettings
}

// TenantByUser is the owner's view of their tenant, with the status the
// dashboard needs to warn about.
export type TenantByUser = Tenant & {
  // Whether WhatsApp can deliver booking confirmations. The public booking
  // page stays hidden while it is false.
  whatsappReady: boolean
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
  publicBookingEnabled: boolean
}

export type CreateTenantRequest = {
  name: string
}

export type UpdateTenantSettingsRequest = Partial<TenantSettings>
