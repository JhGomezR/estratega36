
"use client"

import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import type { Role, User } from "@/lib/types"
import { permissionGroups } from "@/lib/types"
import { doc } from "firebase/firestore"
import { useMemo } from "react"

export function usePermissions() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()

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
    if (user?.email === 'axdrcys@gmail.com') {
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
  }, [role, user])
  
  const hasPermission = (permission: string) => {
    return permissions.has(permission)
  }
  
  const hasAnyPermission = (permissionsToCheck: string[]) => {
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
