import type { LucideIcon } from "lucide-react"
import {
  Activity,
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
}

export type NavItem = NavLeaf | {
  label: string
  icon: LucideIcon
  /** Identificador estable del submenú (para el estado abierto/cerrado). */
  key: string
  children: NavLeaf[]
}

export type NavSection = {
  /** Título de la sección. `null` para la sección principal sin encabezado. */
  title: string
  items: NavItem[]
  /** Permiso que gobierna la sección completa. */
  permission?: string
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
      {
        href: "/campaigns",
        label: "Campañas",
        icon: Target,
        permission: "campaign:read",
      },
      {
        href: "/voters",
        label: "Votantes",
        icon: Users,
        permission: "voter:read",
      },
      {
        href: "/map",
        label: "Mapa de Votantes",
        icon: Map,
        permission: "voter:read",
      },
      {
        href: "/network",
        label: "Mapa de Red",
        icon: GitFork,
        permission: "user:read",
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
          },
          {
            href: "/activities/calls",
            label: "Llamadas",
            icon: Phone,
            permission: "call:read",
          },
          {
            href: "/activities/tasks",
            label: "Tareas",
            icon: ListChecks,
            permission: "task:read",
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
      },
      {
        href: "/strategies",
        label: "Generador de Estrategias",
        icon: Lightbulb,
      },
      {
        href: "/social-listening",
        label: "Escucha Social",
        icon: Radio,
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
      },
      {
        href: "/administration/users",
        label: "Usuarios",
        icon: UserCog,
        permission: "user:read",
      },
      {
        href: "/administration/cities",
        label: "Ciudades",
        icon: Building,
        permission: "city:read",
      },
      {
        href: "/administration/forms",
        label: "Formularios",
        icon: FileText,
        permission: "form:read",
      },
      {
        href: "/administration/settings",
        label: "Configuración",
        icon: Palette,
        permission: "setting:update",
      },
    ],
  },
]

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
