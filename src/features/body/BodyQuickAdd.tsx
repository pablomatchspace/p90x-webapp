import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { deriveBody, formatFixed, kgToUnit, unitToKg, weightUnit } from '@/lib/body'
import { compareISO, todayISO } from '@/lib/dates'
import { NumberField } from '@/features/workouts/NumberField'
import { upsertBodyEntry } from '@/state/actions'
import { useBodyLog, useSettings } from '@/state/selectors'

/**
 * One-field morning weigh-in for Today/Dashboard (US-051 quick-add). The field
 * stays put while typing — the derived line appears alongside once a weight
 * exists, instead of swapping the input away mid-entry.
 */
export function BodyQuickAdd() {
  const bodyLog = useBodyLog()
  const settings = useSettings()
  const today = todayISO()
  const units = settings.units
  const unit = weightUnit(units)
  const entry = bodyLog.find((e) => e.date === today) ?? null
  const prev = [...bodyLog].reverse().find((e) => compareISO(e.date, today) < 0) ?? null
  const derived = entry === null ? null : deriveBody(entry, settings)

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Morning weigh-in</h2>
        <Link
          to="/body"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Body log
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <NumberField
          label={`Weight (${unit})`}
          value={entry?.weight != null ? kgToUnit(entry.weight, units) : null}
          prev={prev?.weight != null ? kgToUnit(prev.weight, units) : null}
          step={0.1}
          onChange={(v) =>
            upsertBodyEntry(today, { weight: v === null ? null : unitToKg(v, units) })
          }
        />
        {derived !== null && derived.bmi !== null ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            BMI {formatFixed(derived.bmi, 2)}
            {derived.ffmiCategory !== null
              ? ` · FFMI ${formatFixed(derived.ffmi, 2)} (${derived.ffmiCategory})`
              : ''}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
