import { Card, Page } from '@/components/Page'

/**
 * Help / About (US-074). The abbreviations legend is transcribed from the
 * workbook's INSTRUCTIONS sheet; the privacy note states the app's local-only
 * data stance (decision D3); and the About block shows the build version and
 * links to the source.
 */

const REPO = 'https://github.com/pablomatchspace/p90x-webapp'

/** Verbatim from INSTRUCTIONS!A9–A14. */
const ABBREVIATIONS: [string, string][] = [
  ['R1 / R2', 'Reps — first repeat / second repeat'],
  ['W1 / W2', 'Weight — first repeat / second repeat'],
  ['NC / C', 'Pull-ups — no chair / chair-assisted'],
  ['N / K', 'Push-ups — normal / on knees'],
  ['RA / LA', 'Right arm / left arm'],
  ['RL / LL', 'Right leg / left leg'],
]

export function HelpPage() {
  return (
    <Page title="Help &amp; About" subtitle="Abbreviations, privacy and version">
      <Card>
        <h2 className="text-base font-semibold">Abbreviations</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The shorthand used on the logging screens, from the workbook&rsquo;s legend.
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {ABBREVIATIONS.map(([term, meaning]) => (
            <div key={term} className="contents">
              <dt className="font-mono font-semibold text-zinc-700 dark:text-zinc-200">{term}</dt>
              <dd className="text-zinc-600 dark:text-zinc-300">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Your data stays here</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Everything you enter lives on this device — in your browser&rsquo;s local storage and in
          the backup files you export. There is no server, no account and no analytics; nothing is
          ever uploaded. Because a browser can clear local storage on its own, back up regularly
          with <span className="font-medium">Data → Export</span> and keep the file somewhere safe.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">About</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">App</dt>
            <dd className="font-medium">P90X Tracker</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Version</dt>
            <dd className="font-medium tabular-nums">{__APP_VERSION__}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
            <dd>
              <a
                href={REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-red-600 hover:underline"
              >
                GitHub repository
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Scores, schedule and body-fat calculators reproduce the P90Xcel workbook (v2.05). P90X® is
          a Beachbody® program; this is an independent personal tracker.
        </p>
      </Card>
    </Page>
  )
}
