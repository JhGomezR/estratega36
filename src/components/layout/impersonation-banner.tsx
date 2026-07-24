"use client"

/**
 * Banner de impersonación ("Entrar al tenant").
 *
 * Cuando un operador de plataforma entra a un tenant, la conexión Firestore
 * activa deja de ser `(default)` y pasa a la base del tenant. Sin un aviso
 * visible es imposible saber en qué organización se está trabajando —y no
 * había forma de SALIR sin borrar sessionStorage a mano—, con el riesgo de
 * escribir datos en el tenant equivocado.
 *
 * Al salir se fuerza una recarga completa: el provider resuelve la conexión una
 * sola vez por sesión de usuario, así que limpiar sessionStorage sin recargar
 * dejaría la app apuntando todavía a la base del tenant.
 */

import * as React from "react"
import { Building2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/firebase"
import { clearImpersonation, getImpersonation, type ImpersonationSession } from "@/firebase/tenant-db"

export function ImpersonationBanner() {
  const { connectionScope } = useFirebase()
  const [session, setSession] = React.useState<ImpersonationSession | null>(null)

  // sessionStorage solo existe en el cliente: se lee tras el montaje para no
  // provocar un desajuste de hidratación.
  React.useEffect(() => {
    setSession(connectionScope === "impersonation" ? getImpersonation() : null)
  }, [connectionScope])

  if (connectionScope !== "impersonation" || !session) return null

  const exitTenant = () => {
    clearImpersonation()
    // Recarga dura para que FirebaseProvider vuelva a resolver la conexión.
    window.location.assign("/admin/tenants")
  }

  const label = session.displayName || session.tenantId

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm lg:px-6"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span className="truncate">
          Estás dentro del tenant <strong className="font-semibold">{label}</strong>
          <span className="hidden sm:inline text-muted-foreground"> — base <code className="font-mono text-xs">{session.databaseId}</code></span>
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={exitTenant}>
        <LogOut className="mr-2 h-4 w-4" />
        Salir del tenant
      </Button>
    </div>
  )
}
