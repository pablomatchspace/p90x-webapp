import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'

/**
 * The shared "no program yet" empty state (US-086). Every primary screen hits it
 * while `settings.startDate` is null, so the two ways in — start fresh from a
 * date, or import an existing dataset — live in one place rather than drifting
 * across four copies. `hint` carries the screen-specific line.
 */
export function NoProgramCard({ hint }: { hint: string }) {
  return (
    <Card>
      <h2 className="font-semibold">No program yet</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/start"
          className="inline-flex min-h-11 items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Start a program
        </Link>
        <Link
          to="/more/data"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Import your data
        </Link>
      </div>
    </Card>
  )
}
