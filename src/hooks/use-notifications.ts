"use client"

import * as React from "react"
import { collection, doc, query, setDoc, where } from "firebase/firestore"
import {
  useCollection,
  useDefaultDb,
  useMemoFirebase,
  usePlatformClaims,
  useUser,
} from "@/firebase"
import type { Notification } from "@/lib/types"

export interface SystemNotifications {
  /** Todas las notificaciones vigentes (difusiones + dirigidas), recientes primero. */
  items: Notification[]
  /** Subconjunto no leído por el usuario actual. */
  unread: Notification[]
  unreadCount: number
  isRead: (id: string) => boolean
  /** Marca (idempotente) una notificación como leída por el usuario actual. */
  markAsRead: (id: string) => void
  isLoading: boolean
}

/**
 * Fuente única de notificaciones para el tenant (campana y página).
 *
 * Lee `(default)/notifications` (difusiones + dirigidas al tenant) y los acuses
 * `(default)/notificationReads` del usuario actual para calcular lo NO leído.
 * El estado de lectura es POR USUARIO (no por tenant): cada usuario tiene su
 * propio acuse `{uid}_{notifId}`.
 */
export function useSystemNotifications(): SystemNotifications {
  const { user } = useUser()
  const uid = user?.uid
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
  const readsQuery = useMemoFirebase(
    () =>
      uid
        ? query(collection(defaultDb, "notificationReads"), where("userId", "==", uid))
        : null,
    [defaultDb, uid]
  )

  const { data: broadcast, isLoading: la } = useCollection<Notification>(broadcastQuery)
  const { data: mine, isLoading: lb } = useCollection<Notification>(mineQuery)
  const { data: reads } = useCollection<{ notificationId: string }>(readsQuery)

  const readIds = React.useMemo(
    () => new Set((reads || []).map((r) => r.notificationId)),
    [reads]
  )

  const items = React.useMemo(() => {
    const byId = new Map<string, Notification>()
    for (const n of [...(broadcast || []), ...(mine || [])]) {
      if (n.status !== "inactivo") byId.set(n.id, n)
    }
    return [...byId.values()].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [broadcast, mine])

  const unread = React.useMemo(() => items.filter((n) => !readIds.has(n.id)), [items, readIds])

  const markAsRead = React.useCallback(
    (id: string) => {
      if (!uid || readIds.has(id)) return
      const ref = doc(defaultDb, "notificationReads", `${uid}_${id}`)
      void setDoc(
        ref,
        { userId: uid, notificationId: id, tenantId: tenantId || "", readAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {})
    },
    [defaultDb, uid, tenantId, readIds]
  )

  return {
    items,
    unread,
    unreadCount: unread.length,
    isRead: (id: string) => readIds.has(id),
    markAsRead,
    isLoading: la || lb,
  }
}
