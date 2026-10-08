export type TenantFlowField = {
  id: string
  fieldKey: string
  question: string
  isRequired: boolean
  isOneTime: boolean
  isEnabled: boolean
  sortOrder: number
}

export type UpsertTenantFlowFieldRequest = {
  question: string
  isRequired: boolean
  isOneTime: boolean
  sortOrder: number
}
