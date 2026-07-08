import { expect, test, type Page } from '@playwright/test'

/**
 * Settings screen (US-070) against the sample @ 2026-01-20. Exercises the live
 * derived read-outs (target weight 77.6 kg), the units re-display (82 kg ⇄
 * 180.8 lb with no stored change), a live edit (80 kg → lean mass 62.4), and the
 * start-date re-anchor confirm that guards a program that already has data.
 */

async function openSettings(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
})

test('shows derived read-outs and re-displays units without changing stored values', async ({
  page,
}) => {
  await openSettings(page)

  const weight = page.getByRole('textbox', { name: /^Start weight/ })
  await expect(weight).toHaveValue('82')

  // derived from the sample SETUP: target weight 77.6 kg, lean mass 64.0 kg
  await expect(page.getByText('77.6')).toBeVisible()

  // toggle to imperial: the same 82 kg re-displays as 180.8 lb (no stored change)
  await page.getByRole('group', { name: 'Units' }).getByRole('button', { name: 'Imperial' }).click()
  await expect(page.getByRole('textbox', { name: /^Start weight/ })).toHaveValue('180.8')

  // and back
  await page.getByRole('group', { name: 'Units' }).getByRole('button', { name: 'Metric' }).click()
  await expect(page.getByRole('textbox', { name: /^Start weight/ })).toHaveValue('82')
})

test('recomputes derived stats live as inputs change', async ({ page }) => {
  await openSettings(page)

  const weight = page.getByRole('textbox', { name: /^Start weight/ })
  await weight.fill('80')
  await weight.blur()

  // lean mass = 80 × (1 − 0.22) = 62.4
  await expect(page.getByText('62.4')).toBeVisible()
})

test('confirms a start-date change on a program that already has data', async ({ page }) => {
  await openSettings(page)

  await page.getByLabel('Start date', { exact: true }).fill('2026-02-01')

  // re-anchoring a program with logged data must be confirmed, not silent
  await expect(page.getByText('Move your start date?')).toBeVisible()
  await expect(page.getByText(/shifts/)).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Move your start date?')).toBeHidden()
  // cancelled → the original day 1 stands
  await expect(page.getByLabel('Start date', { exact: true })).toHaveValue('2026-01-05')
})
