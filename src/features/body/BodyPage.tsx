import { Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, Page } from '@/components/Page'
import {
  deriveBody,
  formatFixed,
  fractionToPercent,
  kgToUnit,
  lossThreshold,
  percentToFraction,
  targetWeight,
  threshold,
  unitToKg,
  weightUnit,
  type Threshold,
} from '@/lib/body'
import { compareISO, diffDays, formatLong, isISODate, todayISO, type ISODate } from '@/lib/shared'
import type { BodyEntry, Settings } from '@/lib/shared'
import { Chip, type ChipTone } from '@/features/schedule/Chip'
import { NumberField } from '@/features/workouts/NumberField'
import { deleteBodyEntry, upsertBodyEntry } from '@/state/actions'
import { useBodyLog, useSettings } from '@/state/selectors'

const CHIP_TONE: Record<Threshold, ChipTone> = { good: 'green', watch: 'amber', over: 'rose' }
const TEXT_TONE: Record<Threshold, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  watch: 'text-amber-600 dark:text-amber-400',
  over: 'text-rose-600 dark:text-rose-400',
}

function chipTone(t: Threshold | null): ChipTone {
  return t === null ? 'zinc' : CHIP_TONE[t]
}

/** Inline metric value carrying its threshold color. */
function ToneText({ tone, children }: { tone: Threshold | null; children: ReactNode }) {
  return (
    <span data-tone={tone ?? undefined} className={tone === null ? undefined : TEXT_TONE[tone]}>
      {children}
    </span>
  )
}

/** The color-scale anchors the sheet reads from SETUP (targets green, limits red). */
interface Bounds {
  targetW: number | null
  limitW: number | null
  targetBf: number | null
  limitBf: number | null
  targetBmi: number | null
  limitBmi: number | null
  startWeight: number | null
}

function boundsFrom(settings: Settings): Bounds {
  const targetW = targetWeight(settings)
  const height = settings.height ?? null
  const h2 = height !== null && height > 0 ? height * height : null
  return {
    targetW,
    limitW: settings.limits.weight ?? null,
    targetBf: settings.targets.bodyFat ?? null,
    limitBf: settings.limits.bodyFat ?? null,
    targetBmi: targetW !== null && h2 !== null ? targetW / h2 : null,
    limitBmi: settings.limits.bmi ?? null,
    startWeight: settings.startWeight ?? null,
  }
}

function EntryRow({
  entry,
  settings,
  bounds,
  today,
  onEdit,
}: {
  entry: BodyEntry
  settings: Settings
  bounds: Bounds
  today: ISODate
  onEdit: () => void
}) {
  const units = settings.units
  const unit = weightUnit(units)
  const d = deriveBody(entry, settings)
  const w = entry.weight ?? null
  const bf = entry.bodyFat ?? null
  const fmtW = (v: number | null) =>
    v === null ? '—' : `${formatFixed(kgToUnit(v, units), 1)} ${unit}`

  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${entry.date}`}
        className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {formatLong(entry.date)}
            {entry.date === today ? (
              <span className="ml-1.5 text-xs font-normal text-red-600 dark:text-red-400">
                today
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-1">
            {w !== null ? (
              <Chip tone={chipTone(threshold(w, bounds.targetW, bounds.limitW))}>{fmtW(w)}</Chip>
            ) : null}
            {bf !== null ? (
              <Chip tone={chipTone(threshold(bf, bounds.targetBf, bounds.limitBf))}>
                {formatFixed(fractionToPercent(bf), 1)}%
              </Chip>
            ) : null}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <ToneText tone={lossThreshold(d.weightLoss, bounds.startWeight, bounds.targetW)}>
            Loss {fmtW(d.weightLoss)}
          </ToneText>
          {' · '}
          <ToneText tone={threshold(d.bmi, bounds.targetBmi, bounds.limitBmi)}>
            BMI {formatFixed(d.bmi, 2)}
          </ToneText>
          {' · Lean '}
          {fmtW(d.leanMass)}
          {' · FFMI '}
          {formatFixed(d.ffmi, 2)}
          {d.ffmiCategory !== null ? ` (${d.ffmiCategory})` : ''}
          {entry.zoneMinutes != null ? ` · Zone ${entry.zoneMinutes} min` : ''}
        </p>
      </button>
    </li>
  )
}

function PercentField({
  label,
  value,
  prev,
  onChange,
}: {
  label: string
  value: number | null | undefined
  prev: number | null | undefined
  onChange: (fraction: number | null) => void
}) {
  return (
    <NumberField
      label={label}
      value={fractionToPercent(value ?? null)}
      prev={fractionToPercent(prev ?? null)}
      step={0.1}
      onChange={(v) => onChange(percentToFraction(v))}
    />
  )
}

export function BodyPage() {
  const bodyLog = useBodyLog()
  const settings = useSettings()
  const today = todayISO()
  const [selected, setSelected] = useState<ISODate>(today)

  const units = settings.units
  const unit = weightUnit(units)
  const bounds = boundsFrom(settings)
  const entry = bodyLog.find((e) => e.date === selected) ?? null
  const prev = [...bodyLog].reverse().find((e) => compareISO(e.date, selected) < 0) ?? null
  const derived = entry === null ? null : deriveBody(entry, settings)
  const fmtW = (v: number | null) =>
    v === null ? '—' : `${formatFixed(kgToUnit(v, units), 1)} ${unit}`

  // list newest-first, with a marker for every stretch of unlogged days —
  // between entries and between the last entry and today (today itself is
  // "not yet", not "missed", so it never counts into a gap)
  const items: (
    { kind: 'entry'; entry: BodyEntry } | { kind: 'gap'; days: number; key: string }
  )[] = []
  for (let i = 0; i < bodyLog.length; i++) {
    items.push({ kind: 'entry', entry: bodyLog[i] })
    const next =
      i + 1 < bodyLog.length
        ? bodyLog[i + 1].date
        : compareISO(bodyLog[i].date, today) < 0
          ? today
          : null
    if (next !== null) {
      const days = diffDays(bodyLog[i].date, next) - 1
      if (days > 0) items.push({ kind: 'gap', days, key: `gap-${bodyLog[i].date}` })
    }
  }
  items.reverse()

  const label = (text: string) => (
    <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">{text}</p>
  )

  return (
    <Page
      title="Body"
      subtitle="Daily scale log"
      actions={
        selected !== today ? (
          <button
            type="button"
            onClick={() => setSelected(today)}
            className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Today
          </button>
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{selected === today ? 'Today' : formatLong(selected)}</h2>
          <input
            type="date"
            aria-label="Entry date"
            value={selected}
            onChange={(e) => {
              if (isISODate(e.target.value)) setSelected(e.target.value)
            }}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
          <div>
            {label(`Weight (${unit})`)}
            <NumberField
              label={`Weight (${unit})`}
              value={entry?.weight != null ? kgToUnit(entry.weight, units) : null}
              prev={prev?.weight != null ? kgToUnit(prev.weight, units) : null}
              step={0.1}
              onChange={(v) =>
                upsertBodyEntry(selected, { weight: v === null ? null : unitToKg(v, units) })
              }
            />
          </div>
          <div>
            {label('Body fat (%)')}
            <PercentField
              label="Body fat (%)"
              value={entry?.bodyFat}
              prev={prev?.bodyFat}
              onChange={(bodyFat) => upsertBodyEntry(selected, { bodyFat })}
            />
          </div>
          <div>
            {label('Water (%)')}
            <PercentField
              label="Water (%)"
              value={entry?.water}
              prev={prev?.water}
              onChange={(water) => upsertBodyEntry(selected, { water })}
            />
          </div>
          <div>
            {label('Bone (%)')}
            <PercentField
              label="Bone (%)"
              value={entry?.bone}
              prev={prev?.bone}
              onChange={(bone) => upsertBodyEntry(selected, { bone })}
            />
          </div>
          <div>
            {label('Zone minutes')}
            <NumberField
              label="Zone minutes"
              value={entry?.zoneMinutes ?? null}
              prev={prev?.zoneMinutes ?? null}
              step={5}
              onChange={(zoneMinutes) => upsertBodyEntry(selected, { zoneMinutes })}
            />
          </div>
        </div>

        {derived !== null ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            <ToneText tone={lossThreshold(derived.weightLoss, bounds.startWeight, bounds.targetW)}>
              Loss {fmtW(derived.weightLoss)}
            </ToneText>
            {' · BF '}
            {fmtW(derived.bodyFatKg)}
            {' · '}
            <ToneText tone={threshold(derived.bmi, bounds.targetBmi, bounds.limitBmi)}>
              BMI {formatFixed(derived.bmi, 2)}
            </ToneText>
            {' · Lean '}
            {fmtW(derived.leanMass)}
            {' · FFMI '}
            {formatFixed(derived.ffmi, 2)}
            {derived.ffmiCategory !== null ? ` (${derived.ffmiCategory})` : ''}
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            No weigh-in for this day — enter a value to log it.
          </p>
        )}

        {settings.height == null || settings.startWeight == null ? (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Import your data (or set height and start weight) to unlock BMI, FFMI and weight loss.
          </p>
        ) : null}

        {entry !== null ? (
          <button
            type="button"
            aria-label="Delete entry"
            onClick={() => deleteBodyEntry(selected)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete this entry
          </button>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">History</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {bodyLog.length === 1 ? '1 entry' : `${bodyLog.length} entries`}
          </p>
        </div>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No weigh-ins yet — log the first one above and the trend starts here.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) =>
              item.kind === 'entry' ? (
                <EntryRow
                  key={item.entry.date}
                  entry={item.entry}
                  settings={settings}
                  bounds={bounds}
                  today={today}
                  onEdit={() => setSelected(item.entry.date)}
                />
              ) : (
                <li
                  key={item.key}
                  className="px-2 py-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400"
                >
                  {item.days === 1 ? '1 day' : `${item.days} days`} without a weigh-in
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </Page>
  )
}
