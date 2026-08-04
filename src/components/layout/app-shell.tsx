"use client"

import * as React from "react"
import { doc } from "firebase/firestore"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { useDoc, useFirestore, useMemoFirebase, useAllowedModules } from "@/firebase"
import type { BrandingSettings } from "@/lib/types"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { ImpersonationBanner } from "./impersonation-banner"
import { PageBreadcrumb } from "./page-breadcrumb"
import { moduleForPath } from "./nav-config"
import { SidebarProvider, useSidebar } from "./sidebar-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function AppShellLayout({
  children,
  onLogout,
  logoUrl,
}: {
  children: React.ReactNode
  onLogout: () => void
  logoUrl?: string
}) {
  // El margen sigue sólo al estado fijado: al pasar el ratón sobre la barra
  // colapsada ésta se superpone en lugar de desplazar el contenido.
  const { isExpanded } = useSidebar()

  return (
    <div className="min-h-screen bg-canvas">
      <AppSidebar logoUrl={logoUrl} />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out",
          isExpanded ? "lg:ml-[290px]" : "lg:ml-[90px]"
        )}
      >
        <AppHeader onLogout={onLogout} />
        <ImpersonationBanner />
        <main className="mx-auto w-full max-w-[1536px] flex-1 p-4 md:p-6">
          <PageBreadcrumb className="mb-4" />
          <div className="flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function AppShell({
  children,
  onLogout,
}: {
  children: React.ReactNode
  onLogout: () => void
}) {
  const firestore = useFirestore()
  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "settings", "branding") : null),
    [firestore]
  )
  const { data: settings } = useDoc<BrandingSettings>(settingsRef)

  // Guard de PLAN: bloquea el acceso directo por URL a un módulo que el plan
  // del tenant no incluye (el sidebar ya lo oculta; esto cubre la URL directa).
  // En vez de redirigir en silencio, avisa con un modal y, al cerrarlo, regresa
  // a la última ruta permitida donde estaba el usuario.
  const pathname = usePathname()
  const router = useRouter()
  const allowedModules = useAllowedModules()
  const [blockedModule, setBlockedModule] = React.useState<string | null>(null)
  const lastAllowedPath = React.useRef<string>("/")

  React.useEffect(() => {
    if (allowedModules === null) {
      lastAllowedPath.current = pathname
      return // todos los módulos permitidos
    }
    const mod = moduleForPath(pathname)
    if (mod && !allowedModules.has(mod)) {
      setBlockedModule(mod)
    } else {
      lastAllowedPath.current = pathname
    }
  }, [allowedModules, pathname])

  const closeBlocked = () => {
    setBlockedModule(null)
    router.replace(lastAllowedPath.current || "/")
  }

  // Personalización por inquilino (marca blanca).
  //
  // `sidebarColor` ya NO se aplica a propósito. La barra lateral de TailAdmin es
  // clara con texto oscuro, y el valor guardado en producción es azul marino
  // (`228 57% 18%`): sobrescribirlo dejaba el texto ilegible. El color de la
  // barra pasa a ser parte del sistema de diseño; la marca del inquilino se
  // expresa con `--primary` y `--accent`, que sí tienen pareja de contraste
  // definida. El campo se conserva en el modelo por compatibilidad.
  React.useEffect(() => {
    if (settings) {
      const root = document.documentElement
      if (settings.primaryColor)
        root.style.setProperty("--primary", settings.primaryColor)
      if (settings.accentColor)
        root.style.setProperty("--accent", settings.accentColor)
    }
  }, [settings])

  return (
    <SidebarProvider>
      <AppShellLayout onLogout={onLogout} logoUrl={settings?.logoUrl}>
        {children}
      </AppShellLayout>

      <AlertDialog open={blockedModule !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Módulo no disponible</AlertDialogTitle>
            <AlertDialogDescription>
              Tu plan actual no incluye este módulo, por lo que no tienes acceso.
              Si necesitas habilitarlo, contacta con el administrador de la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeBlocked}>Volver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
