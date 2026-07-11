import { expect, test, type Page } from '@playwright/test'

/**
 * Logging journeys (US-040..046) against the fabricated sample dataset
 * (start 2026-01-05). Clock pinned to Jan 20 = day 15 (Chest & Back + ARX,
 * week 3). Sample week-1 C&B standard push-ups: 8/0 then 6/2 knee →
 * score 7.5, penalty 0.5 under the canonical rules.
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
})

test('strength grid shows live workbook scores and edits update them', async ({ page }) => {
  await page.goto('#/workouts')
  await page.getByRole('link', { name: 'Chest & Back' }).click()

  // defaults to the current week (3); jump back to week 1 of the sample data
  await page.getByLabel('Week', { exact: true }).selectOption('0')
  await expect(page.getByLabel('Standard Push-Ups score: 7.5, penalty 0.5')).toBeVisible()

  // raising round 2 to 8 reps (+2 knee) clears the drop: (8 + 9/…) → 8.5, no penalty
  await page.getByRole('textbox', { name: 'Standard Push-Ups round 2 reps' }).fill('8')
  await expect(page.getByLabel('Standard Push-Ups score: 8.5')).toBeVisible()

  // the imported week-2 annotation renders in the header input
  await page.getByLabel('Week', { exact: true }).selectOption('1')
  await expect(page.getByLabel('Week note')).toHaveValue('2 sample note')

  // ARX grid totals the session reps
  await page.goto('#/workouts')
  await page.getByRole('link', { name: 'Ab Ripper X' }).click()
  await page.getByLabel('Week', { exact: true }).selectOption('0')
  await expect(page.locator('p', { hasText: 'Total reps:' })).toContainText('210')
})

test('focus mode plays C&B as 24 steps, resumes, and finishes with a PR summary', async ({
  page,
}) => {
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()

  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()

  // ghost prefill from the latest earlier session (week 2: 9 reps); one tap copies it
  const round1 = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
  await expect(round1).toHaveAttribute('placeholder', '9')
  await page.getByRole('button', { name: 'Increase Standard Push-Ups round 1 reps' }).click()
  await expect(round1).toHaveValue('9')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  // interrupted → re-entering resumes at the first unlogged step
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()

  // round 2 starts at step 13 with the pair swapped: pull-ups before push-ups
  for (let i = 0; i < 11; i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByText('Step 13 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  // the swapped partner follows, showing this session's round-1 value read-only
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 14 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByText('Round 1: 9 · knee reps: —')).toBeVisible()

  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByText('Step 24 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dive-Bomber Push-Ups' })).toBeVisible()
  await page.getByRole('button', { name: 'Finish workout' }).click()

  await expect(page.getByRole('heading', { name: /Workout complete/ })).toBeVisible()
  await expect(page.getByText(/Session score/)).toBeVisible()
  // 9 reps beats the best earlier net (week 2: 9 vs 8 → 8.5 − 0.5)
  await expect(page.getByText(/1 PR vs last time: Standard Push-Ups/)).toBeVisible()

  // finishing marked the session done on Today
  await page.getByRole('link', { name: 'Back to Today' }).click()
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Chest & Back' }) })
  await expect(card.getByText('Done', { exact: true })).toBeVisible()
})

test('cardio sessions cycle status with notes, and the rest timer completes', async ({ page }) => {
  await page.goto('#/workouts')
  await page.getByRole('link', { name: 'Plyometrics' }).click()

  // week 1 shows the imported status + note ('Week 1 ·' so week 10+ can't match)
  const week1 = page.locator('section').filter({ hasText: 'Week 1 ·' })
  await expect(week1.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(week1.getByRole('textbox')).toHaveValue('Sample: kept up with the video')

  // log tomorrow's session (week 3) as done with a note; it persists across reload
  const week3 = page.locator('section').filter({ hasText: 'Week 3 ·' })
  await week3.getByRole('button', { name: 'Yes', exact: true }).click()
  await week3.getByRole('textbox').fill('Only completed 50%')
  await page.clock.fastForward(500) // let the debounced localStorage write land
  await page.reload()
  const week3Again = page.locator('section').filter({ hasText: 'Week 3 ·' })
  await expect(week3Again.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(week3Again.getByRole('textbox')).toHaveValue('Only completed 50%')

  // rest timer: preset, run down, ding
  await page.goto('#/more/timer')
  await page.getByRole('button', { name: '60 s' }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.clock.fastForward(61_000)
  await expect(page.getByText(/Time's up/)).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('0:00')
})
