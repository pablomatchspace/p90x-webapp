// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusStep } from '@/lib/workouts'
import { VoiceEntryButton } from './VoiceEntryButton'

interface Rec {
  started: boolean
  aborted: boolean
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
let recs: Rec[]

class FakeRecognition implements Rec {
  lang = ''
  continuous = false
  interimResults = false
  started = false
  aborted = false
  onresult: Rec['onresult'] = null
  onerror: Rec['onerror'] = null
  onend: Rec['onend'] = null
  constructor() {
    recs.push(this)
  }
  start() {
    this.started = true
  }
  abort() {
    this.aborted = true
    this.onend?.()
  }
}

// the audio module is the only thing the button reads about speech
let speakingListener: ((speaking: boolean) => void) | null
let speakingNow: boolean
let onCommandResult: string | undefined
vi.mock('./audio', () => ({
  isSpeaking: () => speakingNow,
  onSpeaking: (cb: (s: boolean) => void) => {
    speakingListener = cb
    return () => {
      speakingListener = null
    }
  },
}))

const step = { exercise: { id: 'x', name: 'X' }, rounds: [0] } as unknown as FocusStep

function mount(handsFree: boolean) {
  render(
    <VoiceEntryButton
      step={step}
      entry={undefined}
      handsFree={handsFree}
      onValue={() => {}}
      onCommand={() => onCommandResult}
      onToggleHandsFree={() => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Voice entry' }))
}

beforeEach(() => {
  vi.useFakeTimers()
  recs = []
  speakingNow = false
  onCommandResult = undefined
  speakingListener = null
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const end = (rec: Rec) => act(() => rec.onend?.())

describe('hands-free re-arm', () => {
  it('re-arms after a pause, not in a tight loop', () => {
    mount(true)
    end(recs[0])
    expect(recs).toHaveLength(1)
    act(() => void vi.advanceTimersByTime(300))
    expect(recs).toHaveLength(2)
    expect(recs[1].started).toBe(true)
  })

  it.each(['network', 'audio-capture', 'language-not-supported'])(
    'stops instead of looping on a %s error',
    (error) => {
      mount(true)
      act(() => recs[0].onerror?.({ error }))
      end(recs[0])
      act(() => void vi.advanceTimersByTime(5000))
      expect(recs).toHaveLength(1)
      expect(screen.getByRole('button', { name: 'Voice entry' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    },
  )
})

describe('toggling off', () => {
  it('ignores the late events of the instance it aborted', () => {
    mount(true)
    const first = recs[0]
    fireEvent.click(screen.getByRole('button', { name: 'Listening…' }))
    act(() => void vi.advanceTimersByTime(1000))
    end(first)
    expect(recs).toHaveLength(1)
  })
})

describe('while the app speaks', () => {
  it('mutes the mic for the cue, then re-arms', () => {
    mount(false)
    act(() => speakingListener?.(true))
    expect(recs[0].aborted).toBe(true)
    expect(recs).toHaveLength(1)
    act(() => speakingListener?.(false))
    expect(recs).toHaveLength(2)
    expect(recs[1].started).toBe(true)
    expect(screen.getByRole('button', { name: 'Listening…' })).toBeInTheDocument()
  })

  it('does not re-arm a mic the user switched off meanwhile', () => {
    mount(false)
    act(() => speakingListener?.(true))
    fireEvent.click(screen.getByRole('button', { name: 'Listening…' }))
    act(() => speakingListener?.(false))
    expect(recs).toHaveLength(1)
  })
})

const say = (rec: Rec, transcript: string) =>
  act(() => rec.onresult?.({ results: [[{ transcript }]] }))
const hide = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  act(() => void document.dispatchEvent(new Event('visibilitychange')))
}

describe('tapping the mic while the app speaks', () => {
  it('waits for the cue to finish instead of listening to it', () => {
    speakingNow = true
    mount(false)
    expect(recs).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Listening…' })).toBeInTheDocument()
    speakingNow = false
    act(() => speakingListener?.(false))
    expect(recs).toHaveLength(1)
    expect(recs[0].started).toBe(true)
  })
})

describe('recoverable failures', () => {
  it('lets the user retry after the mic was denied', () => {
    mount(false)
    act(() => recs[0].onerror?.({ error: 'not-allowed' }))
    const mic = screen.getByRole('button', { name: 'Voice entry' })
    expect(mic).toBeEnabled()
    fireEvent.click(mic)
    expect(recs).toHaveLength(2)
  })

  it('stops "Listening…" when the browser refuses to start', () => {
    class Refusing extends FakeRecognition {
      start() {
        throw new Error('InvalidStateError')
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', Refusing)
    mount(true)
    expect(screen.getByRole('button', { name: 'Voice entry' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText(/Couldn’t start the microphone/)).toBeInTheDocument()
  })
})

describe('page visibility (hands-free)', () => {
  afterEach(() => hide('visible'))

  it('pauses recognition while hidden and re-arms on return', () => {
    mount(true)
    hide('hidden')
    expect(recs[0].aborted).toBe(true)
    act(() => void vi.advanceTimersByTime(5000))
    expect(recs).toHaveLength(1) // nothing restarts in the background
    hide('visible')
    expect(recs).toHaveLength(2)
    expect(recs[1].started).toBe(true)
    expect(screen.getByRole('button', { name: 'Listening…' })).toBeInTheDocument()
  })

  it('stops push-to-talk when the page is hidden', () => {
    mount(false)
    hide('hidden')
    expect(screen.getByRole('button', { name: 'Voice entry' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    hide('visible')
    expect(recs).toHaveLength(1)
  })
})

describe('feedback', () => {
  it('hands-free keeps the last result over a silent gap', () => {
    mount(true)
    say(recs[0], 'reps 22')
    act(() => recs[0].onerror?.({ error: 'no-speech' }))
    expect(screen.getByText(/Logged/)).toBeInTheDocument()
    expect(screen.queryByText(/try again/)).toBeNull()
  })

  it('push-to-talk still says nothing was heard', () => {
    mount(false)
    act(() => recs[0].onerror?.({ error: 'no-speech' }))
    expect(screen.getByText('Didn’t hear anything — try again.')).toBeInTheDocument()
  })

  it('says why a command did nothing', () => {
    onCommandResult = 'Previous is off while the timer runs.'
    mount(false)
    say(recs[0], 'previous')
    expect(screen.getByText(/Previous is off while the timer runs\./)).toBeInTheDocument()
  })

  it('explains why an ambient phrase was ignored', () => {
    mount(true)
    say(recs[0], 'one more')
    expect(screen.getByText(/Heard “one more” — not a logging phrase/)).toBeInTheDocument()
  })

  it('the hands-free hint says a tap starts it', () => {
    render(
      <VoiceEntryButton
        step={step}
        entry={undefined}
        handsFree
        onValue={() => {}}
        onCommand={() => {}}
        onToggleHandsFree={() => {}}
      />,
    )
    expect(screen.getByText(/Tap the mic to start; it then re-arms/)).toBeInTheDocument()
  })
})
