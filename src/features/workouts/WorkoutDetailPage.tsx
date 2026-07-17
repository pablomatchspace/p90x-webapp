import { Link, Navigate, useParams } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { getWorkout, hasWorkout } from '@/lib/shared'
import { workoutOccurrences } from '@/lib/schedule'
import { useSchedule } from '@/state/selectors'
import { CompletionLog } from './CompletionLog'
import { MediaLinks } from './MediaLinks'
import { StrengthGrid } from './StrengthGrid'

const STYLE_LABELS = {
  strength: 'Strength log — reps, weights, live scores',
  arx: 'Reps per session',
  completion: 'Completion log',
  rest: 'Completion log',
} as const

export function WorkoutDetailPage() {
  const params = useParams<{ key: string }>()
  const schedule = useSchedule()
  const key = params.key ?? ''
  if (!hasWorkout(key)) return <Navigate to="/workouts" replace />
  const def = getWorkout(key)

  const backLink = (
    <>
      {/* E23: open the session video/audio deeplink in a new tab */}
      <MediaLinks workoutKey={key} workoutName={def.name} />
      <Link
        to="/workouts"
        className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        All workouts
      </Link>
    </>
  )

  if (schedule === null) {
    return (
      <Page title={def.name} subtitle={STYLE_LABELS[def.style]} actions={backLink}>
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Import your data first — the log grid needs the program calendar.
          </p>
          <Link
            to="/more/data"
            className="mt-3 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Go to Import
          </Link>
        </Card>
      </Page>
    )
  }

  const occurrences = workoutOccurrences(schedule, key)

  return (
    <Page title={def.name} subtitle={STYLE_LABELS[def.style]} actions={backLink}>
      {occurrences.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This routine isn't on the program calendar — it's logged from rest days on the Today
            page.
          </p>
        </Card>
      ) : def.style === 'completion' || def.style === 'rest' ? (
        <CompletionLog def={def} occurrences={occurrences} />
      ) : (
        <StrengthGrid def={def} occurrences={occurrences} />
      )}
    </Page>
  )
}
