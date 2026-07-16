import { describe, expect, it } from 'vitest'
import { getWorkout } from '@/lib/shared'
import type { FocusStep } from './focusSteps'
import { assignVoiceValues, parseVoiceTranscript, voiceSlots, type VoiceSlot } from './voiceEntry'

const chestBack = getWorkout('chest-back').exercises!
const pushUps = chestBack.find((e) => e.id === 'standard-push-ups')! // assist: knee
const shouldersArms = getWorkout('shoulders-arms').exercises!

describe('parseVoiceTranscript — numbers (US-150)', () => {
  it('parses digit tokens, decimals and comma decimals', () => {
    expect(parseVoiceTranscript('22')).toEqual({ kind: 'values', values: [{ value: 22 }] })
    expect(parseVoiceTranscript('22.5')).toEqual({ kind: 'values', values: [{ value: 22.5 }] })
    expect(parseVoiceTranscript('22,5')).toEqual({ kind: 'values', values: [{ value: 22.5 }] })
  })

  it('parses number words incl. hyphens, teens, tens and hundreds', () => {
    expect(parseVoiceTranscript('twenty-two')).toEqual({
      kind: 'values',
      values: [{ value: 22 }],
    })
    expect(parseVoiceTranscript('fifteen')).toEqual({ kind: 'values', values: [{ value: 15 }] })
    expect(parseVoiceTranscript('ninety')).toEqual({ kind: 'values', values: [{ value: 90 }] })
    expect(parseVoiceTranscript('a hundred and five')).toEqual({
      kind: 'values',
      values: [{ value: 105 }],
    })
    expect(parseVoiceTranscript('two hundred thirty one')).toEqual({
      kind: 'values',
      values: [{ value: 231 }],
    })
    expect(parseVoiceTranscript('zero')).toEqual({ kind: 'values', values: [{ value: 0 }] })
  })

  it('parses fraction tails', () => {
    expect(parseVoiceTranscript('twenty two point five')).toEqual({
      kind: 'values',
      values: [{ value: 22.5 }],
    })
    expect(parseVoiceTranscript('12 and a half')).toEqual({
      kind: 'values',
      values: [{ value: 12.5 }],
    })
  })

  it('separates multiple values on filler words and "and"', () => {
    expect(parseVoiceTranscript('twenty two and eight')).toEqual({
      kind: 'values',
      values: [{ value: 22 }, { value: 8 }],
    })
    expect(parseVoiceTranscript('22 then 8 please')).toEqual({
      kind: 'values',
      values: [{ value: 22 }, { value: 8 }],
    })
  })

  it('returns null for empty or numberless garbage', () => {
    expect(parseVoiceTranscript('')).toBeNull()
    expect(parseVoiceTranscript('  ')).toBeNull()
    expect(parseVoiceTranscript('good workout bro')).toBeNull()
    // inherited object properties are not numbers or commands
    expect(parseVoiceTranscript('constructor')).toBeNull()
    expect(parseVoiceTranscript('hasOwnProperty valueOf')).toBeNull()
  })
})

describe('parseVoiceTranscript — field words & rounds (US-150)', () => {
  it('routes values by spoken prefix words', () => {
    expect(parseVoiceTranscript('reps 22 knee 8')).toEqual({
      kind: 'values',
      values: [
        { value: 22, field: 'reps' },
        { value: 8, field: 'assist' },
      ],
    })
    expect(parseVoiceTranscript('weight thirty five')).toEqual({
      kind: 'values',
      values: [{ value: 35, field: 'assist' }],
    })
  })

  it('attaches trailing field words to the number just spoken', () => {
    expect(parseVoiceTranscript('22 reps 8 knee')).toEqual({
      kind: 'values',
      values: [
        { value: 22, field: 'reps' },
        { value: 8, field: 'assist' },
      ],
    })
  })

  it('keeps "knee reps" compounds secondary in both positions', () => {
    expect(parseVoiceTranscript('knee reps 8')).toEqual({
      kind: 'values',
      values: [{ value: 8, field: 'assist' }],
    })
    expect(parseVoiceTranscript('8 knee reps')).toEqual({
      kind: 'values',
      values: [{ value: 8, field: 'assist' }],
    })
  })

  it('scopes values with a spoken round prefix until changed', () => {
    expect(parseVoiceTranscript('round 2 reps 20 knee 6')).toEqual({
      kind: 'values',
      values: [
        { value: 20, field: 'reps', round: 1 },
        { value: 6, field: 'assist', round: 1 },
      ],
    })
    expect(parseVoiceTranscript('round one 25 round two 20')).toEqual({
      kind: 'values',
      values: [
        { value: 25, round: 0 },
        { value: 20, round: 1 },
      ],
    })
  })
})

describe('parseVoiceTranscript — commands (US-150)', () => {
  it('parses whole-utterance step and finish commands', () => {
    expect(parseVoiceTranscript('next')).toEqual({ kind: 'command', command: 'next' })
    expect(parseVoiceTranscript('Next.')).toEqual({ kind: 'command', command: 'next' })
    expect(parseVoiceTranscript('previous')).toEqual({ kind: 'command', command: 'previous' })
    expect(parseVoiceTranscript('back')).toEqual({ kind: 'command', command: 'previous' })
    expect(parseVoiceTranscript('finish workout')).toEqual({ kind: 'command', command: 'finish' })
    expect(parseVoiceTranscript('done')).toEqual({ kind: 'command', command: 'finish' })
  })

  it('treats command words inside longer utterances as filler', () => {
    expect(parseVoiceTranscript('next 22')).toEqual({ kind: 'values', values: [{ value: 22 }] })
  })
})

describe('voiceSlots (US-150)', () => {
  it('orders fields per shown round, main then secondary', () => {
    // single-round card of a two-round exercise (Chest & Back two-pass order)
    expect(voiceSlots({ exercise: pushUps, rounds: [1] })).toEqual([
      { round: 1, field: 'reps' },
      { round: 1, field: 'assist' },
    ])
    // all-rounds card
    expect(voiceSlots({ exercise: pushUps, rounds: [0, 1] })).toEqual([
      { round: 0, field: 'reps' },
      { round: 0, field: 'assist' },
      { round: 1, field: 'reps' },
      { round: 1, field: 'assist' },
    ])
  })

  it('omits the secondary column when the exercise has none', () => {
    const noSecondary = shouldersArms.find((e) => e.secondary === undefined)
    if (noSecondary === undefined) return // catalog guard — every row has one
    const step: FocusStep = { exercise: noSecondary, rounds: [0] }
    expect(voiceSlots(step).every((s) => s.field === 'reps')).toBe(true)
  })
})

describe('assignVoiceValues (US-150)', () => {
  const slots: VoiceSlot[] = [
    { round: 0, field: 'reps' },
    { round: 0, field: 'assist' },
    { round: 1, field: 'reps' },
    { round: 1, field: 'assist' },
  ]
  const empty = [false, false, false, false]

  it('fills bare values positionally, continuing at the first empty field', () => {
    expect(assignVoiceValues([{ value: 22 }, { value: 8 }], slots, empty)).toEqual([
      { slot: { round: 0, field: 'reps' }, value: 22 },
      { slot: { round: 0, field: 'assist' }, value: 8 },
    ])
    // round 1 already logged — a bare number lands on round 2's reps
    expect(assignVoiceValues([{ value: 20 }], slots, [true, true, false, false])).toEqual([
      { slot: { round: 1, field: 'reps' }, value: 20 },
    ])
  })

  it('starts over on a fully logged card so re-speaking corrects', () => {
    expect(assignVoiceValues([{ value: 30 }], slots, [true, true, true, true])).toEqual([
      { slot: { round: 0, field: 'reps' }, value: 30 },
    ])
  })

  it('honours field tags, preferring the empty round, and overwrites on repeat', () => {
    expect(
      assignVoiceValues([{ value: 8, field: 'assist' }], slots, [true, true, false, false]),
    ).toEqual([{ slot: { round: 1, field: 'assist' }, value: 8 }])
    // both knee fields filled — the tag overwrites the first one
    expect(
      assignVoiceValues([{ value: 9, field: 'assist' }], slots, [true, true, true, true]),
    ).toEqual([{ slot: { round: 0, field: 'assist' }, value: 9 }])
  })

  it('honours round tags and drops values with no matching slot', () => {
    expect(assignVoiceValues([{ value: 20, field: 'reps', round: 1 }], slots, empty)).toEqual([
      { slot: { round: 1, field: 'reps' }, value: 20 },
    ])
    // round 3 is not on this card; secondary doesn't exist on a main-only card
    expect(assignVoiceValues([{ value: 20, round: 2 }], slots, empty)).toEqual([])
    expect(
      assignVoiceValues([{ value: 5, field: 'assist' }], [{ round: 0, field: 'reps' }], [false]),
    ).toEqual([])
  })

  it('never assigns two values to the same slot in one utterance', () => {
    const out = assignVoiceValues(
      [
        { value: 22, field: 'reps' },
        { value: 20, field: 'reps' },
      ],
      slots,
      empty,
    )
    expect(out).toEqual([
      { slot: { round: 0, field: 'reps' }, value: 22 },
      { slot: { round: 1, field: 'reps' }, value: 20 },
    ])
  })
})
