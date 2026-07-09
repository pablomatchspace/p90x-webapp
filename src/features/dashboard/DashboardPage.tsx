import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { todayISO } from '@/lib/dates'
import { getWorkout } from '@/lib/programData'
import { BodyQuickAdd } from '@/features/body/BodyQuickAdd'
import { AdherenceCard } from '@/features/dashboard/AdherenceCard'
import { KpiCards } from '@/features/dashboard/KpiCards'
import { QuoteCard } from '@/features/dashboard/QuoteCard'
import { ProgramStatusBar } from '@/features/schedule/ProgramStatusBar'
import { useAdherence, useSchedule } from '@/state/selectors'
import { useStore } from '@/state/store'

/** Today's workout(s) with a one-tap route into the day (US-060 next-workout). */
function NextUp() {
  const schedule = useSchedule()
  if (schedule === null) return null
  const day = schedule.byDate.get(todayISO())
  if (day === undefined || day.kind === 'gap') return null

  const workouts = day.workouts.map((k) => getWorkout(k))
  const isRest = workouts.every((w) => w.style === 'rest')
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Today
          </h2>
          <p className="mt-0.5 truncate font-semibold">
            {isRest ? 'Rest & recovery' : workouts.map((w) => w.name).join(' + ')}
          </p>
        </div>
        <Link
          to="/today"
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {isRest ? 'Open' : 'Log today'}
        </Link>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const startDate = useStore((s) => s.data.settings.startDate)
  const adherence = useAdherence()

  if (startDate === null) {
    return (
      <Page title="Dashboard" subtitle="Your program at a glance">
        <Card>
          <h2 className="font-semibold">No program yet</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import your converted Excel data (or try the sample) to get started — the app never
            loads anything by itself.
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

  return (
    <Page title="Dashboard" subtitle="Your program at a glance">
      <ProgramStatusBar />
      <NextUp />
      <KpiCards />
      <AdherenceCard />
      <QuoteCard seed={adherence?.dayReached ?? 0} />
      <BodyQuickAdd />
    </Page>
  )
}
