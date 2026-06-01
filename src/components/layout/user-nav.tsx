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
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import type { User } from "@/lib/types"
import { LogOut, User as UserIcon } from "lucide-react"

export function UserNav({ onLogout }: { onLogout: () => void }) {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  
  const userRef = useMemoFirebase(() => {
    return firestore && authUser ? doc(firestore, `users`, authUser.uid) : null
  }, [firestore, authUser]);

  const { data: user } = useDoc<User>(userRef);

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
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
