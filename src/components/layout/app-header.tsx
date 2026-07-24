"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/usePermissions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "./sidebar-context"
import { ThemeToggle } from "./theme-toggle"
import { UserNav } from "./user-nav"
import { isNavGroup, NAV_SECTIONS, type NavLeaf } from "./nav-config"

const iconButtonClasses =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"

/** Buscador rápido: filtra y navega por las secciones del menú. */
function QuickSearch() {
  const { hasPermission } = usePermissions()
  const [query, setQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const destinations = React.useMemo<NavLeaf[]>(
    () =>
      NAV_SECTIONS.filter(
        (section) => !section.permission || hasPermission(section.permission)
      )
        .flatMap((section) =>
          section.items.flatMap((item) =>
            isNavGroup(item) ? item.children : [item]
          )
        )
        .filter((item) => !item.permission || hasPermission(item.permission)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPermission]
  )

  const results = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return destinations
      .filter((item) => item.label.toLowerCase().includes(needle))
      .slice(0, 6)
  }, [query, destinations])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === "Escape") setIsOpen(false)
    }
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onClick)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <label htmlFor="quick-search" className="sr-only">
        Buscar en el menú
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="quick-search"
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={isOpen && results.length > 0}
        aria-controls="quick-search-results"
        autoComplete="off"
        placeholder="Buscar sección o página..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className="h-11 w-full rounded-lg border border-border bg-transparent py-2.5 pl-11 pr-14 text-theme-sm text-foreground shadow-theme-xs placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 xl:w-[420px]"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-muted px-2 py-1 text-theme-xs font-medium text-muted-foreground">
        ⌘K
      </kbd>

      {isOpen && results.length > 0 && (
        <ul
          id="quick-search-results"
          className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-theme-lg"
        >
          {results.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => {
                  setIsOpen(false)
                  setQuery("")
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-theme-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(iconButtonClasses, "relative")}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <p className="px-2 py-6 text-center text-theme-sm text-muted-foreground">
          No tienes notificaciones nuevas.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppHeader({ onLogout }: { onLogout: () => void }) {
  const {
    isExpanded,
    isMobileOpen,
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
  } = useSidebar()
  const pathname = usePathname()

  // Cierra el panel móvil al cambiar de ruta.
  React.useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-[72px] lg:py-0">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileOpen}
            className={cn(iconButtonClasses, "h-10 w-10 lg:hidden")}
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              isExpanded ? "Colapsar barra lateral" : "Expandir barra lateral"
            }
            aria-expanded={isExpanded}
            className={cn(iconButtonClasses, "hidden lg:inline-flex")}
          >
            {isExpanded ? (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <QuickSearch />
        </div>

        <div className="flex items-center gap-2 2xsm:gap-3">
          <ThemeToggle />
          <NotificationsMenu />
          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <UserNav onLogout={onLogout} />
        </div>
      </div>
    </header>
  )
}
