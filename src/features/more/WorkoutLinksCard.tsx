import { useEffect, useState } from 'react'
import { Card } from '@/components/Page'
import { MEDIA_KINDS, parseLinkInput, type MediaKind } from '@/lib/links'
import { workouts } from '@/lib/programData'
import { updateWorkoutLink } from '@/state/actions'
import { useSettings } from '@/state/selectors'

/**
 * E23: one URL field per workout × media kind. Values commit on blur (or
 * Enter); a non-http(s) input is flagged inline and never reaches the store —
 * the same rule the schema and the action enforce. Blanking a field clears
 * the link, which removes its launch button everywhere.
 */
function LinkField({
  workoutKey,
  workoutName,
  kind,
  value,
}: {
  workoutKey: string
  workoutName: string
  kind: MediaKind
  value: string | undefined
}) {
  const [draft, setDraft] = useState(value ?? '')
  const [invalid, setInvalid] = useState(false)

  // re-seed when the stored value changes underneath (import, restore, sync pull)
  useEffect(() => {
    setDraft(value ?? '')
    setInvalid(false)
  }, [value])

  function commit() {
    const parsed = parseLinkInput(draft)
    if (!parsed.ok) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (parsed.url !== (value ?? null)) updateWorkoutLink(workoutKey, kind, parsed.url)
  }

  const label = `${workoutName} ${kind} link`
  return (
    <div className="min-w-0 flex-1">
      <label
        className="block text-xs text-zinc-500 dark:text-zinc-400"
        htmlFor={`link-${workoutKey}-${kind}`}
      >
        {kind === 'video' ? 'Video' : 'Audio'}
      </label>
      <input
        id={`link-${workoutKey}-${kind}`}
        type="url"
        inputMode="url"
        aria-label={label}
        aria-invalid={invalid}
        placeholder="https://…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className={`mt-0.5 w-full rounded-lg border bg-white px-3 py-1.5 text-sm dark:bg-zinc-950 ${
          invalid ? 'border-rose-400 dark:border-rose-700' : 'border-zinc-300 dark:border-zinc-700'
        }`}
      />
      {invalid ? (
        <p role="alert" className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
          Enter a full http(s) link
        </p>
      ) : null}
    </div>
  )
}

export function WorkoutLinksCard() {
  const links = useSettings().workoutLinks
  return (
    <Card>
      <h2 className="text-base font-semibold">Workout links</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Paste a video and/or audio link for each routine — a launch button then appears on that
        workout&rsquo;s cards and opens the session in a new tab. Links must be full http(s) URLs (a
        streaming site, your media server…). Blank a field to remove its button.
      </p>
      <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
        {workouts
          .filter((w) => w.style !== 'rest')
          .map((w) => (
            <div key={w.key} className="py-2">
              <div className="text-sm font-medium">{w.name}</div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:gap-3">
                {MEDIA_KINDS.map((kind) => (
                  <LinkField
                    key={kind}
                    workoutKey={w.key}
                    workoutName={w.name}
                    kind={kind}
                    value={links[w.key]?.[kind]}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </Card>
  )
}
