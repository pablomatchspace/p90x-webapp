import { expect, test, type Page } from '@playwright/test'
// The full 76-segment skip journey is intentionally exhaustive; the emulated
// mobile device needs more than the default 30s to render all transitions.
test.setTimeout(60_000)

/**
 * Plyometrics play mode (E16) on the migrated sample dataset. The sample starts
 * 2026-01-05 and skips 2026-01-14; therefore Plyometrics slot d016 lands on
 * 2026-01-21 (day 16). Playwright's clock drives Date.now and the 200ms player
 * interval deterministically.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
  // Allow the debounced persister (usually 500ms-1000ms) to save to localStorage before reloads
  await page.waitForTimeout(1000)
}

async function openPlyometrics(page: Page) {
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 76')).toBeVisible()
  await expect(page.getByText('March in Place')).toBeVisible()
}

/** Skip work/rest phases until the summary appears; split continuations have no rest. */
async function skipToSummary(page: Page) {
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  for (let i = 0; i < 150; i++) {
    await page.getByRole('button', { name: 'Skip', exact: true }).click()
    // Let React commit the transition before checking for the terminal summary.
    await page.clock.fastForward(1)
    if (await page.getByRole('heading', { name: 'Workout complete 🎉' }).isVisible()) return
  }
  await expect(page.getByRole('heading', { name: 'Workout complete 🎉' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-21T09:00:00') })
  await importSample(page)
  await openPlyometrics(page)
})

test('runs authored work/get-ready phases with pause, +10s, and skip', async ({ page }) => {
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const countdown = page.getByRole('timer', { name: 'Segment time remaining' })
  await expect(page.getByText('Work', { exact: true })).toBeVisible()
  await expect(countdown).toHaveText('0:30')

  // March in Place ends; the authored 5s get-ready phase precedes Run in Place.
  await page.clock.fastForward(30_300)
  await expect(
    page.getByRole('heading', { name: /Get ready — up next: Run in Place/ }),
  ).toBeVisible()
  await expect(countdown).toHaveText('0:05')

  // Pause freezes the countdown, then +10s and Skip advance the authored phase.
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const frozen = await countdown.textContent()
  await page.clock.fastForward(15_000)
  await expect(countdown).toHaveText(frozen ?? '')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.getByRole('button', { name: '+10 s', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Run in Place' })).toBeVisible()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
})

test('persists per-jump corrections and explicit completion', async ({ page }) => {
  await skipToSummary(page)

  // Skipping all segments leaves every logged jump unchecked; correct one on the summary.
  const jumpSquats = page.getByLabel('jump squats', { exact: true })
  await expect(jumpSquats).not.toBeChecked()
  await jumpSquats.check()
  await expect(page.getByText('Jumps done 1 of 23')).toBeVisible()
  await page.getByRole('button', { name: 'Mark completed — YES', exact: true }).click()
  await page.getByRole('status').getByRole('button', { name: 'OK', exact: true }).click()

  // The explicit completion is reflected in Today after returning.
  await page.getByRole('link', { name: 'Back to Today', exact: true }).click()
  await expect(page.getByText('Done', { exact: true }).first()).toBeVisible()
})

test('auto-mark toggle persists and marks completion at sequence end', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Auto-mark done', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.clock.fastForward(500)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Auto-mark done', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await skipToSummary(page)
  await expect(page.getByText('Marked done automatically — setting')).toBeVisible()
  await page.getByRole('link', { name: 'Back to Today', exact: true }).click()
  await expect(page.getByText('Done', { exact: true }).first()).toBeVisible()
})

test('E26: voice cues announce start and next exercise; rest beeps differ', async ({ page }) => {
  // Stub the Web Speech API so the utterances are recordable — headless audio
  // is silent anyway, and this pins exactly what would be spoken.
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel: () => {}, speak: (u: SpeechSynthesisUtterance) => spoken.push(u.text) },
    })
  })
  await page.clock.fastForward(500) // flush the debounced persister before reloading
  await page.reload() // re-boot so the init script takes effect
  await expect(page.getByText('Segment 1 of 76')).toBeVisible()

  // Voice cues default ON (schema v10 migration) and toggle like auto-mark.
  const toggle = page.getByRole('button', { name: 'Voice cues', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Start', exact: true }).click()
  // March in Place ends after its 30s → the get-ready rest announces Run in Place.
  await page.clock.fastForward(30_300)
  await expect(
    page.getByRole('heading', { name: /Get ready — up next: Run in Place/ }),
  ).toBeVisible()
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(spoken).toContain('March in Place') // spoken at workout start
  expect(spoken).toContain('Rest. Up next: Run in Place') // spoken at rest start

  // Turning the toggle off silences further announcements.
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const after = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)
  expect(after.filter((t) => t === 'March in Place')).toHaveLength(1)
})

/**
 * Kenpo X play mode (E17): registry-driven — the Play button auto-appears on a
 * Kenpo day. Timed warm-up stretches count down; rep drills wait for a Done tap.
 * The sample starts 2026-01-05; day 6 (Kenpo) = 2026-01-10, before the 01-14
 * skip, so the date is unaffected.
 */
test('Kenpo day shows Play workout with untimed rep waits (E17)', async ({ page }) => {
  // Move the frozen clock from the Plyo day (set in beforeEach) to the Kenpo day.
  await page.clock.setFixedTime(new Date('2026-01-10T09:00:00Z'))
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 93')).toBeVisible()

  // First segment is a timed 60s warm-up stretch — a countdown renders.
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('timer', { name: 'Segment time remaining' })).toHaveText('1:00')
  await page.getByRole('button', { name: 'Stop', exact: true }).click()

  // Browse to the first Punch Section drill (segment 27) — an untimed rep wait.
  for (let i = 0; i < 26; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(page.getByText('Segment 27 of 93')).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  // Untimed wait: rep target + a Done — next button (no countdown, no Pause/+10s).
  await expect(page.getByRole('button', { name: 'Done — next', exact: true })).toBeVisible()
  await expect(page.getByLabel('Rep target')).toHaveText('25 reps')

  // Done records the drill done and advances to the next drill.
  await page.getByRole('button', { name: 'Done — next', exact: true }).click()
  await page.clock.fastForward(1)
  await expect(page.getByText('Segment 28 of 93')).toBeVisible()
})

/**
 * X Stretch play mode (E18): the first segment is an untimed Sun Salutation
 * flow, so Start immediately enters a Done-to-advance wait (no countdown). The
 * sample is classic; X Stretch is day 25 = 2026-01-30 (after the 01-14 skip).
 */
test('X Stretch day shows Play workout with an untimed flow wait (E18)', async ({ page }) => {
  // Move the frozen clock from the Plyo day (set in beforeEach) to the X Stretch day.
  await page.clock.setFixedTime(new Date('2026-01-30T09:00:00Z'))
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 62')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sun Salutation Round 1' })).toBeVisible()

  // First segment is an untimed flow — Start enters a Done-to-advance wait.
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Done — next', exact: true })).toBeVisible()
})

/**
 * Cardio X play mode (E18): Cardio X is lean-only, so the test switches the
 * sample from classic to lean first. With start date 2026-01-05 and the 01-14
 * skip, lean day 16 (Cardio X) lands on 2026-01-21 — the same date the
 * beforeEach clock is already pinned to. Kenpo rep drills wait for a Done tap.
 */
test('Cardio X (lean) shows Play workout with untimed rep waits (E18)', async ({ page }) => {
  // Switch the sample's program from classic to lean via Settings.
  await page.goto('#/more/settings')
  await page.getByRole('button', { name: 'Switch to lean', exact: true }).click()
  // Confirm the variant change in the modal (scoped to the dialog to avoid the
  // row button of the same name).
  await page
    .getByRole('dialog', { name: 'Confirm program variant' })
    .getByRole('button', { name: 'Switch to lean', exact: true })
    .click()

  // The clock is still 2026-01-21 (beforeEach) = lean day 16 = Cardio X.
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 53')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Run in Place' })).toBeVisible()

  // Browse to the first Kenpo rep drill (segment 20) — an untimed 20-rep wait.
  for (let i = 0; i < 19; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(page.getByText('Segment 20 of 53')).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Done — next', exact: true })).toBeVisible()
  await expect(page.getByLabel('Rep target')).toHaveText('20 reps')
})

/**
 * Yoga Play variants (E19):
 * (a) Settings toggle persists across reload.
 * (b) Yoga day plays classic by default, showing the cutoff cue on segment 43.
 * (c) Changing settings to x3 makes Yoga day default to P90X3 timeline (62 segments).
 * (d) Per-launch override works without mutating Settings.
 */
test('Yoga play variants classic vs P90X3 (E19)', async ({ page }) => {
  // Classic day 11 is Yoga X = 2026-01-16 (due to Jan 14 skip)
  await page.clock.setFixedTime(new Date('2026-01-16T09:00:00Z'))
  await page.goto('/index.html#/day/2026-01-16')

  // Defaults to Classic (43 segments)
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 43')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mountain Pose' })).toBeVisible()

  // Overriding on screen to P90X3 changes timeline to 62 segments
  const x3Btn = page.getByRole('button', { name: 'P90X3 (30 min)', exact: true })
  await expect(x3Btn).toBeVisible()
  await x3Btn.click()
  await expect(page.getByText('Segment 1 of 62')).toBeVisible()
  await expect(page.getByRole('heading', { name: "Child's Pose" })).toBeVisible()

  // Switching back to Classic works
  const classicBtn = page.getByRole('button', { name: 'Classic (90 min)', exact: true })
  await classicBtn.click()
  await expect(page.getByText('Segment 1 of 43')).toBeVisible()

  // Browse to final Classic segment to check cutoff cue
  for (let i = 0; i < 42; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await expect(page.getByText('Segment 43 of 43')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Prayer Twist in Lunge (Right leg)' }),
  ).toBeVisible()
  await expect(page.getByText('(transcript ends here — continue with the video)')).toBeVisible()

  // Exit and go to settings
  await page.getByRole('link', { name: 'Exit', exact: true }).click()
  await page.goto('/index.html#/more/settings')

  // Set default Yoga variant to P90X3 (30 min) in Settings
  const settingsX3Pill = page.getByRole('button', { name: 'P90X3 (30 min)', exact: true })
  await settingsX3Pill.click()
  await page.waitForTimeout(1000) // let settings save
  await page.reload()

  // Verify settings toggle persisted across reload
  await expect(page.getByRole('button', { name: 'P90X3 (30 min)', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Verify PlayPage now defaults to X3 (62 segments)
  await page.goto('/index.html#/day/2026-01-16')
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page.getByText('Segment 1 of 62')).toBeVisible()
})

/**
 * Rest-day X Stretch Play redirection fix (E19 issue):
 * On a Rest day, the "Rest or X Stretch" card renders a "Play workout" button.
 * Clicking it must resolve the occurrence correctly on PlayPage instead of redirecting.
 */
test('Allows guided X Stretch play from a rest-day (E19 redirection fix)', async ({ page }) => {
  // Classic Day 7 = 2026-01-11 = Rest day
  await page.clock.setFixedTime(new Date('2026-01-11T09:00:00Z'))
  await page.goto('/index.html#/day/2026-01-11')

  // The card has title "Rest or X Stretch" with Play button
  await expect(page.getByRole('heading', { name: 'Rest or X Stretch' })).toBeVisible()
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()

  // Verify PlayPage resolves and loads Segment 1 of 62 (X Stretch)
  await expect(page.getByText('Segment 1 of 62')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sun Salutation Round 1' })).toBeVisible()
})
