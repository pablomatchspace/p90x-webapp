import { expect, test, type Page } from '@playwright/test'

/**
 * Focus play mode (E12) on the sample dataset @ 2026-01-20 (day 15, Chest &
 * Back — 24 steps after E11). Playwright's clock drives both Date.now() and the
 * 200 ms tick interval, so phases are advanced deterministically.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
})

test('play auto-advances work → rest → next step, with pause, extend, skip, stop', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const countdown = page.getByRole('timer', { name: 'Sequence time remaining' })
  await expect(page.getByText('Work', { exact: true })).toBeVisible()
  await expect(countdown).toHaveText('1:00')

  // work ends → rest on the SAME step; inputs stay editable; up-next shown
  await page.clock.fastForward(60_300)
  await expect(page.getByText(/Rest — up next: Wide Front Pull-Ups/)).toBeVisible()
  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
  await page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' }).fill('9')

  // rest ends → advances to step 2, back in a work phase
  await page.clock.fastForward(60_300)
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()
  await expect(page.getByText('Work', { exact: true })).toBeVisible()

  // pause freezes the countdown (ticks are ignored while paused)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const frozen = await countdown.textContent()
  await page.clock.fastForward(15_000)
  await expect(countdown).toHaveText(frozen ?? '')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()

  // +10 s and skip both act on the running phase
  await page.getByRole('button', { name: '+10 s', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText(/Rest — up next: Military Push-Ups/)).toBeVisible()

  // stop returns the manual controls
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible()
})

test('work and rest duration choices persist across a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Work 45 s', exact: true }).click()
  // the embedded rest timer's preset is the rest-between-steps duration
  await page.getByRole('button', { name: '90 s', exact: true }).click()
  await page.clock.fastForward(500) // flush the debounced persist
  await page.reload()
  await expect(page.getByRole('button', { name: 'Work 45 s', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: '90 s', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('E26: focus-only workouts can silence voice cues from their own flow', async ({ page }) => {
  // Chest & Back has no play timeline, so its only voice-cue control is here.
  const toggle = page.getByRole('button', { name: 'Voice cues', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true') // default on (schema v10)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  // the opt-out persists across a reload (raw player preference)
  await page.clock.fastForward(500)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Voice cues', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})
