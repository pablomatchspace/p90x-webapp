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

test('a first-time visitor starts a program from a date and logs a workout', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') })

  // nothing seeded into localStorage — this is a genuine first visit
  await page.goto('/')
  await expect(page.getByText('No program yet')).toBeVisible()

  await page.getByRole('link', { name: 'Start a program' }).click()
  // the field defaults to today, so a date pick is optional
  await expect(page.getByLabel('Start date')).toHaveValue('2026-01-05')

  // the offline-ready toast is pinned bottom-centre and can swallow the submit
  // click on the mobile profile (see the reset journey below)
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 3000 })
    .catch(() => {})
  await page.getByRole('button', { name: 'Start program' }).click()

  // the whole 90-day schedule materialized from the start date alone — no import
  // exact: on Today the subtitle also reads "Day 1 of 90 · Week 1 · Phase 1"
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Mark done' }).first().click()
  await expect(page.getByRole('button', { name: 'Mark not done' }).first()).toBeVisible()

  // flush the debounced write, then prove it survives a real reload
  await page.clock.fastForward(500)
  await page.goto('/')
  // exact: on Today the subtitle also reads "Day 1 of 90 · Week 1 · Phase 1"
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()
  await expect(page.getByText('No program yet')).toHaveCount(0)
})

test('/start never clobbers a program that already exists', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') })
  await page.goto('/')
  await page.getByRole('link', { name: 'Start a program' }).click()
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 3000 })
    .catch(() => {})
  await page.getByRole('button', { name: 'Start program' }).click()
  // exact: on Today the subtitle also reads "Day 1 of 90 · Week 1 · Phase 1"
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()

  // reaching /start again (typed URL, back button) must not offer to overwrite
  await page.goto('#/start')
  await expect(page.getByText('Program already started')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start program' })).toHaveCount(0)
})

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
  // The one-time PWA "Ready to work offline" toast is pinned to the bottom of the
  // viewport and can overlay the reset/restore controls on the mobile profile,
  // swallowing their clicks. Dismiss it once — it stays dismissed across the hash
  // navigations below (no reload).
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 8000 })
    .catch(() => {})
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
