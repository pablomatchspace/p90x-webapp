import { ExternalLink, Headphones, MonitorPlay } from 'lucide-react'
import { MEDIA_KIND_LABELS, MEDIA_KINDS } from '@/lib/shared'
import { useWorkoutLinks } from '@/state/selectors'

const KIND_ICONS = { video: MonitorPlay, audio: Headphones } as const

/**
 * E23: launch buttons for a workout's configured media deeplinks. Renders
 * nothing until the athlete pastes a link in Settings; each link opens in a
 * new tab so the session video/audio plays alongside the log screens. The
 * settings layer only ever stores absolute http(s) URLs, and `noopener
 * noreferrer` keeps the opened tab off this window.
 */
export function MediaLinks({
  workoutKey,
  workoutName,
}: {
  workoutKey: string
  workoutName: string
}) {
  const links = useWorkoutLinks(workoutKey)
  if (links === undefined) return null
  return (
    <>
      {MEDIA_KINDS.filter((kind) => links[kind] !== undefined).map((kind) => {
        const Icon = KIND_ICONS[kind]
        return (
          <a
            key={kind}
            href={links[kind]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${workoutName} ${kind} in a new tab`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {MEDIA_KIND_LABELS[kind]}
            <ExternalLink className="h-3 w-3 text-zinc-400" aria-hidden />
          </a>
        )
      })}
    </>
  )
}
