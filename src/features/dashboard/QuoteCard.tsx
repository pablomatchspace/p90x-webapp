import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { quoteOfDay } from '@/lib/quotes'
import { useStore } from '@/state/store'

/**
 * Quote of the day (US-064). Deterministic per `seed` (the program-day number),
 * so it holds steady across reloads and only rotates as the program advances.
 * Rendered on the Dashboard and on a finished workout; hides itself if the user
 * has disabled every quote.
 */
export function QuoteCard({ seed, label = 'Daily motivation' }: { seed: number; label?: string }) {
  const quotes = useStore((s) => s.data.quotes)
  const quote = quoteOfDay(seed, quotes)
  if (quote === null) return null
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {label}
        </h2>
        <Link
          to="/more/quotes"
          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Quotes
        </Link>
      </div>
      <blockquote className="mt-1 border-l-2 border-red-500 pl-3 text-lg leading-snug font-medium">
        {quote.text}
      </blockquote>
      {quote.author ? (
        <p className="mt-1 pl-3 text-sm text-zinc-500 dark:text-zinc-400">— {quote.author}</p>
      ) : null}
    </Card>
  )
}
