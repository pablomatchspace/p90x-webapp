import { Calculator, Database, HelpCircle, NotebookPen, Quote, Settings, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'

const items = [
  {
    to: '/more/data',
    icon: Database,
    title: 'Data',
    desc: 'Import your Excel conversion, export backups, reset',
  },
  {
    to: '/more/timer',
    icon: Timer,
    title: 'Rest timer',
    desc: 'Interval beeper for strength rests',
  },
  {
    to: '/more/quotes',
    icon: Quote,
    title: 'Motivation',
    desc: 'Daily quotes — curate your own pack',
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
  },
  {
    to: '/more/calculators',
    icon: Calculator,
    title: 'Body-fat calculators',
    desc: 'Navy, 3-site, 7-site',
  },
  {
    to: '/more/help',
    icon: HelpCircle,
    title: 'Help',
    desc: 'Abbreviations, privacy, about',
  },
]

export function MorePage() {
  return (
    <Page title="More" subtitle="Settings, data and tools">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ to, icon: Icon, title, desc }) => (
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
