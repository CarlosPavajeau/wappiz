"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const STEP_LABELS = ["Cuenta", "Barbero", "Servicios", "WhatsApp"]

export function StepIndicator({
  currentStep,
  totalSteps = 4,
}: {
  currentStep: number
  totalSteps?: number
}) {
  return (
    <div className="flex w-full">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isFirst = i === 0
        const isLast = i === totalSteps - 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={stepNum} className="flex flex-1 flex-col items-center">
            {/* Circle row with connecting lines */}
            <div className="relative flex w-full items-center justify-center">
              {!isFirst && (
                <div
                  className={cn(
                    "absolute top-1/2 right-1/2 left-0 h-px -translate-y-1/2 transition-colors",
                    stepNum <= currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              {!isLast && (
                <div
                  className={cn(
                    "absolute top-1/2 left-1/2 right-0 h-px -translate-y-1/2 transition-colors",
                    stepNum < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-primary text-primary-foreground",
                  !isCompleted &&
                    !isActive &&
                    "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="text-[11px] font-semibold">{stepNum}</span>
                )}
              </div>
            </div>

            {/* Label */}
            <span
              className={cn(
                "mt-2 text-center text-xs font-medium transition-colors",
                isCompleted || isActive
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
