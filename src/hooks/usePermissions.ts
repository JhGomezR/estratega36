
"use client"

import { useDoc, useFirestore, useMemoFirebase, useUser, usePlatformClaims } from "@/firebase"
import type { Role, User } from "@/lib/types"
import { permissionGroups } from "@/lib/types"
import { doc } from "firebase/firestore"
import { useMemo } from "react"

export function usePermissions() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const claims = usePlatformClaims()

  const userRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, `users/${authUser.uid}`) : null),
    [firestore, authUser]
  )
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef)

  const roleRef = useMemoFirebase(
    () => (firestore && user?.roleId ? doc(firestore, `roles/${user.roleId}`) : null),
    [firestore, user?.roleId]
  )
  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleRef)

  const permissions = useMemo(() => {
    // Platform operators (claim `platformAdmin`) get full access — this is what
    // grants total control when they enter a tenant ("impersonation"). Replaces
    // the previous hardcoded super-admin email.
    if (claims?.platformAdmin) {
        const allPermissions = new Set<string>();
        Object.keys(permissionGroups).forEach(module => {
            permissionGroups[module].forEach(action => {
                allPermissions.add(`${module}:${action}`);
            });
        });
        return allPermissions;
    }
    if (!role) return new Set<string>()
    return new Set(role.permissions)
  }, [role, claims])
  
  const hasPermission = (permission: string) => {
    return permissions.has(permission)
  }
  
  const hasAnyPermission = (permissionsToCheck: string[]) => {
      return permissionsToCheck.some(p => permissions.has(p));
  }

  // Admin del tenant (o operador de plataforma). Mismo criterio que el resto del
  // código: rol cuyo nombre incluye "admin"/"super". Los admin quedan exentos de
  // las restricciones de visibilidad por campaña.
  const isAdmin = useMemo(() => {
    if (claims?.platformAdmin) return true;
    const name = role?.name?.toLowerCase() || "";
    return name.includes("admin") || name.includes("super");
  }, [claims, role]);

  return {
    user,
    role,
    isAdmin,
    permissions,
    hasPermission,
    hasAnyPermission,
    isLoading: isAuthLoading || isUserLoading || isRoleLoading,
  }
}
