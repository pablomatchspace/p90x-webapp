import { Card, Page } from '@/components/Page'
import { formatAppVersion } from '@/lib/version'

/**
 * Help / About (US-074). The abbreviations legend is transcribed from the
 * workbook's INSTRUCTIONS sheet; the audio guide covers E26 cues and E30
 * voice entry; the privacy note states the app's local-only data stance
 * (decision D3); and the About block shows the build version and links to
 * the source.
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

/** What the E30 mic understands — mirrors the voiceEntry grammar. */
const VOICE_PHRASES: [string, string][] = [
  ['“reps 22, knee 8”', 'fills the named fields — trailing works too (“22 reps, 8 knee”)'],
  ['“twenty-two” · “12.5”', 'bare numbers fill the card’s fields in order, first empty one first'],
  ['“round 2 reps 20”', 'targets a round when the card shows more than one'],
  ['“next” · “previous”', 'moves between exercises (while the timer runs, “next” skips the phase)'],
  ['“finish workout”', 'completes the session — same as the Finish button'],
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
        <h2 className="text-base font-semibold">Audio &amp; voice</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium">Hearing the workout:</span> during play and focus playback,
          rest starts with a lower two-tone beep so it sounds different from work, and with{' '}
          <span className="font-medium">Voice cues</span> on (the toggle on the play and focus
          screens) each exercise is announced as it comes up.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium">Speaking your reps:</span> in focus mode, tap{' '}
          <span className="font-medium">Voice entry</span> and say one phrase (English recognition):
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {VOICE_PHRASES.map(([phrase, meaning]) => (
            <div key={phrase} className="contents">
              <dt className="font-medium text-zinc-700 dark:text-zinc-200">{phrase}</dt>
              <dd className="text-zinc-600 dark:text-zinc-300">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          Turn on <span className="font-medium">Hands-free</span> next to the mic and it re-arms
          after every phrase until you switch it off or leave the screen — starting always takes a
          tap, so nothing listens on page load. The mic asks for browser permission the first time,
          and the button only appears in browsers with speech recognition (Chrome, Edge, Safari).
          Your browser&rsquo;s own speech engine turns audio into text — it may use an online
          service for that — but the app itself never records anything and stores only the numbers
          you log.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Your data stays here</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Everything you enter lives on this device — in your browser&rsquo;s local storage and in
          the backup files you export. There is no account and no analytics, and nothing is uploaded
          anywhere. Because a browser can clear local storage on its own, back up regularly with{' '}
          <span className="font-medium">Data → Export</span> and keep the file somewhere safe.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          The one exception is <span className="font-medium">Cloud sync</span>, which is off unless
          you turn it on. It uploads to a backend <em>you</em> run, and encrypts everything on this
          device first with a passphrase only you know — the server stores data it cannot read.
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
            <dd className="font-medium tabular-nums">{formatAppVersion(__APP_VERSION__)}</dd>
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
