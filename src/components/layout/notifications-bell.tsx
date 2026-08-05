"use client"

import * as React from "react"
import { collection, query, where } from "firebase/firestore"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  useCollection,
  useDefaultDb,
  useMemoFirebase,
  usePlatformClaims,
} from "@/firebase"
import type { Notification } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const iconButtonClasses =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"

/**
 * Campana de notificaciones del sistema (lado tenant, SOLO lectura).
 *
 * Lee la fuente única `(default)/notifications` con dos consultas de un único
 * filtro de igualdad —difusiones (`audience == 'all'`) y las dirigidas a su
 * tenant (`tenantId == <suyo>`)— que casan con la regla de seguridad. Muestra
 * las 3 más recientes; al hacer clic se abre un modal con el mensaje completo.
 */
export function NotificationsBell() {
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

  const { data: broadcast } = useCollection<Notification>(broadcastQuery)
  const { data: mine } = useCollection<Notification>(mineQuery)

  const items = React.useMemo(() => {
    const byId = new Map<string, Notification>()
    for (const n of [...(broadcast || []), ...(mine || [])]) {
      if (n.status !== "inactivo") byId.set(n.id, n)
    }
    return [...byId.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [broadcast, mine])

  const latest = items.slice(0, 3)
  const [selected, setSelected] = React.useState<Notification | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(iconButtonClasses, "relative")} aria-label="Notificaciones">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {items.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {latest.length === 0 ? (
            <p className="px-2 py-6 text-center text-theme-sm text-muted-foreground">
              No tienes notificaciones nuevas.
            </p>
          ) : (
            <div className="py-1">
              {latest.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  {n.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.imageUrl} alt="" className="mt-0.5 h-9 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Bell className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  )
}
