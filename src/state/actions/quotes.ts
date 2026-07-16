import { addQuote, deleteQuote, setQuoteDisabled as setDisabled, updateQuote } from '@/lib/shared'
import { useStore } from '@/state/store'

/**
 * Custom motivational quotes (US-064) — invariants in `@/lib/shared`
 * (quotes.ts). Stored in user data so they export/import with everything else.
 */

export function addCustomQuote(text: string, author?: string): void {
  useStore.getState().mutate((draft) => {
    addQuote(draft.quotes, `c-${crypto.randomUUID()}`, text, author)
  })
}

export function updateCustomQuote(id: string, text: string, author?: string): void {
  useStore.getState().mutate((draft) => {
    updateQuote(draft.quotes, id, text, author)
  })
}

export function deleteCustomQuote(id: string): void {
  useStore.getState().mutate((draft) => {
    deleteQuote(draft.quotes, id)
  })
}

/** Enable/disable any quote (built-in or custom) by id. */
export function setQuoteDisabled(id: string, disabled: boolean): void {
  useStore.getState().mutate((draft) => {
    setDisabled(draft.quotes, id, disabled)
  })
}
