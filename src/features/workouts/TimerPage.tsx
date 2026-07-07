import { Page } from '@/components/Page'
import { TimerCard } from './TimerCard'

export function TimerPage() {
  return (
    <Page title="Rest timer" subtitle="Beeps and buzzes when the break is over">
      <TimerCard />
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        The screen stays awake while the timer runs on browsers that support wake lock; sound and
        vibration are used where available. The timer is also built into focus mode.
      </p>
    </Page>
  )
}
