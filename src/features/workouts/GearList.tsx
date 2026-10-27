import { findGear, gearLabel, type GearId } from '@/lib/workouts'

/**
 * E37: the gear a workout uses (props the video makes optional are listed too). `inline` is a one-line summary for cards;
 * the default renders chips with a "You'll need" lead-in.
 */
export function GearList({
  workoutKey,
  gear,
  inline = false,
  lead = 'Gear',
}: {
  workoutKey?: string
  gear?: GearId[]
  inline?: boolean
  lead?: string
}) {
  const ids = gear ?? (workoutKey === undefined ? null : findGear(workoutKey))
  if (ids === null) return null
  const text = ids.length === 0 ? 'No equipment needed' : ids.map(gearLabel).join(' · ')
  if (inline) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400" data-testid="gear">
        {ids.length === 0 ? text : `${lead}: ${text}`}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="gear">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {ids.length === 0 ? text : `${lead}:`}
      </span>
      {ids.map((id) => (
        <span
          key={id}
          className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          {gearLabel(id)}
        </span>
      ))}
    </div>
  )
}
