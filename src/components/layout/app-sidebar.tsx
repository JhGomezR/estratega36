"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ChevronDown, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import { useAllowedModules } from "@/firebase"
import { useSidebar } from "./sidebar-context"
import {
  isNavGroup,
  NAV_SECTIONS,
  type NavItem,
  type NavLeaf,
  type NavSection,
} from "./nav-config"

export const IconEstratega = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM11 12H13V18H11V12ZM11 8H13V10H11V8Z" />
  </svg>
)

function useIsActive() {
  const pathname = usePathname()
  return React.useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  )
}

const menuItemClasses =
  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-theme-sm font-medium transition-colors duration-200"

const inactiveClasses =
  "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"

const activeClasses = "bg-sidebar-accent text-sidebar-accent-foreground"

function SidebarLink({
  item,
  nested = false,
}: {
  item: NavLeaf
  nested?: boolean
}) {
  const { isWide, closeMobileSidebar } = useSidebar()
  const isActive = useIsActive()(item.href)
  const Icon = item.icon

  return (
    <li>
      <Link
        href={item.href}
        onClick={closeMobileSidebar}
        aria-current={isActive ? "page" : undefined}
        aria-label={!isWide ? item.label : undefined}
        title={!isWide ? item.label : undefined}
        className={cn(
          menuItemClasses,
          isActive ? activeClasses : inactiveClasses,
          !isWide && "justify-center px-0",
          nested && "py-2 text-theme-sm"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            nested && "h-4 w-4",
            isActive ? "text-sidebar-accent-foreground" : "text-sidebar-muted"
          )}
          aria-hidden="true"
        />
        {isWide && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  )
}

function SidebarGroup({
  item,
  visibleChildren,
}: {
  item: Extract<NavItem, { children: NavLeaf[] }>
  visibleChildren: NavLeaf[]
}) {
  const { isWide } = useSidebar()
  const isActive = useIsActive()
  const containsActive = visibleChildren.some((child) => isActive(child.href))
  const [isOpen, setIsOpen] = React.useState(containsActive)
  const Icon = item.icon
  const contentId = `nav-group-${item.key}`

  React.useEffect(() => {
    if (containsActive) setIsOpen(true)
  }, [containsActive])

  return (
    <li>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={!isWide ? item.label : undefined}
        title={!isWide ? item.label : undefined}
        className={cn(
          menuItemClasses,
          containsActive ? activeClasses : inactiveClasses,
          !isWide && "justify-center px-0"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            containsActive
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-muted"
          )}
          aria-hidden="true"
        />
        {isWide && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </>
        )}
      </button>
      {isWide && isOpen && (
        <ul
          id={contentId}
          className="mt-1 space-y-1 border-l border-sidebar-border pl-4 ml-5"
        >
          {visibleChildren.map((child) => (
            <SidebarLink key={child.href} item={child} nested />
          ))}
        </ul>
      )}
    </li>
  )
}

function SidebarSection({ section }: { section: NavSection }) {
  const { hasPermission } = usePermissions()
  const allowed = useAllowedModules()
  const { isWide } = useSidebar()

  // Módulo permitido por el plan del tenant (null = todos).
  const moduleOk = (module?: string) => !module || allowed === null || allowed.has(module)

  if (section.permission && !hasPermission(section.permission)) return null
  if (!moduleOk(section.module)) return null

  const items = section.items
    .map((item) => {
      if (isNavGroup(item)) {
        if (!moduleOk(item.module)) return null
        const children = item.children.filter(
          (child) => (!child.permission || hasPermission(child.permission)) && moduleOk(child.module)
        )
        return children.length > 0 ? { item, children } : null
      }
      return (!item.permission || hasPermission(item.permission)) && moduleOk(item.module)
        ? { item, children: [] as NavLeaf[] }
        : null
    })
    .filter(Boolean) as Array<{ item: NavItem; children: NavLeaf[] }>

  if (items.length === 0) return null

  return (
    <div>
      <h3
        className={cn(
          "mb-3 flex text-theme-xs font-semibold uppercase leading-5 tracking-wider text-sidebar-muted",
          isWide ? "px-3" : "justify-center"
        )}
      >
        {isWide ? (
          section.title
        ) : (
          <>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{section.title}</span>
          </>
        )}
      </h3>
      <ul className="flex flex-col gap-1">
        {items.map(({ item, children }) =>
          isNavGroup(item) ? (
            <SidebarGroup key={item.key} item={item} visibleChildren={children} />
          ) : (
            <SidebarLink key={item.href} item={item} />
          )
        )}
      </ul>
    </div>
  )
}

export function AppSidebar({ logoUrl }: { logoUrl?: string }) {
  const { isWide, isExpanded, isMobileOpen, setIsHovered, closeMobileSidebar } =
    useSidebar()

  return (
    <>
      {/* Capa oscura para el panel off-canvas en móvil */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Navegación principal"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar px-4",
          "transition-[width,transform] duration-300 ease-in-out",
          isWide ? "w-[290px]" : "w-[90px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center lg:h-[72px]",
            isWide ? "justify-start px-1" : "justify-center"
          )}
        >
          <Link
            href="/"
            onClick={closeMobileSidebar}
            className="flex items-center gap-2.5 rounded-lg"
            aria-label="Estratega 360 — ir al inicio"
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo de la campaña"
                width={140}
                height={36}
                className={cn(
                  "h-9 w-auto object-contain",
                  !isWide && "h-8 w-8 object-cover"
                )}
              />
            ) : (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconEstratega className="h-5 w-5" />
                </span>
                {isWide && (
                  <span className="text-theme-xl font-semibold tracking-tight text-foreground">
                    Estratega
                    <span className="text-primary">360</span>
                  </span>
                )}
              </>
            )}
          </Link>
        </div>

        <nav className="custom-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto pb-6 pt-2">
          {NAV_SECTIONS.map((section) => (
            <SidebarSection key={section.title} section={section} />
          ))}
        </nav>
      </aside>
    </>
  )
}
