"use client"

import * as React from "react"

export interface PagedSearch<T> {
  query: string
  setQuery: (q: string) => void
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  totalPages: number
  /** Nº de elementos tras filtrar por búsqueda. */
  total: number
  /** Nº de elementos sin filtrar. */
  allTotal: number
  pageItems: T[]
  /** Rango 1-based mostrado (para "Mostrando X–Y de Z"). */
  pageStart: number
  pageEnd: number
}

/**
 * Búsqueda + paginación en cliente para listas. `getText` devuelve el texto
 * buscable de cada elemento; la búsqueda es un `includes` insensible a mayúsc.
 */
export function usePagedSearch<T>(
  items: T[],
  getText: (item: T) => string,
  pageSize = 10
): PagedSearch<T> {
  const [query, setQueryRaw] = React.useState("")
  const [page, setPage] = React.useState(0)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => getText(i).toLowerCase().includes(q))
  }, [items, query, getText])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // No dejar una página fuera de rango si la lista se encoge o se filtra.
  React.useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1)
  }, [page, totalPages])

  const setQuery = React.useCallback((q: string) => {
    setQueryRaw(q)
    setPage(0)
  }, [])

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const pageStart = total === 0 ? 0 : page * pageSize + 1
  const pageEnd = Math.min(total, page * pageSize + pageSize)

  return { query, setQuery, page, setPage, totalPages, total, allTotal: items.length, pageItems, pageStart, pageEnd }
}
