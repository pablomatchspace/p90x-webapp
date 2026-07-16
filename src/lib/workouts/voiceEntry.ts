import type { FocusStep } from './focusSteps'

/**
 * Voice rep entry (E30 US-150). Turns one Web Speech transcript into either a
 * step command or a list of (optionally field-tagged) numbers, and maps those
 * numbers onto the focus card's visible fields. Parsing only — nothing here
 * touches state (rule 2); the caller feeds assignments through the ordinary
 * `setRoundValue` pipeline so ghosts, drop verdicts and overload targets react
 * exactly as if typed.
 *
 * Grammar (English — recognition is pinned to en-US):
 * - whole-utterance commands: "next" · "previous"/"back" · "finish"/"finish
 *   workout"/"done"
 * - values: numbers as digits ("22", "22.5") or words ("twenty-two", "a
 *   hundred and five"), with "point five" / "and a half" fractions
 * - field words route a value to a column — before or right after the number
 *   ("reps 22, knee 8" ≡ "22 reps, 8 knee"); main: rep(s)/second(s);
 *   secondary: knee(s)/chair(s)/weight(s)/pound(s)/kilo(s)/kg/side
 * - "round N" scopes following values to that round on multi-round cards
 */

export type VoiceCommand = 'next' | 'previous' | 'finish'

export interface VoiceValue {
  value: number
  /** column named by a spoken field word; absent = fill positionally */
  field?: 'main' | 'secondary'
  /** 0-based round named by a spoken "round N"; absent = any shown round */
  round?: number
}

export type VoiceParse =
  { kind: 'command'; command: VoiceCommand } | { kind: 'values'; values: VoiceValue[] }

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
}

const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

const MAIN_WORDS = new Set(['rep', 'reps', 'sec', 'secs', 'second', 'seconds'])
const SECONDARY_WORDS = new Set([
  'knee',
  'knees',
  'chair',
  'chairs',
  'weight',
  'weights',
  'pound',
  'pounds',
  'kilo',
  'kilos',
  'kg',
  'lb',
  'lbs',
  'side',
])

const COMMANDS: Record<string, VoiceCommand> = {
  next: 'next',
  previous: 'previous',
  back: 'previous',
  finish: 'finish',
  'finish workout': 'finish',
  done: 'finish',
}

const DIGIT_TOKEN = /^\d+(?:[.,]\d+)?$/

/** Own-property lookup — `in`/indexing would also match `constructor` & co. */
function lookup(table: Record<string, number>, key: string): number | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined
}

/** A spoken number below one hundred starting at `i`, or null. */
function smallNumberAt(tokens: string[], i: number): { value: number; next: number } | null {
  const t = tokens[i]
  const teen = lookup(TEENS, t)
  if (teen !== undefined) return { value: teen, next: i + 1 }
  const ten = lookup(TENS, t)
  if (ten !== undefined) {
    const unit = lookup(UNITS, tokens[i + 1] ?? '')
    return unit !== undefined && unit > 0
      ? { value: ten + unit, next: i + 2 }
      : { value: ten, next: i + 1 }
  }
  const unit = lookup(UNITS, t)
  return unit !== undefined ? { value: unit, next: i + 1 } : null
}

/** A spoken number 0–999 starting at `i` ("a hundred and five"), or null. */
function wordNumberAt(tokens: string[], i: number): { value: number; next: number } | null {
  const lead =
    tokens[i] === 'hundred' || (tokens[i] === 'a' && tokens[i + 1] === 'hundred')
      ? { value: 1, next: tokens[i] === 'hundred' ? i : i + 1 }
      : smallNumberAt(tokens, i)
  if (lead === null) return null
  if (tokens[lead.next] === 'hundred' && lead.value >= 1 && lead.value <= 9) {
    let value = lead.value * 100
    let next = lead.next + 1
    const j = tokens[next] === 'and' ? next + 1 : next
    const rest = smallNumberAt(tokens, j)
    if (rest !== null) {
      value += rest.value
      next = rest.next
    }
    return { value, next }
  }
  return lead
}

/** Number at `i` (digit token or words) with fraction tail, or null. */
function numberAt(tokens: string[], i: number): { value: number; next: number } | null {
  let value: number
  let next: number
  if (DIGIT_TOKEN.test(tokens[i])) {
    value = Number(tokens[i].replace(',', '.'))
    next = i + 1
  } else {
    const parsed = wordNumberAt(tokens, i)
    if (parsed === null) return null
    value = parsed.value
    next = parsed.next
  }
  // fraction tails: "twenty two point five", "12 and a half"
  if (tokens[next] === 'point') {
    const t = tokens[next + 1] ?? ''
    const tenth = lookup(UNITS, t) ?? (/^\d$/.test(t) ? Number(t) : undefined)
    if (tenth !== undefined) {
      value += tenth / 10
      next += 2
    }
  } else if (tokens[next] === 'and' && tokens[next + 1] === 'a' && tokens[next + 2] === 'half') {
    value += 0.5
    next += 3
  } else if (tokens[next] === 'and' && tokens[next + 1] === 'half') {
    value += 0.5
    next += 2
  }
  return { value, next }
}

/**
 * One utterance → command or values. Field words attach to the nearest
 * number — pending until one follows ("knee 8"), or retroactively when they
 * trail one directly ("8 knee"); "knee reps" style compounds keep the
 * secondary tag. Filler words separate values. Null when the utterance
 * contains neither a command nor a number.
 */
export function parseVoiceTranscript(transcript: string): VoiceParse | null {
  const tokens = transcript
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9., ]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.,]+|[.,]+$/g, ''))
    .filter((t) => t.length > 0)

  const phrase = tokens.join(' ')
  if (Object.hasOwn(COMMANDS, phrase)) return { kind: 'command', command: COMMANDS[phrase] }

  const values: VoiceValue[] = []
  let pendingField: 'main' | 'secondary' | null = null
  let currentRound: number | null = null
  let last: VoiceValue | null = null // retro-attach target…
  let lastEnd = -1 // …only while the field word is adjacent

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (token === 'round') {
      const n = numberAt(tokens, i + 1)
      if (n !== null && Number.isInteger(n.value) && n.value >= 1) {
        currentRound = n.value - 1
        last = null
        i = n.next
        continue
      }
    }

    const isMainWord = MAIN_WORDS.has(token)
    if (isMainWord || SECONDARY_WORDS.has(token)) {
      const tag = isMainWord ? 'main' : 'secondary'
      const retro = last !== null && lastEnd === i
      if (
        tag === 'main' &&
        (pendingField === 'secondary' || (retro && last?.field === 'secondary'))
      ) {
        // "knee reps 8" / "8 knee reps" — the compound stays secondary
        if (retro) lastEnd = i + 1
      } else if (retro && last !== null && last.field === undefined) {
        last.field = tag
        lastEnd = i + 1
      } else {
        pendingField = tag
      }
      i++
      continue
    }

    const n = numberAt(tokens, i)
    if (n === null) {
      i++
      continue
    }
    const value: VoiceValue = { value: n.value }
    if (pendingField !== null) value.field = pendingField
    if (currentRound !== null) value.round = currentRound
    values.push(value)
    pendingField = null
    last = value
    lastEnd = n.next
    i = n.next
  }
  return values.length > 0 ? { kind: 'values', values } : null
}

export interface VoiceSlot {
  /** 0-based round index */
  round: number
  field: 'main' | 'secondary'
}

/** The card's editable fields in display order: per shown round, main then secondary. */
export function voiceSlots(step: FocusStep): VoiceSlot[] {
  const slots: VoiceSlot[] = []
  for (const round of step.rounds) {
    slots.push({ round, field: 'main' })
    if (step.exercise.secondary !== undefined) slots.push({ round, field: 'secondary' })
  }
  return slots
}

/**
 * Place each value on the first slot matching its tags, preferring empty
 * fields — bare numbers continue where entry left off, tagged repeats
 * overwrite (re-speaking corrects). One slot per utterance value; values with
 * no matching slot (e.g. "knee" on an exercise without one) are dropped.
 * `filled` is parallel to `slots`.
 */
export function assignVoiceValues(
  values: VoiceValue[],
  slots: VoiceSlot[],
  filled: boolean[],
): { slot: VoiceSlot; value: number }[] {
  const taken = new Set<number>()
  const out: { slot: VoiceSlot; value: number }[] = []
  for (const v of values) {
    const candidates = slots
      .map((slot, index) => ({ slot, index }))
      .filter(
        ({ slot, index }) =>
          !taken.has(index) &&
          (v.field === undefined || slot.field === v.field) &&
          (v.round === undefined || slot.round === v.round),
      )
    const pick = candidates.find(({ index }) => !filled[index]) ?? candidates[0]
    if (pick === undefined) continue
    taken.add(pick.index)
    out.push({ slot: pick.slot, value: v.value })
  }
  return out
}
