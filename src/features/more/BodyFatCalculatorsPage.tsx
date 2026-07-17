import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { NumberField } from '@/features/workouts/NumberField'
import { formatFixed, fractionToPercent, mToUnit } from '@/lib/body'
import type { BodyFraction } from '@/lib/shared'
import {
  type LengthUnit,
  navyBodyFat,
  SEVEN_SITE_SITES,
  sevenSiteBodyFat,
  THREE_SITE_SITES,
  threeSiteBodyFat,
} from '@/lib/body'
import { updateSettings } from '@/state/actions'
import { useSettings } from '@/state/selectors'

type Method = 'navy' | 'three' | 'seven'

const METHODS: { key: Method; label: string }[] = [
  { key: 'navy', label: 'Navy' },
  { key: 'three', label: '3-site' },
  { key: 'seven', label: '7-site' },
]

export function BodyFatCalculatorsPage() {
  const settings = useSettings()
  const sex = settings.gender
  const age = settings.age ?? null
  const unit: LengthUnit = settings.units === 'imperial' ? 'in' : 'cm'

  const [method, setMethod] = useState<Method>('navy')
  const [abdomen, setAbdomen] = useState<number | null>(null)
  const [neck, setNeck] = useState<number | null>(null)
  const [hip, setHip] = useState<number | null>(null)
  const [navyHeight, setNavyHeight] = useState<number | null>(() =>
    settings.height ? mToUnit(settings.height, settings.units) : null,
  )
  const [three, setThree] = useState<(number | null)[]>([null, null, null])
  const [seven, setSeven] = useState<(number | null)[]>(Array(7).fill(null))
  const [pendingSave, setPendingSave] = useState<BodyFraction | null>(null)
  const [savedPct, setSavedPct] = useState<string | null>(null)

  const bodyFat =
    method === 'navy'
      ? navyBodyFat({ sex, abdomen, neck, hip, height: navyHeight, unit })
      : method === 'three'
        ? threeSiteBodyFat({ sex, sites: three, age })
        : sevenSiteBodyFat({ sex, sites: seven, age })

  const pct = bodyFat === null ? '—' : formatFixed(fractionToPercent(bodyFat), 1)
  const needsAge = method !== 'navy' && age === null

  const setSite =
    (arr: (number | null)[], set: (v: (number | null)[]) => void) =>
    (i: number) =>
    (v: number | null) =>
      set(arr.map((x, idx) => (idx === i ? v : x)))
  const setThreeSite = setSite(three, setThree)
  const setSevenSite = setSite(seven, setSeven)

  function confirmSave() {
    if (pendingSave !== null) {
      updateSettings({ startBodyFat: pendingSave })
      setSavedPct(formatFixed(fractionToPercent(pendingSave), 1))
    }
    setPendingSave(null)
  }

  return (
    <Page
      title="Body-fat calculators"
      subtitle="Estimate body-fat % without a scale — Navy, 3-site or 7-site"
    >
      <Card>
        <div role="tablist" aria-label="Method" className="flex gap-1">
          {METHODS.map((m) => (
            <button
              key={m.key}
              role="tab"
              type="button"
              aria-selected={method === m.key}
              onClick={() => {
                setMethod(m.key)
                setSavedPct(null)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                method === m.key
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Using <span className="font-medium capitalize">{sex}</span>
          {method === 'navy' ? '' : `, age ${age ?? '—'}`} from{' '}
          <Link to="/more/settings" className="text-red-600 hover:underline">
            Settings
          </Link>
          .
        </p>
      </Card>

      <Card>
        {method === 'navy' && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <Field label={`Abdomen (${unit})`} value={abdomen} step={0.5} onChange={setAbdomen} />
            <Field label={`Neck (${unit})`} value={neck} step={0.5} onChange={setNeck} />
            {sex === 'female' && (
              <Field label={`Hip (${unit})`} value={hip} step={0.5} onChange={setHip} />
            )}
            <Field
              label={`Height (${unit})`}
              value={navyHeight}
              step={0.5}
              onChange={setNavyHeight}
            />
          </div>
        )}

        {method === 'three' && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {THREE_SITE_SITES[sex].map((site, i) => (
              <Field
                key={site}
                label={`${site} (mm)`}
                value={three[i]}
                step={1}
                onChange={setThreeSite(i)}
              />
            ))}
          </div>
        )}

        {method === 'seven' && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {SEVEN_SITE_SITES[sex].map((site, i) => (
              <Field
                key={site}
                label={`${site} (mm)`}
                value={seven[i]}
                step={1}
                onChange={setSevenSite(i)}
              />
            ))}
          </div>
        )}

        {needsAge && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            Set your age in{' '}
            <Link to="/more/settings" className="underline">
              Settings
            </Link>{' '}
            to use the skinfold methods.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Estimated body-fat</div>
            <div className="text-3xl font-bold tabular-nums" aria-live="polite">
              {pct}
              {pct !== '—' ? <span className="ml-1 text-lg font-medium">%</span> : null}
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Target ranges — men 10–18%, women 18–25%
            </div>
          </div>
          <button
            type="button"
            disabled={bodyFat === null}
            onClick={() => setPendingSave(bodyFat)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-red-700 disabled:opacity-40"
          >
            Use as starting body-fat
          </button>
        </div>
        {savedPct && (
          <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
            Saved {savedPct}% as your starting body-fat in Settings.
          </p>
        )}
      </Card>

      {pendingSave !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm starting body-fat"
        >
          <Card className="max-w-md">
            <h2 className="text-base font-semibold">Set starting body-fat?</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              This writes{' '}
              <span className="font-medium">{formatFixed(fractionToPercent(pendingSave), 1)}%</span>{' '}
              to your Settings as the day-1 baseline, replacing the current value. Your logged scale
              entries are untouched.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Save to Settings
              </button>
              <button
                type="button"
                onClick={() => setPendingSave(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  )
}

function Field({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number | null
  step: number
  onChange: (value: number | null) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-medium">{label}</span>
      <NumberField label={label} value={value} step={step} onChange={onChange} />
    </div>
  )
}
