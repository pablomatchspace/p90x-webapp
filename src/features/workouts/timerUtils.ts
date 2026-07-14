/** Shared by the rest timer and focus/play playback (E12) — extracted from TimerCard. */

/**
 * E26: two audibly distinct cues — 'work' (a workout segment starts / resumes)
 * keeps the original brisk double 880 Hz chirp; 'rest' announces a rest with a
 * lower falling two-tone so athletes can tell them apart without looking.
 */
export type BeepKind = 'work' | 'rest'

export function beep(kind: BeepKind = 'work') {
  try {
    const ctx = new AudioContext()
    const tone = (at: number, hz: number, len = 0.25) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = hz
      gain.gain.setValueAtTime(0.15, at)
      gain.gain.exponentialRampToValueAtTime(0.001, at + len)
      osc.start(at)
      osc.stop(at + len + 0.05)
    }
    if (kind === 'rest') {
      tone(ctx.currentTime, 660, 0.4)
      tone(ctx.currentTime + 0.45, 440, 0.4)
    } else {
      tone(ctx.currentTime, 880)
      tone(ctx.currentTime + 0.35, 880)
    }
    setTimeout(() => void ctx.close(), 1500)
  } catch {
    // no audio available — vibration and the visual cue still fire
  }
}

/**
 * E26: spoken cue via the Web Speech API. Cancels any still-queued utterance so
 * rapid skips never build a backlog. Silently a no-op where speechSynthesis is
 * unavailable (or errors) — the beep and visual cue still fire.
 */
export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  } catch {
    // speech unavailable — non-fatal
  }
}

export function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
