import { Card, Page } from '@/components/Page'
import { setNotes } from '@/state/actions'
import { useStore } from '@/state/store'

/**
 * Free-form notes (US-071) — a home for the workbook's YOUR NOTES sheet. A single
 * autosaving text area; the store's debounced persister writes it to local storage
 * and Data → Export carries it out.
 */
export function NotesPage() {
  const notes = useStore((s) => s.data.notes)
  return (
    <Page title="Notes" subtitle="Free-form training notes — saved on this device">
      <Card>
        <textarea
          aria-label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={16}
          placeholder="Jot anything — cues, PRs, how a workout felt, what to tweak next time…"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 text-sm leading-relaxed focus:border-red-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Autosaves as you type. Your notes travel with Data → Export.
        </p>
      </Card>
    </Page>
  )
}
