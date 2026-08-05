"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"
import { useSystemNotifications } from "@/hooks/use-notifications"
import { playNotificationTone, primeNotificationAudio } from "@/lib/notification-sound"
import { primeDesktopNotifications, showDesktopNotification } from "@/lib/notification-desktop"
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
 * Muestra las 3 NO leídas más recientes; el badge cuenta las no leídas. Al abrir
 * una se marca como leída (deja de contar). Cuando llega una nueva no leída
 * suena un tono. El estado de lectura es por usuario (ver useSystemNotifications).
 */
export function NotificationsBell() {
  const { items, unread, unreadCount, markAsRead, isLoading } = useSystemNotifications()

  // Desbloquea el audio y pide permiso de notificaciones en el primer gesto.
  React.useEffect(() => {
    primeNotificationAudio()
    primeDesktopNotifications()
  }, [])

  // Aviso por CADA notificación nueva que llega (detección por ID nuevo, no por
  // conteo, que podría no cambiar si a la vez se marca otra como leída):
  //   - suena el tono (también en pestañas de fondo, si el audio ya se desbloqueó),
  //   - si el usuario está en OTRA pestaña, se muestra un aviso de escritorio.
  // Tras la primera carga se fija la base para no avisar al entrar.
  const knownIds = React.useRef<Set<string> | null>(null)
  React.useEffect(() => {
    if (isLoading) return
    if (knownIds.current === null) {
      knownIds.current = new Set(items.map((n) => n.id))
      return
    }
    const fresh = items.filter((n) => !knownIds.current!.has(n.id))
    knownIds.current = new Set(items.map((n) => n.id))
    if (fresh.length === 0) return

    playNotificationTone()
    if (typeof document !== "undefined" && document.hidden) {
      fresh.slice(0, 3).forEach((n) => showDesktopNotification(n.title, n.body, n.imageUrl))
    }
  }, [items, isLoading])

  const latest = unread.slice(0, 3)
  const [selected, setSelected] = React.useState<Notification | null>(null)

  const open = (n: Notification) => {
    markAsRead(n.id)
    setSelected(n)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(iconButtonClasses, "relative")} aria-label="Notificaciones">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
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
                  onClick={() => open(n)}
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
