"use client"

/**
 * Notificaciones de escritorio (Web Notifications API): el pop-up del sistema
 * operativo que se muestra AUNQUE el usuario esté en otra pestaña o con la
 * ventana minimizada, mientras la app siga abierta (sesión iniciada).
 *
 * Requiere permiso del usuario. El permiso se pide en el primer gesto (los
 * navegadores ignoran las peticiones no ligadas a una interacción). Si el
 * usuario lo deniega, solo quedará el aviso sonoro dentro de la app.
 *
 * Nota: esto cubre "cualquier pestaña con la sesión abierta". Para avisar con la
 * pestaña TOTALMENTE cerrada haría falta Web Push + Service Worker (FCM), que es
 * otra pieza de infraestructura.
 */

let primed = false

export function primeDesktopNotifications(): void {
  if (primed || typeof window === "undefined" || !("Notification" in window)) return
  primed = true
  if (Notification.permission !== "default") return // ya concedido o denegado
  const ask = () => {
    try {
      void Notification.requestPermission()
    } catch {
      /* ignore */
    }
    window.removeEventListener("pointerdown", ask)
    window.removeEventListener("keydown", ask)
    window.removeEventListener("click", ask)
  }
  window.addEventListener("pointerdown", ask)
  window.addEventListener("keydown", ask)
  window.addEventListener("click", ask)
}

export function canShowDesktopNotifications(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  )
}

export function showDesktopNotification(title: string, body: string, imageUrl?: string): void {
  try {
    if (!canShowDesktopNotifications()) return
    const n = new Notification(title, {
      body,
      icon: imageUrl || "/favicon.ico",
      // Agrupa por app para no apilar duplicados idénticos.
      tag: "estratega-notificacion",
      renotify: true,
    } as NotificationOptions)
    n.onclick = () => {
      try {
        window.focus()
      } catch {
        /* ignore */
      }
      n.close()
    }
  } catch {
    /* Notificaciones no disponibles o bloqueadas */
  }
}
