import { describe, expect, it } from 'vitest'
import {
  activeQuotes,
  addQuote,
  BUILTIN_QUOTES,
  deleteQuote,
  quoteOfDay,
  setQuoteDisabled,
  updateQuote,
} from './quotes'
import type { AppState } from './schema'

const empty: AppState['quotes'] = { disabledIds: [], custom: [] }

describe('built-in quote pack', () => {
  it('ships at least 90 quotes with unique ids', () => {
    expect(BUILTIN_QUOTES.length).toBeGreaterThanOrEqual(90)
    expect(new Set(BUILTIN_QUOTES.map((q) => q.id)).size).toBe(BUILTIN_QUOTES.length)
  })

  it('attributes none of them (D5: no fabricated attributions)', () => {
    expect(BUILTIN_QUOTES.every((q) => q.author === undefined)).toBe(true)
    expect(BUILTIN_QUOTES.every((q) => q.text.trim().length > 0)).toBe(true)
  })
})

describe('quoteOfDay', () => {
  it('is deterministic per seed and stable across calls', () => {
    expect(quoteOfDay(15, empty)).toEqual(quoteOfDay(15, empty))
    expect(quoteOfDay(0, empty)?.id).toBe(BUILTIN_QUOTES[0].id)
  })

  it('wraps around the active pack by modulo, even for negative seeds', () => {
    const n = BUILTIN_QUOTES.length
    expect(quoteOfDay(n + 2, empty)?.id).toBe(BUILTIN_QUOTES[2].id)
    expect(quoteOfDay(-1, empty)?.id).toBe(BUILTIN_QUOTES[n - 1].id)
  })

  it('includes custom quotes and excludes disabled ones', () => {
    const withCustom: AppState['quotes'] = {
      disabledIds: ['q001'],
      custom: [{ id: 'c1', text: 'Bring your own fire.' }],
    }
    const active = activeQuotes(withCustom)
    expect(active.some((q) => q.id === 'c1')).toBe(true)
    expect(active.some((q) => q.id === 'q001')).toBe(false)
  })

  it('returns null when every quote is disabled', () => {
    const allOff: AppState['quotes'] = { disabledIds: BUILTIN_QUOTES.map((q) => q.id), custom: [] }
    expect(quoteOfDay(3, allOff)).toBeNull()
  })
})

describe('custom-quote list invariants', () => {
  it('addQuote trims and refuses empty text', () => {
    const quotes = {
      disabledIds: [] as string[],
      custom: [] as { id: string; text: string; author?: string }[],
    }
    addQuote(quotes, 'q1', '  push play  ', '  ')
    expect(quotes.custom).toEqual([{ id: 'q1', text: 'push play' }])
    addQuote(quotes, 'q2', '   ')
    expect(quotes.custom).toHaveLength(1)
  })

  it('updateQuote edits text/author and refuses empty text', () => {
    const quotes = { disabledIds: [] as string[], custom: [{ id: 'q1', text: 'a', author: 'X' }] }
    updateQuote(quotes, 'q1', 'b', '')
    expect(quotes.custom[0]).toEqual({ id: 'q1', text: 'b' })
    updateQuote(quotes, 'q1', '  ')
    expect(quotes.custom[0]?.text).toBe('b')
  })

  it('deleteQuote removes the quote and its disabled flag', () => {
    const quotes = { disabledIds: ['q1'], custom: [{ id: 'q1', text: 'a' }] }
    deleteQuote(quotes, 'q1')
    expect(quotes).toEqual({ disabledIds: [], custom: [] })
  })

  it('setQuoteDisabled toggles without duplicating ids', () => {
    const quotes = { disabledIds: [] as string[], custom: [] }
    setQuoteDisabled(quotes, 'b1', true)
    setQuoteDisabled(quotes, 'b1', true)
    expect(quotes.disabledIds).toEqual(['b1'])
    setQuoteDisabled(quotes, 'b1', false)
    expect(quotes.disabledIds).toEqual([])
  })
})
