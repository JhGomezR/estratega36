
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  LogOut,
  Loader2,
  GitFork,
  Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { UserNav } from "./user-nav"
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import type { BrandingSettings } from "@/lib/types"
import Image from "next/image"
import { signOut } from "firebase/auth"
import { usePermissions } from "@/hooks/usePermissions"
import { useMemo } from "react"
import { ThemeProvider, useTheme } from "next-themes"

const IconEstratega = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM11 12H13V18H11V12ZM11 8H13V10H11V8Z" />
    </svg>
)

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { role, hasPermission, hasAnyPermission, isLoading: permissionsLoading } = usePermissions();

  const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "branding") : null, [firestore]);
  const { data: settings } = useDoc<BrandingSettings>(settingsRef);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const navLinks = useMemo(() => {
    const links = ["/"]; // Start with Dashboard as the base link
    if (hasPermission("campaign:read")) links.push("/campaigns");
    if (hasPermission("voter:read")) {
      links.push("/voters");
      links.push("/map");
    }
    if (hasPermission("user:read")) links.push("/network");
    if (hasAnyPermission(["task:read", "call:read"])) {
        if(hasPermission("task:read")) links.push("/activities/calendar");
        if(hasPermission("call:read")) links.push("/activities/calls");
        if(hasPermission("task:read")) links.push("/activities/tasks");
    }
    if(hasPermission("report:read")) {
        links.push("/analysis");
        links.push("/strategies");
        links.push("/social-listening");
    }
    // Admin links are sorted separately and not used for auto-redirect
    if (hasPermission("role:read")) links.push("/administration/roles");
    if (hasPermission("user:read")) links.push("/administration/users");
    if (hasPermission("city:read")) links.push("/administration/cities");
    if (hasPermission("setting:update")) links.push("/administration/settings");
    
    return links;
  }, [hasPermission, hasAnyPermission]);

 React.useEffect(() => {
    if (permissionsLoading) return;

    const adminRoles = ['admin', 'super', 'super_admin', 'administrador'];
    const isAdmin = role?.name && adminRoles.includes(role.name.toLowerCase());
    
    // Only redirect if it's not an admin and they are on the dashboard
    if (!isAdmin && navLinks.length > 1 && pathname === '/') {
      const firstModule = navLinks.filter(p => p !== '/').sort()[0];
      if (firstModule) {
        router.replace(firstModule);
      }
    }
  }, [permissionsLoading, navLinks, pathname, router, role]);


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

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  }

  if (isUserLoading || !user || permissionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader>
            <div className="flex items-center justify-center p-2">
                <IconEstratega className="size-8 text-sidebar-primary" />
                <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">EstrategaCRM</span>
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
            
            {hasPermission("campaign:read") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/campaigns")} tooltip="Campañas">
                  <Link href="/campaigns">
                    <Target />
                    <span>Campañas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {hasPermission("voter:read") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/voters")} tooltip="Votantes">
                  <Link href="/voters">
                    <Users />
                    <span>Votantes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            {hasPermission("voter:read") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/map")} tooltip="Mapa de Votantes">
                  <Link href="/map">
                    <Map />
                    <span>Mapa de Votantes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {hasPermission("user:read") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/network")} tooltip="Mapa de Red">
                  <Link href="/network">
                    <GitFork />
                    <span>Mapa de Red</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            {hasAnyPermission(["task:read", "call:read"]) && (
              <AppShellCollapsibleGroup
                icon={<Activity />}
                label="Actividades"
                isActive={isActive("/activities")}
              >
                {hasPermission("task:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/calendar")} tooltip="Calendario">
                      <Link href="/activities/calendar"><Calendar className="size-3.5"/><span>Calendario</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission("call:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/calls")} tooltip="Llamadas">
                      <Link href="/activities/calls"><Phone className="size-3.5"/><span>Llamadas</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission("task:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/activities/tasks")} tooltip="Tareas">
                      <Link href="/activities/tasks"><ListChecks className="size-3.5"/><span>Tareas</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </AppShellCollapsibleGroup>
            )}

            {hasPermission("report:read") && (
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/social-listening")} tooltip="Escucha Social">
                    <Link href="/social-listening">
                      <Radio />
                      <span>Escucha Social</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
            )}

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            {hasAnyPermission(["role:read", "user:read", "city:read", "setting:update"]) && (
              <AppShellCollapsibleGroup
                icon={<Settings />}
                label="Administración"
                isActive={isActive("/administration")}
              >
                {hasPermission("role:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/roles")} tooltip="Roles">
                      <Link href="/administration/roles"><Shield className="size-3.5"/><span>Roles</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission("user:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/users")} tooltip="Usuarios">
                      <Link href="/administration/users"><UserCog className="size-3.5"/><span>Usuarios</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission("city:read") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/cities")} tooltip="Ciudades">
                      <Link href="/administration/cities"><Building className="size-3.5"/><span>Ciudades</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {hasPermission("setting:update") && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm" isActive={isActive("/administration/settings")} tooltip="Configuración">
                      <Link href="/administration/settings"><Palette className="size-3.5"/><span>Configuración</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </AppShellCollapsibleGroup>
            )}
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar Sesión">
                    <LogOut />
                    <span>Cerrar Sesión</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="flex md:hidden" />
            <div className="flex-1 flex justify-center items-center">
                 {settings?.logoUrl ? (
                    <Image src={settings.logoUrl} alt="Logo de Campaña" width={120} height={40} className="object-contain h-10 w-auto"/>
                ) : (
                    <span className="font-semibold text-lg text-primary">EstrategaCRM</span>
                )}
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

  const visibleChildren = React.Children.toArray(children).filter(Boolean);
  if (visibleChildren.length === 0) {
    return null;
  }

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
          {visibleChildren}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppShellContent>{children}</AppShellContent>
    </ThemeProvider>
  )
}
