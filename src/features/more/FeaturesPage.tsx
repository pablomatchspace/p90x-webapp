import { Card, Page } from '@/components/Page'
import { FEATURE_GROUP_TITLES, FEATURES, type FeatureGroup, type FeatureKey } from '@/lib/shared'
import { setFeatureEnabled } from '@/state/actions'
import { useSettings } from '@/state/selectors'

/**
 * E41: switch optional parts of the app on or off. Only hides — notes, links,
 * logs and targets stay stored and return when a feature is switched back on.
 */

const GROUPS: FeatureGroup[] = ['sections', 'cards', 'player']

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-red-600' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function FeaturesPage() {
  const { disabledFeatures } = useSettings()
  const enabled = (key: FeatureKey) => !disabledFeatures.includes(key)

  return (
    <Page
      title="Features"
      subtitle="Turn optional parts of the app on or off — switching one off only hides it, nothing is deleted"
    >
      {GROUPS.map((group) => (
        <Card key={group}>
          <h2 className="text-base font-semibold">{FEATURE_GROUP_TITLES[group]}</h2>
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {FEATURES.filter((f) => f.group === group).map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {f.description}
                  </div>
                </div>
                <Switch
                  label={f.title}
                  checked={enabled(f.key)}
                  onChange={(next) => setFeatureEnabled(f.key, next)}
                />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </Page>
  )
}
