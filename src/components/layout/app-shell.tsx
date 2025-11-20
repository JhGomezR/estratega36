"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  LogOut,
  Loader2,
  GitFork,
  Radio,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UserNav } from "./user-nav"
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase"
import { doc } from "firebase/firestore"
import type { BrandingSettings } from "@/lib/types"
import Image from "next/image"
import { signOut } from "firebase/auth"
import { usePermissions } from "@/hooks/usePermissions"
import { useMemo } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "../ui/scroll-area"

const IconEstratega = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM11 12H13V18H11V12ZM11 8H13V10H11V8Z" />
    </svg>
)

const NavItem = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
            )}
        >
            {icon}
            {label}
        </Link>
    );
};

const CollapsibleNavGroup = ({ label, icon, children, defaultOpen }: { label: string; icon: React.ReactNode; children: React.ReactNode, defaultOpen: boolean }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    const visibleChildren = React.Children.toArray(children).filter(Boolean);

    if (visibleChildren.length === 0) return null;

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    {label}
                </div>
                <svg className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 6l6 6l-6 6"/></svg>
            </button>
            {isOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-sidebar-border/50 flex flex-col gap-1">
                    {children}
                </div>
            )}
        </div>
    );
};


function MainNav() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const pathname = usePathname();
  const isActive = (path: string, exact: boolean = false) => exact ? pathname === path : pathname.startsWith(path);

  return (
        <nav className="grid items-start gap-1 text-sm font-medium">
            <NavItem href="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
            
            {hasPermission("campaign:read") && (
                <NavItem href="/campaigns" icon={<Target className="h-4 w-4" />} label="Campañas" />
            )}
            {hasPermission("voter:read") && (
                <NavItem href="/voters" icon={<Users className="h-4 w-4" />} label="Votantes" />
            )}
            {hasPermission("voter:read") && (
                <NavItem href="/map" icon={<Map className="h-4 w-4" />} label="Mapa de Votantes" />
            )}
            {hasPermission("user:read") && (
                 <NavItem href="/network" icon={<GitFork className="h-4 w-4" />} label="Mapa de Red" />
            )}

            <CollapsibleNavGroup label="Actividades" icon={<Activity className="h-4 w-4" />} defaultOpen={isActive("/activities")}>
                {hasPermission("task:read") && <NavItem href="/activities/calendar" icon={<Calendar className="h-4 w-4" />} label="Calendario" />}
                {hasPermission("call:read") && <NavItem href="/activities/calls" icon={<Phone className="h-4 w-4" />} label="Llamadas" />}
                {hasPermission("task:read") && <NavItem href="/activities/tasks" icon={<ListChecks className="h-4 w-4" />} label="Tareas" />}
            </CollapsibleNavGroup>

            {hasPermission("report:read") && (
                <>
                    <h3 className="px-3 mt-4 mb-1 text-xs font-semibold text-sidebar-foreground/70 tracking-wider">Análisis IA</h3>
                    <NavItem href="/analysis" icon={<BrainCircuit className="h-4 w-4" />} label="Análisis de Campaña" />
                    <NavItem href="/strategies" icon={<Lightbulb className="h-4 w-4" />} label="Generador de Estrategias" />
                    <NavItem href="/social-listening" icon={<Radio className="h-4 w-4" />} label="Escucha Social" />
                </>
            )}

            <div className="mt-auto">
                 <CollapsibleNavGroup label="Administración" icon={<Settings className="h-4 w-4" />} defaultOpen={isActive("/administration")}>
                    {hasPermission("role:read") && <NavItem href="/administration/roles" icon={<Shield className="h-4 w-4" />} label="Roles" />}
                    {hasPermission("user:read") && <NavItem href="/administration/users" icon={<UserCog className="h-4 w-4" />} label="Usuarios" />}
                    {hasPermission("city:read") && <NavItem href="/administration/cities" icon={<Building className="h-4 w-4" />} label="Ciudades" />}
                    {hasPermission("setting:update") && <NavItem href="/administration/settings" icon={<Palette className="h-4 w-4" />} label="Configuración" />}
                </CollapsibleNavGroup>
            </div>
        </nav>
  );
}


function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { role, hasPermission, hasAnyPermission, isLoading: permissionsLoading } = usePermissions();
    const pathname = usePathname();

    const settingsRef = useMemoFirebase(() => firestore ? doc(firestore, "settings", "branding") : null, [firestore]);
    const { data: settings } = useDoc<BrandingSettings>(settingsRef);
    
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
        return links;
    }, [hasPermission, hasAnyPermission]);

    React.useEffect(() => {
        if (permissionsLoading) return;

        const adminRoles = ['admin', 'super', 'super_admin', 'administrador'];
        const isAdmin = role?.name && adminRoles.includes(role.name.toLowerCase());
        
        if (!isAdmin && navLinks.length > 1 && pathname === '/') {
        const firstModule = navLinks.filter(p => p !== '/').sort()[0];
        if (firstModule) {
            router.replace(firstModule);
        }
        }
    }, [permissionsLoading, navLinks, pathname, router, role]);


    React.useEffect(() => {
        if (settings) {
        const root = document.documentElement;
        if (settings.primaryColor) root.style.setProperty('--primary', settings.primaryColor);
        if (settings.accentColor) root.style.setProperty('--accent', settings.accentColor);
        if (settings.sidebarColor) root.style.setProperty('--sidebar-background', settings.sidebarColor);
        }
    }, [settings]);

    if (permissionsLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-sidebar md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-primary">
                            <IconEstratega className="h-6 w-6" />
                            <span className="">EstrategaCRM</span>
                        </Link>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="py-4 px-2">
                            <MainNav />
                        </div>
                    </ScrollArea>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 backdrop-blur-sm">
                <Sheet>
                    <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col bg-sidebar p-0">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-primary">
                            <IconEstratega className="h-6 w-6" />
                            <span className="">EstrategaCRM</span>
                        </Link>
                    </div>
                    <ScrollArea className="flex-1">
                            <div className="py-4 px-2">
                            <MainNav />
                            </div>
                    </ScrollArea>
                    </SheetContent>
                </Sheet>
                <div className="w-full flex-1 flex justify-center">
                    {settings?.logoUrl ? (
                            <Image src={settings.logoUrl} alt="Logo de Campaña" width={120} height={40} className="object-contain h-10 w-auto"/>
                        ) : (
                            <span className="font-semibold text-lg text-primary invisible md:visible">EstrategaCRM</span>
                    )}
                </div>
                <UserNav />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
                {children}
                </main>
            </div>
        </div>
    )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  React.useEffect(() => {
    // Redirect to login if not authenticated and not on a public page
    if (!isUserLoading && !user && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    }
  }, [isUserLoading, user, router, pathname]);

  // For public pages, just render the children
  if (pathname === '/login' || pathname === '/signup') {
    return <>{children}</>;
  }

  // While checking auth state, show a global loader
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  // If authenticated, render the full app shell
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
