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
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react"

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
        <Button
          variant="ghost"
          className="h-11 gap-2 rounded-full px-1.5 sm:pr-3"
          aria-label="Abrir menú de usuario"
        >
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user?.avatar} alt={user?.firstName} data-ai-hint="person portrait" />
            <AvatarFallback className="bg-brand-50 text-theme-xs font-semibold text-primary dark:bg-brand-950">
              {user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '..'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[9rem] truncate text-theme-sm font-medium text-foreground sm:inline">
            {user ? user.firstName : "Usuario"}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" forceMount>
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
