import { Calculator, Database, HelpCircle, NotebookPen, Quote, Settings, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'

const items = [
  {
    to: '/more/data',
    icon: Database,
    title: 'Data',
    desc: 'Import your Excel conversion, export backups, reset',
    ready: true,
  },
  {
    to: '/more/timer',
    icon: Timer,
    title: 'Rest timer',
    desc: 'Interval beeper for strength rests',
    ready: true,
  },
  {
    to: '/more/quotes',
    icon: Quote,
    title: 'Motivation',
    desc: 'Daily quotes — curate your own pack',
    ready: true,
  },
  {
    to: '/more/settings',
    icon: Settings,
    title: 'Settings',
    desc: 'Stats, targets, units, scoring rules',
    ready: true,
  },
  {
    to: '/more/notes',
    icon: NotebookPen,
    title: 'Notes',
    desc: 'Free-form training notes',
    ready: false,
  },
  {
    to: '/more/calculators',
    icon: Calculator,
    title: 'Body-fat calculators',
    desc: 'Navy, 3-site, 7-site',
    ready: false,
  },
  {
    to: '/more/help',
    icon: HelpCircle,
    title: 'Help',
    desc: 'Abbreviations, privacy, about',
    ready: false,
  },
]

export function MorePage() {
  return (
    <Page title="More" subtitle="Settings, data and tools">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ to, icon: Icon, title, desc, ready }) =>
          ready ? (
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
          ) : (
            <Card key={to} className="h-full opacity-60">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-zinc-400" aria-hidden />
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {desc} — coming with Epic E7
                  </p>
                </div>
              </div>
            </Card>
          ),
        )}
      </div>
    </Page>
  )
}
