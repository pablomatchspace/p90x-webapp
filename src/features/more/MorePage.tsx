import { Card, Page } from '@/components/Page'

export function MorePage() {
  return (
    <Page title="More" subtitle="Settings, data, notes, calculators, help">
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Settings, import/export, notes and calculators arrive with Epics E1 and E7.
        </p>
      </Card>
    </Page>
  )
}
