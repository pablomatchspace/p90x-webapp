import { Card, Page } from '@/components/Page'

export function BodyPage() {
  return (
    <Page title="Body" subtitle="Daily scale log">
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Body log entries and derived metrics arrive with Epic E5.
        </p>
      </Card>
    </Page>
  )
}
