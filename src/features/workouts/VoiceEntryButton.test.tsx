// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusStep } from '@/lib/workouts'
import { VoiceEntryButton } from './VoiceEntryButton'

interface Rec {
  started: boolean
  aborted: boolean
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
  onresult = null
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
      onCommand={() => {}}
      onToggleHandsFree={() => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Voice entry' }))
}

beforeEach(() => {
  vi.useFakeTimers()
  recs = []
  speakingNow = false
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
