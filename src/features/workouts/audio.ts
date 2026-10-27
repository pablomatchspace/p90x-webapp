/**
 * Play-mode audio (E26, reworked in E38): one shared AudioContext that is
 * unlocked from a tap, beeps scheduled on the audio clock so they keep sounding
 * when the screen is off and page timers are frozen, and spoken cues that are
 * ordered after the beep, cancellable, and observable (so the mic can sit out
 * while the app is talking).
 */

/**
 * E26: two audibly distinct cues — 'work' (a workout segment starts / resumes)
 * keeps the brisk double 880 Hz chirp; 'rest' announces a rest with a lower
 * falling two-tone so athletes can tell them apart without looking.
 */
export type BeepKind = 'work' | 'rest'

/** Peak gain of every tone — the old 0.15 was inaudible over gym noise. */
const BEEP_GAIN = 0.35

/** How long each beep sounds, so a spoken cue can start right after it. */
export const BEEP_MS: Record<BeepKind, number> = { work: 650, rest: 900 }

let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    return ctx
  } catch {
    return null // no Web Audio — vibration and the visual cue still fire
  }
}

/**
 * Call from a tap (Start, rest-timer Start). Browsers create an AudioContext
 * suspended unless it is resumed from a user gesture, and the cues themselves
 * fire from timers — without this unlock they are silent (iOS Safari always,
 * Chrome after a reload).
 */
export function unlockAudio(): void {
  const c = audioContext()
  if (c === null) return
  try {
    if (c.state !== 'running') void c.resume().catch(() => {})
    // a one-sample silent buffer completes the unlock on iOS
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
  } catch {
    // best effort
  }
}

type Tone = { osc: OscillatorNode; at: number }

function tones(c: AudioContext, kind: BeepKind, start: number): Tone[] {
  const out: Tone[] = []
  const tone = (at: number, hz: number, len: number) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.frequency.value = hz
    gain.gain.setValueAtTime(BEEP_GAIN, at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + len)
    osc.start(at)
    osc.stop(at + len + 0.05)
    out.push({ osc, at })
  }
  if (kind === 'rest') {
    tone(start, 660, 0.4)
    tone(start + 0.45, 440, 0.4)
  } else {
    tone(start, 880, 0.25)
    tone(start + 0.35, 880, 0.25)
  }
  return out
}

/** Play a cue now (foreground ticks, skips, the rest timer). */
export function beep(kind: BeepKind = 'work'): void {
  const c = audioContext()
  if (c === null) return
  try {
    if (c.state === 'running') {
      tones(c, kind, c.currentTime)
    } else {
      // still suspended (never unlocked): the cue plays once the resume lands
      void c
        .resume()
        .then(() => tones(c, kind, c.currentTime))
        .catch(() => {})
    }
  } catch {
    // no audio available
  }
}

interface ScheduledCue {
  at: number
  tones: Tone[]
}
let scheduled: ScheduledCue[] = []

let generation = 0

/** Drop every scheduled cue that has not started sounding yet. */
export function cancelCues(): void {
  generation++
  const now = ctx?.currentTime ?? 0
  for (const cue of scheduled) {
    for (const t of cue.tones) {
      if (t.at > now) {
        try {
          t.osc.stop()
        } catch {
          // already stopped
        }
      }
    }
  }
  scheduled = []
}

/**
 * Replace the schedule with `cues` (epoch-ms times). Returns true when they are
 * on the audio clock now. A suspended clock (the first schedule right after the
 * Start tap, before the resume lands) schedules as soon as it runs and returns
 * false, so the caller keeps beeping from its own ticks until then.
 */
export function scheduleCues(cues: { at: number; kind: BeepKind }[], nowMs = Date.now()): boolean {
  cancelCues()
  const c = audioContext()
  if (c === null) return false
  const gen = generation
  const apply = (from: number): boolean => {
    try {
      for (const cue of cues) {
        const delay = (cue.at - from) / 1000
        if (delay < 0) continue
        scheduled.push({ at: cue.at, tones: tones(c, cue.kind, c.currentTime + delay) })
      }
      return true
    } catch {
      return false
    }
  }
  if (c.state === 'running') return apply(nowMs)
  void c
    .resume()
    .then(() => {
      if (gen === generation && c.state === 'running') apply(Date.now())
    })
    .catch(() => {})
  return false
}

/** True when a scheduled cue covers an event happening at `nowMs`. */
export function cueScheduledAt(nowMs: number, toleranceMs = 600): boolean {
  return scheduled.some((cue) => Math.abs(cue.at - nowMs) <= toleranceMs)
}

// ---- speech ---------------------------------------------------------------

let speaking = false
let activeUtterance: SpeechSynthesisUtterance | null = null // pinned: Chrome GCs live utterances
let pendingSpeech: ReturnType<typeof setTimeout> | null = null
let watchdog: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<(speaking: boolean) => void>()

function setSpeaking(next: boolean) {
  if (!next) {
    if (watchdog !== null) clearTimeout(watchdog)
    watchdog = null
  }
  if (speaking === next) return
  speaking = next
  for (const cb of listeners) cb(next)
}

export function isSpeaking(): boolean {
  return speaking
}

/** Observe the app talking (start/end). Returns the unsubscribe. */
export function onSpeaking(cb: (speaking: boolean) => void): () => void {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

function say(text: string): void {
  const synth = window.speechSynthesis
  let delay = 0
  if (synth.speaking || synth.pending) {
    // Chrome drops a speak() issued in the same tick as cancel()
    synth.cancel()
    delay = 60
  }
  const run = () => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US' // exercise names are English; don't let a device locale mangle them
    // an engine that never reports `end` must not leave the mic muted forever
    const arm = () => {
      if (watchdog !== null) clearTimeout(watchdog)
      watchdog = setTimeout(() => setSpeaking(false), Math.max(4000, text.length * 120))
    }
    u.onstart = () => {
      setSpeaking(true)
      arm()
    }
    u.onend = u.onerror = () => {
      if (activeUtterance === u) activeUtterance = null
      setSpeaking(false)
    }
    activeUtterance = u
    synth.speak(u)
    arm()
  }
  if (delay > 0) pendingSpeech = setTimeout(run, delay)
  else run()
}

/**
 * Spoken cue via the Web Speech API. `afterMs` holds it back (the beep's
 * length) so the voice isn't talked over; a newer cue replaces a queued or
 * running one so rapid skips never build a backlog. No-op without
 * speechSynthesis — the beep and visual cue still fire.
 */
export function speak(text: string, afterMs = 0): void {
  try {
    if (!('speechSynthesis' in window)) return
    if (pendingSpeech !== null) clearTimeout(pendingSpeech)
    pendingSpeech = null
    if (afterMs > 0) {
      pendingSpeech = setTimeout(() => {
        pendingSpeech = null
        try {
          say(text)
        } catch {
          // speech unavailable — non-fatal
        }
      }, afterMs)
    } else {
      say(text)
    }
  } catch {
    // speech unavailable — non-fatal
  }
}

/** Silence and forget anything queued — Stop, leaving the screen, voice cues off. */
export function stopSpeech(): void {
  if (pendingSpeech !== null) clearTimeout(pendingSpeech)
  pendingSpeech = null
  try {
    if ('speechSynthesis' in window && (speaking || activeUtterance !== null)) {
      window.speechSynthesis.cancel()
    }
  } catch {
    // ignore
  }
  activeUtterance = null
  setSpeaking(false)
}
