import type { CatalogExercise } from '@/lib/programData'
import { previousValue } from '@/lib/schedule/occurrences'
import type { ProgramDay } from '@/lib/schedule/materialize'
import type { Session } from '@/lib/schema'
import { setRoundValue } from '@/state/actions'
import { fieldAria, mainLabel, SECONDARY_LABELS } from './entryLabels'
import { NumberField } from './NumberField'

/**
 * The editable rounds of one exercise in one session — shared by the grid and
 * focus mode. Ghost prefill comes from the latest earlier occurrence with data
 * (US-042); the round-2 header tints red/green with the drop verdict for Excel
 * color parity (US-041).
 */
export function RoundInputs({
  workoutKey,
  exercise,
  occurrences,
  occIndex,
  sessions,
  drop,
  rounds,
}: {
  workoutKey: string
  exercise: CatalogExercise
  occurrences: ProgramDay[]
  occIndex: number
  sessions: Map<string, Session>
  drop: boolean | null
  /** subset of 0-based rounds to render; omitted = all (grid view) */
  rounds?: number[]
}) {
  const programDayId = occurrences[occIndex].programDayId
  const entry = sessions.get(programDayId)?.entries?.[exercise.id]
  const kind = exercise.secondary

  const field = (round: number, name: 'main' | 'secondary') => (
    <div className="flex flex-col items-center gap-0.5">
      <NumberField
        label={fieldAria(exercise, round, name)}
        value={entry?.rounds[round]?.[name] ?? null}
        prev={previousValue(occurrences, sessions, occIndex, exercise.id, round, name)}
        step={name === 'secondary' && kind === 'weight' ? 2.5 : 1}
        onChange={(value) =>
          setRoundValue(workoutKey, programDayId, exercise.id, round, name, value)
        }
      />
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
        {name === 'main' || kind === undefined ? mainLabel(exercise) : SECONDARY_LABELS[kind]}
      </span>
    </div>
  )

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {Array.from({ length: exercise.rounds }, (_, round) => round)
        .filter((round) => rounds === undefined || rounds.includes(round))
        .map((round) => {
          const verdict =
            round === 1 && exercise.rounds === 2 && drop !== null
              ? drop
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
              : 'text-zinc-500 dark:text-zinc-400'
          return (
            <div key={round}>
              {exercise.rounds > 1 ? (
                <p className={`mb-1 text-[10px] font-semibold tracking-wide uppercase ${verdict}`}>
                  Round {round + 1}
                </p>
              ) : null}
              <div className="flex flex-wrap items-start gap-3">
                {field(round, 'main')}
                {kind !== undefined ? field(round, 'secondary') : null}
              </div>
            </div>
          )
        })}
    </div>
  )
}
