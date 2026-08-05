import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Bell,
  BrainCircuit,
  Building,
  Calendar,
  FileText,
  GitFork,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Map,
  Palette,
  Phone,
  Radio,
  Shield,
  Target,
  UserCog,
  Users,
} from "lucide-react"

/**
 * Definición declarativa de la navegación principal.
 *
 * Los ítems y sus permisos son EXACTAMENTE los mismos que antes de la
 * migración al tema TailAdmin; sólo cambia su representación (datos en lugar
 * de JSX) para poder renderizarlos también en modo colapsado.
 */
export type NavLeaf = {
  href: string
  label: string
  icon: LucideIcon
  /** Permiso requerido (`hasPermission`). Sin valor: siempre visible. */
  permission?: string
  /** Módulo del plan requerido. Sin valor: no depende del plan. */
  module?: string
}

export type NavItem = NavLeaf | {
  label: string
  icon: LucideIcon
  /** Identificador estable del submenú (para el estado abierto/cerrado). */
  key: string
  children: NavLeaf[]
  /** Módulo del plan requerido para todo el submenú. */
  module?: string
}

export type NavSection = {
  /** Título de la sección. `null` para la sección principal sin encabezado. */
  title: string
  items: NavItem[]
  /** Permiso que gobierna la sección completa. */
  permission?: string
  /** Módulo del plan que gobierna la sección completa. */
  module?: string
}

export function isNavGroup(
  item: NavItem
): item is Extract<NavItem, { children: NavLeaf[] }> {
  return "children" in item
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menú",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      // Notificaciones del sistema: módulo de solo lectura SIEMPRE visible para
      // todo tenant (sin permiso ni módulo de plan). Solo listar/leer.
      { href: "/notifications", label: "Notificaciones", icon: Bell },
      {
        href: "/campaigns",
        label: "Campañas",
        icon: Target,
        permission: "campaign:read",
        module: "campaigns",
      },
      {
        href: "/voters",
        label: "Votantes",
        icon: Users,
        permission: "voter:read",
        module: "voters",
      },
      {
        href: "/map",
        label: "Mapa de Votantes",
        icon: Map,
        permission: "voter:read",
        module: "voters_map",
      },
      {
        href: "/network",
        label: "Mapa de Red",
        icon: GitFork,
        permission: "user:read",
        module: "network",
      },
      {
        key: "activities",
        label: "Actividades",
        icon: Activity,
        children: [
          {
            href: "/activities/calendar",
            label: "Calendario",
            icon: Calendar,
            permission: "task:read",
            module: "activities_calendar",
          },
          {
            href: "/activities/calls",
            label: "Llamadas",
            icon: Phone,
            permission: "call:read",
            module: "activities_calls",
          },
          {
            href: "/activities/tasks",
            label: "Tareas",
            icon: ListChecks,
            permission: "task:read",
            module: "activities_tasks",
          },
        ],
      },
    ],
  },
  {
    title: "Análisis IA",
    permission: "report:read",
    items: [
      {
        href: "/analysis",
        label: "Análisis de Campaña",
        icon: BrainCircuit,
        module: "analysis_campaign",
      },
      {
        href: "/strategies",
        label: "Generador de Estrategias",
        icon: Lightbulb,
        module: "analysis_strategies",
      },
      {
        href: "/social-listening",
        label: "Escucha Social",
        icon: Radio,
        module: "analysis_social",
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        href: "/administration/roles",
        label: "Roles",
        icon: Shield,
        permission: "role:read",
        module: "admin_roles",
      },
      {
        href: "/administration/users",
        label: "Usuarios",
        icon: UserCog,
        permission: "user:read",
        module: "admin_users",
      },
      {
        href: "/administration/cities",
        label: "Ciudades",
        icon: Building,
        permission: "city:read",
        module: "admin_cities",
      },
      {
        href: "/administration/forms",
        label: "Formularios",
        icon: FileText,
        permission: "form:read",
        module: "admin_forms",
      },
      {
        href: "/administration/settings",
        label: "Configuración",
        icon: Palette,
        permission: "setting:update",
        module: "admin_settings",
      },
    ],
  },
]

/**
 * Módulo del plan requerido por una ruta (o `undefined` si no depende del plan,
 * p. ej. el Dashboard). Se usa para bloquear el acceso directo por URL a un
 * módulo no incluido en el plan del tenant.
 */
export function moduleForPath(pathname: string): string | undefined {
  const matches = (href: string) => pathname === href || pathname.startsWith(href + "/")
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (isNavGroup(item)) {
        for (const child of item.children) {
          if (matches(child.href)) return child.module ?? item.module ?? section.module
        }
      } else if (matches(item.href)) {
        return item.module ?? section.module
      }
    }
  }
  return undefined
}

/** Etiquetas en español para las migas de pan, derivadas de la navegación. */
export const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/profile": "Perfil",
  "/activities": "Actividades",
  "/administration": "Administración",
  ...Object.fromEntries(
    NAV_SECTIONS.flatMap((section) =>
      section.items.flatMap((item) =>
        isNavGroup(item)
          ? item.children.map((child) => [child.href, child.label] as const)
          : [[item.href, item.label] as const]
      )
    )
  ),
}
