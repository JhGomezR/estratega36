"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils"
import { ROUTE_LABELS } from "./nav-config"

function humanize(segment: string) {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ")
  return decoded.charAt(0).toUpperCase() + decoded.slice(1)
}

/**
 * Migas de pan derivadas de la ruta actual (estilo TailAdmin).
 * Se renderiza en el shell, por lo que todas las pantallas la reciben sin
 * necesidad de modificarlas.
 */
export function PageBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()

  const crumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`
      return {
        href,
        label: ROUTE_LABELS[href] ?? humanize(segment),
        isLast: index === segments.length - 1,
      }
    })
  }, [pathname])

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Ruta de navegación" className={cn("mb-1", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-theme-sm text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            {crumb.isLast ? (
              <span aria-current="page" className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Encabezado de página reutilizable: título, descripción y acciones.
 * Patrón recomendado para el resto de pantallas al migrarlas al tema.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-title-sm font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-theme-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
