import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { workouts, type WorkoutDef } from '@/lib/programData'
import { useWorkoutLogs } from '@/state/selectors'

const GROUPS: Array<{ title: string; match: (w: WorkoutDef) => boolean }> = [
  { title: 'Resistance', match: (w) => w.style === 'strength' },
  { title: 'Ab Ripper', match: (w) => w.style === 'arx' },
  // X Stretch lives on rest days (logged from Today), so it has no log sheet here
  { title: 'Cardio & flexibility', match: (w) => w.style === 'completion' && w.key !== 'x-stretch' },
]

export function WorkoutsPage() {
  const logs = useWorkoutLogs()

  return (
    <Page title="Workouts" subtitle="The 12 log sheets, live-scored">
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {group.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {workouts.filter(group.match).map((def) => {
              const count = logs[def.key]?.sessions.length ?? 0
              return (
                <Link key={def.key} to={`/workouts/${def.key}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-red-300 dark:group-hover:border-red-800">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{def.name}</h3>
                      <span className="text-xs whitespace-nowrap text-zinc-400 dark:text-zinc-500">
                        {count === 0 ? 'not logged yet' : `${count} logged`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {def.style === 'completion'
                        ? 'Completed? + notes'
                        : `${def.exercises?.length ?? 0} exercises`}
                    </p>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </Page>
  )
}
