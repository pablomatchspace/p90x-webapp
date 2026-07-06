import { Card, Page } from '@/components/Page'

export function WorkoutsPage() {
  return (
    <Page title="Workouts" subtitle="Log sheets for every routine">
      <Card>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Workout logs, focus mode and entry accelerators arrive with Epic E4.
        </p>
      </Card>
    </Page>
  )
}
