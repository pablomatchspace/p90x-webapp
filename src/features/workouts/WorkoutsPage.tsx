import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { programLabel, workoutsFor, type WorkoutDef } from '@/lib/shared'
import { useSettings, useWorkoutLogs } from '@/state/selectors'
import { GearList } from './GearList'

type Group = { title: string; match: (w: WorkoutDef) => boolean }

const P90X_GROUPS: Group[] = [
  { title: 'Resistance', match: (w) => w.style === 'strength' },
  { title: 'Ab Ripper', match: (w) => w.style === 'arx' },
  // X Stretch lives on rest days (logged from Today), so it has no log sheet here
  {
    title: 'Cardio & flexibility',
    match: (w) => w.style === 'completion' && w.key !== 'x-stretch',
  },
]

/** E33: Generation Next groups by its three pillars; bonus fivers are added from Today. */
const GENNEXT_GROUPS: Group[] = [
  { title: 'Metabolic Overload (strength)', match: (w) => w.pillar === 'MOT' },
  { title: 'Neuro-Performance (athletic)', match: (w) => w.pillar === 'NPT' },
  { title: 'Active Recovery', match: (w) => w.pillar === 'ART' },
]

export function WorkoutsPage() {
  const logs = useWorkoutLogs()
  const program = useSettings().program
  const groups = program.suite === 'gennext' ? GENNEXT_GROUPS : P90X_GROUPS
  const workouts = workoutsFor(program.suite)

  return (
    <Page title="Workouts" subtitle={`${programLabel(program)} — every workout, live-scored`}>
      {groups.map((group) => (
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
                      <span className="text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {count === 0 ? 'not logged yet' : `${count} logged`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {def.style === 'completion' || def.style === 'bonus'
                        ? 'Completed? + notes'
                        : `${def.exercises?.length ?? 0} exercises`}
                    </p>
                    <div className="mt-1.5">
                      <GearList workoutKey={def.key} inline />
                    </div>
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
