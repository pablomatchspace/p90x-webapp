/** Shared by the rest timer and focus playback (E12) — extracted from TimerCard. */
export function beep() {
  try {
    const ctx = new AudioContext()
    const tone = (at: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, at)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25)
      osc.start(at)
      osc.stop(at + 0.3)
    }
    tone(ctx.currentTime)
    tone(ctx.currentTime + 0.35)
    setTimeout(() => void ctx.close(), 1200)
  } catch {
    // no audio available — vibration and the visual cue still fire
  }
}

export function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
