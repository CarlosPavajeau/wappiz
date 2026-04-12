export type PendingActivationsResponse = {
  tenantId: string
  tenantName: string
  contactEmail: string
  notes: string
  status: string
  requestedAt: string
}

export type ActivateRequest = {
  phoneNumberId: string
  displayPhoneNumber: string
  wabaId: string
  accessToken: string
}

export type RejectRequest = {
  reason: string
}
