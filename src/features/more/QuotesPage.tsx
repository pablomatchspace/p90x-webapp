import { useState, type FormEvent } from 'react'
import { Card, Page } from '@/components/Page'
import { BUILTIN_QUOTES } from '@/lib/shared'
import {
  addCustomQuote,
  deleteCustomQuote,
  setQuoteDisabled,
  updateCustomQuote,
} from '@/state/actions'
import { useStore } from '@/state/store'

/**
 * Quote editor (US-064): add/edit/delete your own lines and disable any quote,
 * built-in or custom. Everything is stored in user data, so it travels with
 * export/import. The built-in pack is intentionally unattributed (decision D5).
 */
export function QuotesPage() {
  const custom = useStore((s) => s.data.quotes.custom)
  const disabledIds = useStore((s) => s.data.quotes.disabledIds)
  const disabled = new Set(disabledIds)
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')

  function add(e: FormEvent) {
    e.preventDefault()
    addCustomQuote(text, author)
    setText('')
    setAuthor('')
  }

  return (
    <Page title="Motivation" subtitle="Your daily quote pack">
      <Card>
        <h2 className="font-semibold">Add your own</h2>
        <form onSubmit={add} className="mt-2 flex flex-col gap-2">
          <input
            aria-label="Quote text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a line that fires you up"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <input
              aria-label="Author (optional)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author (optional)"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={text.trim() === ''}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </form>
      </Card>

      {custom.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Your quotes ({custom.length})</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {custom.map((q) => (
              <li key={q.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  aria-label={`Enabled: ${q.text}`}
                  checked={!disabled.has(q.id)}
                  onChange={(e) => setQuoteDisabled(q.id, !e.target.checked)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={`Edit quote ${q.id}`}
                    defaultValue={q.text}
                    onBlur={(e) => updateCustomQuote(q.id, e.target.value, q.author)}
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-zinc-200 focus:border-zinc-300 dark:hover:border-zinc-700"
                  />
                  {q.author ? (
                    <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">— {q.author}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Delete quote ${q.id}`}
                  onClick={() => deleteCustomQuote(q.id)}
                  className="mt-0.5 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold">
            Built-in pack ({BUILTIN_QUOTES.length})
          </summary>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Untick any you'd rather not see — nothing here is attributed to a real person.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {BUILTIN_QUOTES.map((q) => (
              <li key={q.id}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!disabled.has(q.id)}
                    onChange={(e) => setQuoteDisabled(q.id, !e.target.checked)}
                    className="mt-1"
                  />
                  <span
                    className={
                      disabled.has(q.id) ? 'text-zinc-400 line-through dark:text-zinc-600' : ''
                    }
                  >
                    {q.text}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </Page>
  )
}
