import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Insignias con el estilo "light" de TailAdmin: fondo tenue del color de
// estado + texto saturado. La API de props se mantiene y se añaden variantes
// nuevas (success / warning / info / solid) de forma aditiva.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-theme-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
        warning:
          "border-transparent bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
        info: "border-transparent bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
        solid:
          "border-transparent bg-primary text-primary-foreground hover:bg-brand-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
