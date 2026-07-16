import type { Session } from '@/lib/shared'
import { setCompletionStatus } from '@/state/actions'

/** The Excel COMPLETED? dropdown as one-tap buttons (US-044), shared by Today and the log screens. */
export function CompletionButtons({
  workoutKey,
  programDayId,
  session,
}: {
  workoutKey: string
  programDayId: string
  session: Session | undefined
}) {
  const options = [
    { value: 'yes', label: 'Yes', active: 'border-emerald-600 bg-emerald-600 text-white' },
    { value: 'not-yet', label: 'Not yet', active: 'border-zinc-500 bg-zinc-600 text-white' },
    { value: 'no', label: 'No', active: 'border-rose-600 bg-rose-600 text-white' },
  ] as const
  return (
    <div className="flex gap-2" role="group" aria-label="Completed?">
      {options.map((option) => {
        const selected = session?.completion === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setCompletionStatus(workoutKey, programDayId, option.value)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium ${
              selected
                ? option.active
                : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
