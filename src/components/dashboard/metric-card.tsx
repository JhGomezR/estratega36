"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type MetricTone = "brand" | "success" | "warning" | "info"

const toneClasses: Record<MetricTone, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  success:
    "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  info: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
}

/**
 * Tarjeta de métrica del dashboard con la anatomía de TailAdmin:
 * icono en contenedor redondeado, etiqueta, valor destacado y distintivo.
 */
export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "brand",
  badge,
  badgeVariant = "success",
  isLoading = false,
  className,
}: {
  label: string
  value: React.ReactNode
  description?: string
  icon: LucideIcon
  tone?: MetricTone
  badge?: string
  badgeVariant?: "success" | "warning" | "destructive" | "info" | "secondary"
  isLoading?: boolean
  className?: string
}) {
  return (
    <Card className={cn("p-5 md:p-6", className)}>
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          toneClasses[tone]
        )}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="text-theme-sm text-muted-foreground">{label}</span>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <h3 className="mt-2 text-title-sm font-bold tracking-tight text-foreground">
              {value}
            </h3>
          )}
        </div>
        {badge && !isLoading && (
          <Badge variant={badgeVariant}>{badge}</Badge>
        )}
      </div>

      {description && (
        <p className="mt-3 text-theme-xs text-muted-foreground">{description}</p>
      )}
    </Card>
  )
}
