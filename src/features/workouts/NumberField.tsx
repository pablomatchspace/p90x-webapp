import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

const stepButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:active:bg-zinc-700'

/**
 * Numeric entry built for sweaty thumbs (US-042): the previous session's value
 * ghosts as placeholder, and when the field is empty the first +/− tap copies
 * it (one-tap copy) before further taps step. 44px touch targets throughout.
 */
export function NumberField({
  label,
  value,
  prev = null,
  step = 1,
  onChange,
}: {
  label: string
  value: number | null
  /** ghost-prefill source: same field, previous session */
  prev?: number | null
  step?: number
  onChange: (value: number | null) => void
}) {
  // free-typing buffer so intermediate states like "12." survive until blur
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (raw: string) => {
    setDraft(raw)
    if (raw.trim() === '') {
      onChange(null)
      return
    }
    const parsed = Number(raw.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed >= 0) onChange(parsed)
  }

  const bump = (direction: 1 | -1) => {
    setDraft(null)
    if (value === null) {
      onChange(prev ?? (direction === 1 ? step : 0))
      return
    }
    onChange(Math.max(0, value + direction * step))
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => bump(-1)}
        className={stepButton}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={draft ?? (value === null ? '' : String(value))}
        placeholder={prev === null ? '' : String(prev)}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setDraft(null)}
        className="h-11 w-14 rounded-lg border border-zinc-300 bg-white text-center text-sm font-medium tabular-nums placeholder:text-zinc-300 focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => bump(1)}
        className={stepButton}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
