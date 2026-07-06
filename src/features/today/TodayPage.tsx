import { Card, Page } from '@/components/Page'

export function TodayPage() {
  return (
    <Page title="Today" subtitle="What's on the plan">
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Today's workout card and quick actions arrive with Epic E2.
        </p>
      </Card>
    </Page>
  )
}
