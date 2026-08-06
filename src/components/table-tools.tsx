"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { PagedSearch } from "@/hooks/use-paged-search"

/** Caja de búsqueda rápida reutilizable para listas. */
export function TableSearch({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
      />
    </div>
  )
}

/** Pie de tabla con contador de registros y controles Anterior/Siguiente. */
export function TablePagination({
  paged,
  noun = "registros",
}: {
  paged: PagedSearch<unknown>
  noun?: string
}) {
  const { page, setPage, totalPages, total, pageStart, pageEnd } = paged
  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "Sin resultados" : `Mostrando ${pageStart}–${pageEnd} de ${total} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
          Siguiente <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
