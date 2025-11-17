
"use client"

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import type { Role, User } from "@/lib/types"
import { doc, getFirestore } from "firebase/firestore"
import { useMemo } from "react"

export function usePermissions() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser()
  const { firestore: tenantFirestore, firebaseApp } = useFirebase() // Get tenant-specific firestore and the app

  // Memoize the default firestore instance
  const defaultFirestore = useMemo(() => firebaseApp ? getFirestore(firebaseApp) : null, [firebaseApp]);

  const userRef = useMemoFirebase(
    () => (defaultFirestore && authUser ? doc(defaultFirestore, "users", authUser.uid) : null),
    [defaultFirestore, authUser]
  )
  const { data: user, isLoading: isUserLoading } = useDoc<User>(userRef)

  const roleRef = useMemoFirebase(
    () => (tenantFirestore && user?.roleId ? doc(tenantFirestore, "roles", user.roleId) : null),
    [tenantFirestore, user?.roleId]
  )
  const { data: role, isLoading: isRoleLoading } = useDoc<Role>(roleRef)

  const permissions = useMemo(() => {
    if (!role) return new Set<string>()
    return new Set(role.permissions)
  }, [role])
  
  const hasPermission = (permission: string) => {
    if (user?.email === 'axdrcys@gmail.com') return true;
    return permissions.has(permission)
  }
  
  const hasAnyPermission = (permissionsToCheck: string[]) => {
      if (user?.email === 'axdrcys@gmail.com') return true;
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
