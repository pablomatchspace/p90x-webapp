import { Card, Page } from '@/components/Page'

export function DashboardPage() {
  return (
    <Page title="Dashboard" subtitle="Your program at a glance">
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          KPI cards, trends and progression charts arrive with Epic E6.
        </p>
      </Card>
    </Page>
  )
}
