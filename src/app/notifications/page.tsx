"use client"

import * as React from "react"
import { collection, query, where } from "firebase/firestore"
import { Bell, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import {
  useCollection,
  useDefaultDb,
  useMemoFirebase,
  usePlatformClaims,
} from "@/firebase"
import type { Notification } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PAGE_SIZE = 10

/**
 * Módulo de notificaciones del sistema (lado tenant, SOLO lectura).
 *
 * Lista TODAS las notificaciones vigentes del tenant —difusiones y las
 * dirigidas a él— con paginación. El tenant únicamente puede leerlas; la
 * gestión (crear/editar/borrar) vive en el Control Plane. Fuente única:
 * `(default)/notifications`.
 */
export default function TenantNotificationsPage() {
  const claims = usePlatformClaims()
  const tenantId = claims?.tenantId
  const defaultDb = useDefaultDb()

  const broadcastQuery = useMemoFirebase(
    () => query(collection(defaultDb, "notifications"), where("audience", "==", "all")),
    [defaultDb]
  )
  const mineQuery = useMemoFirebase(
    () =>
      tenantId
        ? query(collection(defaultDb, "notifications"), where("tenantId", "==", tenantId))
        : null,
    [defaultDb, tenantId]
  )

  const { data: broadcast, isLoading: loadingA } = useCollection<Notification>(broadcastQuery)
  const { data: mine, isLoading: loadingB } = useCollection<Notification>(mineQuery)

  const items = React.useMemo(() => {
    const byId = new Map<string, Notification>()
    for (const n of [...(broadcast || []), ...(mine || [])]) {
      if (n.status !== "inactivo") byId.set(n.id, n)
    }
    return [...byId.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [broadcast, mine])

  const isLoading = loadingA || loadingB
  const [page, setPage] = React.useState(0)
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  // Si el listado se encoge (p. ej. el admin borra una), no dejar una página vacía.
  React.useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1)
  }, [page, totalPages])
  const pageItems = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const [selected, setSelected] = React.useState<Notification | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground">Avisos del sistema. Solo lectura.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja de notificaciones</CardTitle>
          <CardDescription>
            {items.length > 0
              ? `${items.length} ${items.length === 1 ? "notificación" : "notificaciones"}.`
              : "Aquí verás los avisos que te envíe la plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p>No tienes notificaciones.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {pageItems.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(n)}
                      className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-muted/50"
                    >
                      {n.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                          <Bell className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-medium">{n.title}</p>
                          {n.createdAt && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                      Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            {selected?.createdAt && (
              <DialogDescription>{new Date(selected.createdAt).toLocaleString()}</DialogDescription>
            )}
          </DialogHeader>
          {selected?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.imageUrl} alt="" className="max-h-72 w-full rounded border object-contain" />
          )}
          <p className="whitespace-pre-wrap text-sm text-foreground">{selected?.body}</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
