export type FlowFieldType = "predefined" | "custom"

export type TenantFlowField = {
  id: string
  fieldKey: string
  fieldType: FlowFieldType
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
