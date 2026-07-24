import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // TailAdmin: altura 44 px, esquinas `rounded-lg`, sombra `theme-xs`
          // y anillo de foco en color de marca.
          "flex h-11 w-full rounded-lg border border-input bg-card px-4 py-2.5 text-base text-foreground shadow-theme-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 md:text-theme-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
