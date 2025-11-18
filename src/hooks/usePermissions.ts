
"use client"

import { useDoc, useFirestore, useMemoFirebase, useTenant, useUser } from "@/firebase"
import type { Role, User } from "@/lib/types"
import { doc } from "firebase/firestore"
import { useMemo } from "react"

export function usePermissions() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const tenantId = useTenant();

  const userRef = useMemoFirebase(
    () => (firestore && authUser && tenantId ? doc(firestore, `tenants/${tenantId}/users/${authUser.uid}`) : null),
    [firestore, authUser, tenantId]
  )
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef)

  const roleRef = useMemoFirebase(
    () => (firestore && user?.roleId && tenantId ? doc(firestore, `tenants/${tenantId}/roles/${user.roleId}`) : null),
    [firestore, user?.roleId, tenantId]
  )
  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleRef)

  const permissions = useMemo(() => {
    if (!role) return new Set<string>()
    return new Set(role.permissions)
  }, [role])
  
  const hasPermission = (permission: string) => {
    // Super admin bypass
    if (authUser?.email === 'axdrcys@gmail.com') return true;
    return permissions.has(permission)
  }
  
  const hasAnyPermission = (permissionsToCheck: string[]) => {
      if (authUser?.email === 'axdrcys@gmail.com') return true;
      return permissionsToCheck.some(p => permissions.has(p));
  }

  return {
    user,
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    isLoading: isAuthLoading || isUserLoading || isRoleLoading,
  }
}
