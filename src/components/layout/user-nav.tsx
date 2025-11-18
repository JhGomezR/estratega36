
"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useDoc, useFirestore, useMemoFirebase, useTenant } from "@/firebase"
import { doc } from "firebase/firestore"
import type { User } from "@/lib/types"
import { LogOut, User as UserIcon } from "lucide-react"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

export function UserNav() {
  const { user: authUser } = useAuth();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const tenantId = useTenant();
  
  const userRef = useMemoFirebase(() => {
    return firestore && authUser && tenantId ? doc(firestore, `tenants/${tenantId}/users`, authUser.uid) : null
  }, [firestore, authUser, tenantId]);

  const { data: user } = useDoc<User>(userRef);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={user?.avatar} alt={user?.firstName} data-ai-hint="person portrait" />
            <AvatarFallback>
              {user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '..'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user ? `${user.firstName} ${user.lastName}` : "Usuario"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || "cargando..."}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserIcon className="mr-2" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
