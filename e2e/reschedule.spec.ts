import { expect, test, type Page } from '@playwright/test'

/**
 * Reschedule journeys (US-030..034) against the fabricated sample dataset
 * (start 2026-01-05, one skip on 2026-01-14). Clock pinned to Jan 20 = day 15.
 * Jan 21 = day 16 (Plyometrics), Jan 22 = day 17 (Shoulders & Arms + ARX).
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

test('skip shifts the schedule forward and undo compresses it back', async ({ page }) => {
  await page.goto('#/day/2026-01-21')
  await expect(page.getByRole('heading', { name: 'Plyometrics' })).toBeVisible()

  await page.getByRole('button', { name: 'Skip this day' }).click()
  await expect(page.getByText(/move one day later/)).toBeVisible()
  await expect(page.getByText(/Projected finish/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm skip' }).click()

  // the viewed date is now a gap day
  await expect(page.getByRole('heading', { name: 'Skipped day' })).toBeVisible()

  // two skips total → the status bar slip doubles
  await page.getByRole('link', { name: 'Schedule' }).first().click()
  await expect(page.getByText('+2 days', { exact: true })).toBeVisible()

  // undo from the gap page restores the exact prior schedule
  await page.goto('#/day/2026-01-21')
  await page.getByRole('button', { name: 'Undo this skip' }).click()
  await expect(page.getByRole('heading', { name: 'Plyometrics' })).toBeVisible()
})

test('swap exchanges two days and history can revert it', async ({ page }) => {
  await page.goto('#/day/2026-01-21')
  await page.getByRole('button', { name: 'Swap with another day' }).click()
  await page.getByLabel('Swap with').fill('2026-01-22')
  await expect(page.getByText(/will have: Shoulders & Arms/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm swap' }).click()
  await expect(page.getByRole('heading', { name: 'Shoulders & Arms' })).toBeVisible()

  // the audit trail lists it newest-first; undo restores Plyometrics
  await page.goto('#/schedule/history')
  await expect(page.getByText(/^Swapped .*Jan 21.*Jan 22/)).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).first().click()
  await expect(page.getByText('Reverted').first()).toBeVisible()

  await page.goto('#/day/2026-01-21')
  await expect(page.getByRole('heading', { name: 'Plyometrics' })).toBeVisible()
})

test('weekly order editor remaps the current week forward', async ({ page }) => {
  await page.goto('#/schedule')
  await page.getByRole('link', { name: 'Weekly order' }).click()

  // defaults to the current week (3); move Chest & Back + ARX off day 1
  await page.getByRole('button', { name: 'Move Chest & Back + Ab Ripper X down' }).click()
  await page.getByRole('button', { name: 'Apply new order' }).click()
  await expect(page.getByText(/Order applied — weeks 3–13/)).toBeVisible()

  // today (Jan 20, week 3 day 1) now leads with Plyometrics
  await page.goto('#/today')
  await expect(page.getByRole('heading', { name: 'Plyometrics' })).toBeVisible()

  // and the audit trail records the remap
  await page.goto('#/schedule/history')
  await expect(page.getByText('Weekly order changed from week 3')).toBeVisible()
})
