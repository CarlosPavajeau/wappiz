export type OnboardingProgress = {
  currentStep: number
  isCompleted: boolean
}

export type ServiceTemplate = {
  durationMinutes: number
  bufferMinutes: number
  name: string
  price: number
}

export type OnboardingTemplatesResponse = {
  templates: {
    basic: ServiceTemplate[]
    complete: ServiceTemplate[]
    manual: ServiceTemplate[]
  }
}

export type OnboardingStep2Request = {
  name: string
  type: string
  endTime: string
  startTime: string
  workingDays: number[]
}

export type OnboardingStep3Request = {
  services: ServiceTemplate[]
}

export type OnboardingStep4Request = {
  contactEmail: string
  notes?: string
}
