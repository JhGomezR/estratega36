"use client"

import * as React from "react"

const STORAGE_KEY = "estratega:sidebar-expanded"

type SidebarContextValue = {
  /** Barra lateral expandida en escritorio (>= lg). */
  isExpanded: boolean
  /** Barra lateral abierta como panel off-canvas en móvil. */
  isMobileOpen: boolean
  /** El puntero está sobre la barra lateral colapsada (expansión temporal). */
  isHovered: boolean
  /** La barra se muestra ancha: expandida, con hover o en móvil. */
  isWide: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setIsHovered: (value: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar debe usarse dentro de <SidebarProvider>")
  }
  return context
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)

  // Restaura la preferencia del usuario tras la hidratación.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setIsExpanded(stored === "true")
    } catch {
      // localStorage no disponible: se mantiene el valor por defecto.
    }
  }, [])

  const toggleSidebar = React.useCallback(() => {
    setIsExpanded((previous) => {
      const next = !previous
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // Ignorado a propósito.
      }
      return next
    })
  }, [])

  const toggleMobileSidebar = React.useCallback(() => {
    setIsMobileOpen((previous) => !previous)
  }, [])

  const closeMobileSidebar = React.useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      isExpanded,
      isMobileOpen,
      isHovered,
      isWide: isMobileOpen || isExpanded || isHovered,
      toggleSidebar,
      toggleMobileSidebar,
      closeMobileSidebar,
      setIsHovered,
    }),
    [
      isExpanded,
      isMobileOpen,
      isHovered,
      toggleSidebar,
      toggleMobileSidebar,
      closeMobileSidebar,
    ]
  )

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}
