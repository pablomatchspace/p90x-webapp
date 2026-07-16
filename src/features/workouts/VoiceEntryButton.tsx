import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FocusStep } from '@/lib/workouts'
import type { ExerciseEntry } from '@/lib/shared'
import {
  assignVoiceValues,
  parseVoiceTranscript,
  voiceSlots,
  type VoiceCommand,
  type VoiceSlot,
} from '@/lib/workouts'
import { mainLabel, SECONDARY_LABELS } from './entryLabels'

/**
 * E30 US-151: push-to-talk voice entry for the focus card, with an opt-in
 * hands-free mode (persisted `player.voiceHandsFree`) that re-arms the mic
 * after every utterance. Renders nothing where the Web Speech API is missing;
 * recognition is pinned to en-US (the parser's grammar) and starts only from
 * a tap — never on load. Transcripts run through `parseVoiceTranscript` and
 * land via the parent's `setRoundValue`, so nothing new is stored (rule 2).
 */

// lib.dom has no SpeechRecognition types — the shape below is the subset used.
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const pill = (active: boolean, activeClasses: string) =>
  `flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium ${
    active
      ? activeClasses
      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
  }`

export function VoiceEntryButton({
  step,
  entry,
  handsFree,
  onValue,
  onCommand,
  onToggleHandsFree,
}: {
  step: FocusStep
  entry: ExerciseEntry | undefined
  handsFree: boolean
  onValue: (slot: VoiceSlot, value: number) => void
  onCommand: (command: VoiceCommand) => void
  onToggleHandsFree: () => void
}) {
  const [listening, setListening] = useState(false)
  const [denied, setDenied] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const armedRef = useRef(false)
  // recognition callbacks outlive renders — read the freshest props through a ref
  const latest = useRef({ step, entry, handsFree, onValue, onCommand })
  latest.current = { step, entry, handsFree, onValue, onCommand }

  useEffect(
    () => () => {
      armedRef.current = false
      recRef.current?.abort()
    },
    [],
  )

  const ctor = speechRecognitionCtor()
  if (ctor === null) return null

  const handleTranscript = (transcript: string) => {
    const heard = transcript.trim()
    const parsed = parseVoiceTranscript(heard)
    if (parsed === null) {
      setFeedback(
        heard === ''
          ? 'Didn’t hear anything — try again.'
          : `Heard “${heard}” — no numbers or command.`,
      )
      return
    }
    if (parsed.kind === 'command') {
      setFeedback(`Heard “${heard}”.`)
      latest.current.onCommand(parsed.command)
      return
    }
    const { step: current, entry: currentEntry } = latest.current
    const slots = voiceSlots(current)
    const filled = slots.map(
      (slot) => (currentEntry?.rounds[slot.round]?.[slot.field] ?? null) !== null,
    )
    const assignments = assignVoiceValues(parsed.values, slots, filled)
    if (assignments.length === 0) {
      setFeedback(`Heard “${heard}” — no matching field on this card.`)
      return
    }
    for (const a of assignments) latest.current.onValue(a.slot, a.value)
    const secondary = current.exercise.secondary
    const applied = assignments.map(({ slot, value }) => {
      const name =
        slot.field === 'main' || secondary === undefined
          ? mainLabel(current.exercise)
          : SECONDARY_LABELS[secondary]
      return `${current.rounds.length > 1 ? `R${slot.round + 1} ` : ''}${name} ${value}`
    })
    setFeedback(`Logged ${applied.join(' · ')}.`)
  }

  const start = () => {
    const rec = new ctor()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (event) => {
      const result = event.results[event.results.length - 1]?.[0]
      if (result !== undefined) handleTranscript(result.transcript)
    }
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        armedRef.current = false
        setListening(false)
        setDenied(true)
        setFeedback('Microphone unavailable — check the browser permission.')
      } else if (event.error === 'no-speech') {
        setFeedback('Didn’t hear anything — try again.')
      }
    }
    rec.onend = () => {
      recRef.current = null
      // hands-free: one utterance per session, re-armed until switched off
      if (armedRef.current && latest.current.handsFree) {
        start()
      } else {
        armedRef.current = false
        setListening(false)
      }
    }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      // an instance can refuse a second start(); the next tap re-creates it
    }
  }

  const toggle = () => {
    if (listening) {
      armedRef.current = false
      setListening(false)
      recRef.current?.abort()
      recRef.current = null
      return
    }
    setFeedback(null)
    armedRef.current = true
    setListening(true)
    start()
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <button
        type="button"
        onClick={toggle}
        disabled={denied}
        aria-pressed={listening}
        className={`${pill(listening, 'animate-pulse border-red-600 bg-red-600 text-white')} disabled:opacity-30`}
      >
        <Mic className="h-4 w-4" aria-hidden />
        {listening ? 'Listening…' : 'Voice entry'}
      </button>
      <button
        type="button"
        onClick={onToggleHandsFree}
        aria-pressed={handsFree}
        className={pill(handsFree, 'border-emerald-600 bg-emerald-600 text-white')}
      >
        Hands-free
      </button>
      <span aria-live="polite">
        {feedback ??
          (handsFree
            ? 'Mic re-arms after each phrase — say “reps 22, knee 8”, “next” or “finish workout”.'
            : 'Tap, then say “reps 22, knee 8” — or “next”.')}
      </span>
    </div>
  )
}
