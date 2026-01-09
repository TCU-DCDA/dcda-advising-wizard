import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
  className?: string
}

export function StepIndicator({ totalSteps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex justify-center gap-1.5 py-4 px-4 bg-card border-b overflow-x-auto", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-200 shrink-0",
            index < currentStep
              ? "w-2 bg-success" // Completed
              : index === currentStep
              ? "w-6 bg-primary" // Active
              : "w-2 bg-border" // Future
          )}
        />
      ))}
    </div>
  )
}
