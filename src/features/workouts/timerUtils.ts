/** Shared by the rest timer and focus/play playback (E12). Audio cues live in `audio.ts` (E38). */

export function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
