import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  OnboardingProgress,
  OnboardingStep2Request,
  OnboardingStep3Request,
  OnboardingStep4Request,
  OnboardingTemplatesResponse,
} from "../types/onboarding"

const definitions = {
  completeStep2: {
    method: "POST",
    path: "/onboarding/step/2",
  } as EndpointDefinition<OnboardingProgress, OnboardingStep2Request>,
  completeStep3: {
    method: "POST",
    path: "/onboarding/step/3",
  } as EndpointDefinition<OnboardingProgress, OnboardingStep3Request>,
  completeStep4: {
    method: "POST",
    path: "/onboarding/step/4",
  } as EndpointDefinition<OnboardingProgress, OnboardingStep4Request>,
  progress: {
    method: "GET",
    path: "/onboarding/progress",
  } as EndpointDefinition<OnboardingProgress>,
  templates: {
    method: "GET",
    path: "/onboarding/templates",
  } as EndpointDefinition<OnboardingTemplatesResponse>,
} as const

export const onboardingResource = defineResource(definitions)
