import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, disabled, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-lg shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
}

export { Textarea }
