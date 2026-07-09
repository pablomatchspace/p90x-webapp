import { expect, test, type Page } from '@playwright/test'

/**
 * Cross-feature journeys (US-080). Per-feature behaviour is covered by the
 * sibling specs; these prove the seams between features — and the E8 hardening
 * surfaces (backup safety net, corrupt-storage recovery, the skip-to-content
 * link) — hold end-to-end in a real browser.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test('a weigh-in logged on Today flows through to the dashboard body KPI', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)

  // log today's weight through the Today quick-add
  await page.goto('#/today')
  await page.getByRole('textbox', { name: 'Weight (kg)' }).fill('79.3')

  // hash navigation keeps the in-memory store, so the dashboard recomputes the
  // body-vs-targets KPI from the new latest weigh-in without a reload
  await page.goto('#/')
  await expect(page.getByText('Body vs targets')).toBeVisible()
  await expect(page.getByText('79.3', { exact: false }).first()).toBeVisible()
})

test('reset saves a backup that restore brings back (data safety net)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)
  await page.goto('#/')
  await expect(page.getByText('Day 15 of 90')).toBeVisible()

  // wipe everything from More -> Data
  await page.goto('#/more/data')
  await page.getByRole('textbox', { name: 'Type RESET to confirm' }).fill('RESET')
  await page.getByRole('button', { name: 'Reset everything' }).click()
  await expect(page.getByText(/All data cleared/)).toBeVisible()
  await page.goto('#/')
  await expect(page.getByText('No program yet')).toBeVisible()

  // the pre-reset state is in the one-slot backup — restore it
  await page.goto('#/more/data')
  await page.getByRole('button', { name: 'Restore this backup' }).click()
  await expect(page.getByText(/Backup restored/)).toBeVisible()
  await page.goto('#/')
  await expect(page.getByText('Day 15 of 90')).toBeVisible()
})

test('corrupted storage is quarantined and recoverable at boot', async ({ page }) => {
  // seed an unreadable document before any app code runs
  await page.addInitScript(() => {
    window.localStorage.setItem('p90x.state', '{ this is not json')
  })
  await page.goto('/')

  await expect(page.getByRole('alert')).toContainText('could not be read')
  // the app still boots to a usable empty state — not a white screen
  await expect(page.getByText('No program yet')).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('skip-to-content link moves keyboard focus into the main region', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})
