import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Estilos alineados con el tema TailAdmin: `rounded-lg`, `shadow-theme-xs`,
// altura base de 44 px y transiciones suaves. La API de props no cambia.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-theme-sm font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-theme-xs hover:bg-brand-600",
        destructive:
          "bg-destructive text-destructive-foreground shadow-theme-xs hover:bg-error-600",
        outline:
          "border border-input bg-card text-secondary-foreground shadow-theme-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-theme-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Variantes aditivas del tema (no rompen las existentes).
        success:
          "bg-success text-success-foreground shadow-theme-xs hover:bg-success-600",
        warning:
          "bg-warning text-warning-foreground shadow-theme-xs hover:bg-warning-600",
      },
      size: {
        default: "h-11 px-4 py-2.5",
        sm: "h-9 px-3.5 text-theme-xs",
        lg: "h-12 px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
