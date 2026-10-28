import type { KeyboardEvent, ReactNode } from 'react'
import { Info } from 'lucide-react'
import { type InfoTipState, useInfoTip } from './useInfoTip'

/**
 * E40/US-179: tappable "more info" help. A small ⓘ button sits beside a label
 * or heading; pressing it (tap, Enter, Space) expands the explanation inline
 * right below, pressing again — or Escape — collapses it. Inline expansion
 * rather than a floating bubble: it works on touch, keyboard and screen
 * readers, never clips at a screen edge and never covers the form.
 *
 * The button and the panel are separate so each can sit where its layout needs
 * them (button inline with a heading, panel full-width underneath):
 *
 *   const tip = useInfoTip() // from ./useInfoTip
 *   <h2>Units <InfoToggle tip={tip} label="Units" /></h2>
 *   <InfoPanel tip={tip}>…explanation…</InfoPanel>
 */

/** The ⓘ button. `label` names what it explains ("More info: <label>"). */
export function InfoToggle({ tip, label }: { tip: InfoTipState; label: string }) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && tip.open) {
      event.stopPropagation()
      tip.close()
    }
  }
  return (
    <button
      type="button"
      aria-label={`More info: ${label}`}
      aria-expanded={tip.open}
      aria-controls={tip.panelId}
      onClick={tip.toggle}
      onKeyDown={onKeyDown}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full align-middle transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        tip.open ? 'text-red-600' : 'text-zinc-400 dark:text-zinc-500'
      }`}
    >
      <Info className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** The expanded explanation; renders nothing while collapsed. */
export function InfoPanel({ tip, children }: { tip: InfoTipState; children: ReactNode }) {
  if (!tip.open) return null
  return (
    <div
      id={tip.panelId}
      role="note"
      className="mt-1 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
    >
      {children}
    </div>
  )
}

/**
 * Convenience wrapper: renders `children(toggle)` — place the ⓘ wherever the
 * layout wants it — followed by the collapsible panel holding `help`.
 */
export function InfoTip({
  label,
  help,
  children,
}: {
  label: string
  help: ReactNode
  children: (toggle: ReactNode) => ReactNode
}) {
  const tip = useInfoTip()
  return (
    <>
      {children(<InfoToggle tip={tip} label={label} />)}
      <InfoPanel tip={tip}>{help}</InfoPanel>
    </>
  )
}
