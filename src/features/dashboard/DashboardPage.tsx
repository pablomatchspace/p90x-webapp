import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { useStore } from '@/state/store'

export function DashboardPage() {
  const startDate = useStore((s) => s.data.settings.startDate)
  return (
    <Page title="Dashboard" subtitle="Your program at a glance">
      {startDate === null ? (
        <Card>
          <h2 className="font-semibold">No program yet</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import your converted Excel data (or try the sample) to get started — the app never
            loads anything by itself.
          </p>
          <Link
            to="/more/data"
            className="mt-3 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Go to Import
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            KPI cards, trends and progression charts arrive with Epic E6.
          </p>
        </Card>
      )}
    </Page>
  )
}
