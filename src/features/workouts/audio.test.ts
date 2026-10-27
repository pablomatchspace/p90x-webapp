// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Node = { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }

let state: 'running' | 'suspended'
let created: number
let oscillators: (Node & { at?: number })[]
let resume: ReturnType<typeof vi.fn>

class FakeAudioContext {
  currentTime = 10
  destination = {}
  get state() {
    return state
  }
  constructor() {
    created++
  }
  resume = resume
  close = vi.fn()
  createGain() {
    return {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    }
  }
  createOscillator() {
    const osc = {
      connect: vi.fn(),
      frequency: { value: 0 },
      start: vi.fn((at: number) => {
        osc.at = at
      }),
      stop: vi.fn(),
      at: undefined as number | undefined,
    }
    oscillators.push(osc)
    return osc
  }
  createBuffer() {
    return {}
  }
  createBufferSource() {
    return { connect: vi.fn(), start: vi.fn(), buffer: null }
  }
}

class FakeUtterance {
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  lang = ''
  text: string
  constructor(text: string) {
    this.text = text
  }
}

let spoken: FakeUtterance[]
let synth: {
  speaking: boolean
  pending: boolean
  cancel: ReturnType<typeof vi.fn>
  speak: ReturnType<typeof vi.fn>
}

async function load() {
  vi.resetModules()
  return import('./audio')
}

beforeEach(() => {
  vi.useFakeTimers()
  state = 'running'
  created = 0
  oscillators = []
  resume = vi.fn(() => {
    state = 'running'
    return Promise.resolve()
  })
  spoken = []
  synth = {
    speaking: false,
    pending: false,
    cancel: vi.fn(() => {
      synth.speaking = false
    }),
    speak: vi.fn((u: FakeUtterance) => {
      spoken.push(u)
    }),
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('beep', () => {
  it('reuses one AudioContext across beeps', async () => {
    const audio = await load()
    audio.beep('work')
    audio.beep('rest')
    expect(created).toBe(1)
    expect(oscillators).toHaveLength(4)
  })

  it('plays after the resume lands when the context was never unlocked', async () => {
    state = 'suspended'
    const audio = await load()
    audio.beep()
    expect(oscillators).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(0)
    expect(resume).toHaveBeenCalled()
    expect(oscillators).toHaveLength(2)
  })

  it('unlockAudio resumes a suspended context from a tap', async () => {
    state = 'suspended'
    const audio = await load()
    audio.unlockAudio()
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('stays silent without Web Audio', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const audio = await load()
    expect(() => audio.beep()).not.toThrow()
    expect(audio.scheduleCues([{ at: Date.now() + 1000, kind: 'work' }])).toBe(false)
  })
})

describe('scheduled cues', () => {
  it('places each cue on the audio clock at its offset from now', async () => {
    const audio = await load()
    const now = 1_000_000
    expect(
      audio.scheduleCues(
        [
          { at: now + 2000, kind: 'work' },
          { at: now + 5000, kind: 'rest' },
        ],
        now,
      ),
    ).toBe(true)
    expect(oscillators.map((o) => o.at)).toEqual([12, 12.35, 15, 15.45])
  })

  it('drops cues that already passed and cancels the not-yet-started ones on reschedule', async () => {
    const audio = await load()
    const now = 1_000_000
    audio.scheduleCues([{ at: now + 2000, kind: 'work' }], now)
    const first = [...oscillators]
    audio.scheduleCues([{ at: now - 5, kind: 'work' }], now)
    expect(first.every((o) => o.stop.mock.calls.length >= 2)).toBe(true) // stop() at schedule + cancel
    expect(oscillators).toHaveLength(first.length) // nothing new for a past cue
  })

  it('schedules once a suspended clock resumes, and reports false meanwhile', async () => {
    state = 'suspended'
    const audio = await load()
    expect(audio.scheduleCues([{ at: Date.now() + 1000, kind: 'work' }])).toBe(false)
    expect(oscillators).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(0)
    expect(oscillators).toHaveLength(2)
  })

  it('does not schedule a stale request after playback was cancelled', async () => {
    state = 'suspended'
    const audio = await load()
    audio.scheduleCues([{ at: Date.now() + 1000, kind: 'work' }])
    audio.cancelCues()
    await vi.advanceTimersByTimeAsync(0)
    expect(oscillators).toHaveLength(0)
  })

  it('knows which events a scheduled cue already covers', async () => {
    const audio = await load()
    const now = 1_000_000
    audio.scheduleCues([{ at: now + 2000, kind: 'work' }], now)
    expect(audio.cueScheduledAt(now + 2100)).toBe(true)
    expect(audio.cueScheduledAt(now + 9000)).toBe(false)
    audio.cancelCues()
    expect(audio.cueScheduledAt(now + 2100)).toBe(false)
  })
})

describe('speak', () => {
  it('speaks English immediately', async () => {
    const audio = await load()
    audio.speak('Push-ups')
    expect(spoken).toHaveLength(1)
    expect(spoken[0].text).toBe('Push-ups')
    expect(spoken[0].lang).toBe('en-US')
  })

  it('waits out the beep before speaking, and a newer cue replaces a queued one', async () => {
    const audio = await load()
    audio.speak('first', 650)
    audio.speak('second', 650)
    expect(spoken).toHaveLength(0)
    vi.advanceTimersByTime(650)
    expect(spoken.map((u) => u.text)).toEqual(['second'])
  })

  it('defers past a cancel so Chrome does not drop the utterance', async () => {
    const audio = await load()
    synth.speaking = true
    audio.speak('Lunges')
    expect(synth.cancel).toHaveBeenCalled()
    expect(spoken).toHaveLength(0)
    vi.advanceTimersByTime(60)
    expect(spoken.map((u) => u.text)).toEqual(['Lunges'])
  })

  it('reports speaking start/end and clears it if the engine never says end', async () => {
    const audio = await load()
    const seen: boolean[] = []
    audio.onSpeaking((s) => seen.push(s))
    audio.speak('Squats')
    spoken[0].onstart?.()
    expect(audio.isSpeaking()).toBe(true)
    spoken[0].onend?.()
    expect(audio.isSpeaking()).toBe(false)
    audio.speak('Squats')
    spoken[1].onstart?.()
    vi.advanceTimersByTime(5000) // watchdog
    expect(audio.isSpeaking()).toBe(false)
    expect(seen).toEqual([true, false, true, false])
  })

  it('stopSpeech silences the running and the queued cue', async () => {
    const audio = await load()
    audio.speak('Now')
    spoken[0].onstart?.()
    audio.speak('Later', 650)
    audio.stopSpeech()
    expect(synth.cancel).toHaveBeenCalled()
    expect(audio.isSpeaking()).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(spoken).toHaveLength(1)
  })

  it('is a no-op without speechSynthesis', async () => {
    // @ts-expect-error simulate an unsupported browser
    delete window.speechSynthesis
    const audio = await load()
    expect(() => audio.speak('x')).not.toThrow()
    expect(() => audio.stopSpeech()).not.toThrow()
  })
})
