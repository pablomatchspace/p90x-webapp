import { expect, test, type Page } from '@playwright/test'

/**
 * E28 round lifecycle journey: sample import → live report → complete &
 * archive → clean slate → archived report → restore. The sample program
 * started 2026-01-05, so by any test run date the round has reached day 90.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test('complete round → archive → report → restore journey', async ({ page }) => {
  await importSample(page)

  // day 90 reached → the dashboard offers the round-complete path
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByText('Round complete — 90 days in the books')).toBeVisible()
  await page.getByRole('link', { name: 'View round report' }).click()

  // live report ("so far") with the three outcome sections
  await expect(page.getByRole('heading', { name: 'Round report' })).toBeVisible()
  await expect(page.getByText(/So far — day 90 of 90/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Discipline' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Body outcome' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Strength outcome' })).toBeVisible()

  // archive it, keeping the seed option on (sample has weigh-ins)
  await page.getByRole('link', { name: 'All rounds →' }).click()
  await expect(page.getByRole('heading', { name: 'Current round' })).toBeVisible()
  await page.getByRole('button', { name: 'Complete round & archive…' }).click()
  await expect(page.getByText('Archive this round?')).toBeVisible()
  await expect(page.getByRole('checkbox')).toBeChecked()
  await page.getByRole('button', { name: 'Archive round', exact: true }).click()

  // clean slate: no live round here, empty dashboard, /start works again
  await expect(page.getByText(/Round 1 archived/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No round running' })).toBeVisible()
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByText('No program yet')).toBeVisible()

  // the archived round keeps its report
  await page.goto('#/rounds')
  await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible()
  await page.getByRole('link', { name: 'Report →' }).click()
  await expect(page.getByRole('heading', { name: 'Round 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Discipline' })).toBeVisible()
  await expect(page.getByText(/day 90/).first()).toBeVisible()

  // restore brings the round back live and empties the archive list
  await page.getByRole('link', { name: 'All rounds →' }).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('heading', { name: 'Current round' })).toBeVisible()
  await expect(page.getByText('No archived rounds yet', { exact: false })).toBeVisible()
})

test('next round compares against the archived one', async ({ page }) => {
  await importSample(page)
  await page.goto('#/rounds')
  await page.getByRole('button', { name: 'Complete round & archive…' }).click()
  await page.getByRole('button', { name: 'Archive round', exact: true }).click()

  // start round 2 via the ordinary /start flow
  await page.getByRole('link', { name: 'Start a program' }).click()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page).toHaveURL(/#\/today/)

  // the live report now carries the round-over-round section vs Round 1
  await page.goto('#/rounds/live')
  await expect(page.getByRole('heading', { name: 'Round over round' })).toBeVisible()
  await expect(page.getByText('vs Round 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Body — Weight')).toBeVisible()
})
