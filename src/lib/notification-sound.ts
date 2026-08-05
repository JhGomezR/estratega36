"use client"

/**
 * Tono de notificación vía Web Audio (sin archivos externos).
 *
 * Los navegadores bloquean el audio hasta que el usuario interactúa con la
 * pestaña ("autoplay policy"). Por eso:
 *   - reutilizamos UN solo AudioContext (crear/cerrar uno por tono agota el
 *     límite de contextos del navegador y falla en silencio), y
 *   - lo "desbloqueamos" (resume) en el primer gesto del usuario en la página.
 * Si aún no hubo gesto en la pestaña, el tono no sonará: es una restricción del
 * navegador, no un error.
 */

let ctx: AudioContext | null = null
let primed = false

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!ctx) {
    try {
      ctx = new Ctx()
    } catch {
      return null
    }
  }
  return ctx
}

/**
 * Engancha, una sola vez, el desbloqueo del audio al primer gesto del usuario.
 * Llamar al montar la campana. Los listeners quedan activos para volver a
 * reanudar el contexto si el navegador lo suspende de nuevo.
 */
export function primeNotificationAudio(): void {
  if (primed || typeof window === "undefined") return
  primed = true
  const resume = () => {
    const c = getCtx()
    if (c && c.state === "suspended") c.resume().catch(() => {})
  }
  window.addEventListener("pointerdown", resume)
  window.addEventListener("keydown", resume)
  window.addEventListener("click", resume)
}

export function playNotificationTone(): void {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state === "suspended") c.resume().catch(() => {})

    const now = c.currentTime
    const notes = [880, 1174.66] // A5 → D6
    notes.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const t = now + i * 0.15
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.32)
    })
  } catch {
    /* audio no disponible o bloqueado */
  }
}
