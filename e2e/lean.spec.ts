import { expect, test, type Page } from '@playwright/test'

/**
 * Lean variant toggle (US-073). A switch on a program that already has data is
 * confirmed with an impact preview (day 1 becomes Core Synergistics), can be
 * cancelled, and once applied persists across a reload. The re-derivation math
 * itself is covered by the materialize golden test.
 */

async function openSettings(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
})

test('switching Classic to Lean is confirmed, applied and persisted', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByText('classic', { exact: true })).toBeVisible()

  // a switch with data present must be confirmed, and previews the impact
  await page.getByRole('button', { name: /Switch to lean/i }).click()
  await expect(page.getByRole('heading', { name: /Switch to lean\?/i })).toBeVisible()
  await expect(page.getByText(/day 1 becomes/i)).toBeVisible()
  // scope to the confirm dialog — the E23 Workout links card also names the routine
  await expect(
    page.getByRole('dialog', { name: 'Confirm program variant' }).getByText(/Core Synergistics/),
  ).toBeVisible()

  // cancelling leaves Classic in place
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('classic', { exact: true })).toBeVisible()

  // applying switches the variant
  await page.getByRole('button', { name: /Switch to lean/i }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Switch to lean/i })
    .click()
  await expect(page.getByText('lean', { exact: true })).toBeVisible()

  // and it survives a reload (the schedule re-derives from the persisted variant)
  await page.waitForTimeout(400)
  await page.reload()
  await expect(page.getByText('lean', { exact: true })).toBeVisible()
})
