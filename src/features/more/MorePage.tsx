import {
  Archive,
  Calculator,
  Cloud,
  Database,
  SlidersHorizontal,
  HelpCircle,
  NotebookPen,
  Quote,
  Settings,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import type { FeatureKey } from '@/lib/shared'
import { useSettings } from '@/state/selectors'

interface MoreItem {
  to: string
  icon: typeof Database
  title: string
  desc: string
  /** E41: hidden while this feature is switched off */
  feature?: FeatureKey
}

const items: MoreItem[] = [
  {
    to: '/more/data',
    icon: Database,
    title: 'Data',
    desc: 'Import your Excel conversion, export backups, reset',
  },
  {
    to: '/rounds',
    icon: Archive,
    title: 'Rounds',
    desc: 'End-of-round report, archive, round-over-round',
  },
  {
    to: '/more/sync',
    icon: Cloud,
    title: 'Cloud sync',
    desc: 'Optional, encrypted, on a backend you run',
  },
  {
    to: '/more/timer',
    icon: Timer,
    title: 'Rest timer',
    desc: 'Interval beeper for strength rests',
    feature: 'restTimer',
  },
  {
    to: '/more/quotes',
    icon: Quote,
    title: 'Motivation',
    desc: 'Daily quotes — curate your own pack',
    feature: 'quotes',
  },
  {
    to: '/more/settings',
    icon: Settings,
    title: 'Settings',
    desc: 'Stats, targets, units, scoring rules',
  },
  {
    to: '/more/notes',
    icon: NotebookPen,
    title: 'Notes',
    desc: 'Free-form training notes',
    feature: 'notes',
  },
  {
    to: '/more/calculators',
    icon: Calculator,
    title: 'Body-fat calculators',
    desc: 'Navy, 3-site, 7-site',
    feature: 'calculators',
  },
  {
    to: '/more/features',
    icon: SlidersHorizontal,
    title: 'Features',
    desc: 'Turn optional parts of the app on or off',
  },
  {
    to: '/more/help',
    icon: HelpCircle,
    title: 'Help',
    desc: 'Abbreviations, privacy, about',
  },
]

export function MorePage() {
  const { disabledFeatures } = useSettings()
  const visible = items.filter(
    (item) => item.feature === undefined || !disabledFeatures.includes(item.feature),
  )
  return (
    <Page title="More" subtitle="Settings, data and tools">
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-colors group-hover:border-red-300 dark:group-hover:border-red-800">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-red-600" aria-hidden />
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  )
}
