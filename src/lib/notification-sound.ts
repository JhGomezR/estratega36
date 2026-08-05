"use client"

/**
 * Reproduce un breve tono de dos notas para avisar de una notificación nueva.
 * Usa Web Audio (sin archivos externos). Es best-effort: si el navegador bloquea
 * el audio (sin gesto previo del usuario) o no lo soporta, falla en silencio.
 */
export function playNotificationTone(): void {
  try {
    const Ctx =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined
    if (!Ctx) return

    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes = [880, 1174.66] // A5 → D6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const t = now + i * 0.15
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.32)
    })

    // Libera el contexto tras sonar.
    window.setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {
    /* silencio: audio no disponible o bloqueado por autoplay */
  }
}
