// How the bot validates a customer's answer. Limits only exist on the types
// they apply to, mirroring the checks on tenant_flow_fields.
export type FlowFieldRule =
  | { type: "text"; minLength: number; maxLength: number }
  | { type: "email" }
  | { type: "document" }
  | { type: "number"; minValue?: number; maxValue?: number }
  | { type: "date" }
  | { type: "phone" }

export type FlowFieldType = FlowFieldRule["type"]

export type TenantFlowField = {
  id: string
  fieldKey: string
  question: string
  rule: FlowFieldRule
  isRequired: boolean
  isOneTime: boolean
  isEnabled: boolean
  sortOrder: number
}

export type UpsertTenantFlowFieldRequest = {
  question: string
  rule: FlowFieldRule
  isRequired: boolean
  isOneTime: boolean
  sortOrder: number
}
