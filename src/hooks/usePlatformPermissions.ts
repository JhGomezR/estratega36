"use client"

import { useMemo } from "react"
import { doc } from "firebase/firestore"
import { useDoc, useDefaultDb, useMemoFirebase, useUser, usePlatformClaims } from "@/firebase"
import type { PlatformUser, PlatformRole } from "@/lib/types"

/**
 * Permisos GRANULARES del operador de plataforma (RBAC del Control Plane).
 * Consistente con el modelo del proyecto (los permisos de plataforma se
 * enforcan en la UI): un operador con rol super/admin, o sin rol asignado
 * (fundador/bootstrap), tiene acceso total; el resto según los permisos del rol.
 */
export function usePlatformPermissions() {
  const { user } = useUser()
  const claims = usePlatformClaims()
  const defaultDb = useDefaultDb()

  const puRef = useMemoFirebase(
    () => (defaultDb && user ? doc(defaultDb, "platformUsers", user.uid) : null),
    [defaultDb, user]
  )
  const { data: platformUser } = useDoc<PlatformUser>(puRef)

  const roleRef = useMemoFirebase(
    () => (defaultDb && platformUser?.roleId ? doc(defaultDb, "platformRoles", platformUser.roleId) : null),
    [defaultDb, platformUser?.roleId]
  )
  const { data: role } = useDoc<PlatformRole>(roleRef)

  const hasPlatformPermission = useMemo(() => {
    return (permission: string): boolean => {
      if (!claims?.platformAdmin) return false
      if (!role) return true // sin rol resuelto (bootstrap o cargando) → acceso
      const name = (role.name || "").toLowerCase()
      if (name.includes("super") || name.includes("admin")) return true
      return (role.permissions || []).includes(permission)
    }
  }, [claims, role])

  return { hasPlatformPermission, role }
}
