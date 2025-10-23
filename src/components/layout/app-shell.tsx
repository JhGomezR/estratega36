"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Target,
  Users,
  Map,
  Activity,
  Calendar,
  Phone,
  ListChecks,
  BrainCircuit,
  Lightbulb,
  Settings,
  Shield,
  UserCog,
  Building,
  Palette,
  ChevronsRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { UserNav } from "./user-nav"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import type { BrandingSettings } from "@/lib/types"
import Image from "next/image"

const IconEstratega = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM11 12H13V18H11V12ZM11 8H13V10H11V8Z" />
    </svg>
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "branding") : null, [firestore]);
  const { data: settings } = useDoc<BrandingSettings>(settingsRef);

  const isActive = (path: string, exact: boolean = false) => {
    return exact ? pathname === path : pathname.startsWith(path)
  }
  
  React.useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      if (settings.primaryColor) root.style.setProperty('--primary', settings.primaryColor);
      if (settings.accentColor) root.style.setProperty('--accent', settings.accentColor);
      if (settings.sidebarColor) root.style.setProperty('--sidebar-background', settings.sidebarColor);
    }
  }, [settings]);

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            {settings?.logoUrl ? (
                <Image src={settings.logoUrl} alt="Logo" width={32} height={32} className="size-8"/>
            ) : (
                <IconEstratega className="size-8 text-sidebar-primary" />
            )}
            <span className="text-lg font-semibold text-sidebar-foreground">EstrategaCRM</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/", true)} tooltip="Dashboard">
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/campaigns")} tooltip="Campañas">
                <Link href="/campaigns">
                  <Target />
                  <span>Campañas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/voters")} tooltip="Votantes">
                <Link href="/voters">
                  <Users />
                  <span>Votantes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/map")} tooltip="Mapa">
                <Link href="/map">
                  <Map />
                  <span>Mapa de Votantes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            <AppShellCollapsibleGroup
              icon={<Activity />}
              label="Actividades"
              isActive={isActive("/activities")}
            >
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/calendar")} tooltip="Calendario">
                  <Link href="/activities/calendar"><Calendar className="size-3.5"/><span>Calendario</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/calls")} tooltip="Llamadas">
                  <Link href="/activities/calls"><Phone className="size-3.5"/><span>Llamadas</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/tasks")} tooltip="Tareas">
                  <Link href="/activities/tasks"><ListChecks className="size-3.5"/><span>Tareas</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </AppShellCollapsibleGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Análisis IA</SidebarGroupLabel>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/analysis")} tooltip="Análisis de Campaña">
                  <Link href="/analysis">
                    <BrainCircuit />
                    <span>Análisis de Campaña</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/strategies")} tooltip="Estrategias">
                  <Link href="/strategies">
                    <Lightbulb />
                    <span>Generador de Estrategias</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <AppShellCollapsibleGroup
              icon={<Settings />}
              label="Administración"
              isActive={isActive("/administration")}
            >
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/roles")} tooltip="Roles">
                  <Link href="/administration/roles"><Shield className="size-3.5"/><span>Roles</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/users")} tooltip="Usuarios">
                  <Link href="/administration/users"><UserCog className="size-3.5"/><span>Usuarios</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/cities")} tooltip="Ciudades">
                  <Link href="/administration/cities"><Building className="size-3.5"/><span>Ciudades</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/settings")} tooltip="Configuración">
                  <Link href="/administration/settings"><Palette className="size-3.5"/><span>Configuración</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </AppShellCollapsibleGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="flex md:hidden" />
            <div className="flex-1">
                {/* Potentially breadcrumbs here */}
            </div>
            <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppShellCollapsibleGroup({ children, icon, label, isActive }: { children: React.ReactNode, icon: React.ReactNode, label: string, isActive: boolean }) {
  const { state } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(isActive);

  React.useEffect(() => {
    if (state === 'collapsed') {
      setIsOpen(false);
    }
  }, [state]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <SidebarMenuButton
          variant="default"
          className="w-full justify-start"
          isActive={isActive && !isOpen}
        >
          {icon}
          <span>{label}</span>
          <ChevronsRight className={cn("ml-auto transition-transform duration-200", isOpen && "rotate-90")} />
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="mx-3.5 border-l border-sidebar-border py-2 pl-2.5">
          {children}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}
