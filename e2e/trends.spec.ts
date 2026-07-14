import { expect, test, type Page } from '@playwright/test'

/**
 * Body trend chart journeys (US-061) against the sample dataset. Clock pinned to
 * 2026-01-20 (program day 15, phase 1) so the phase/all range filter is offered.
 * Sample: start 82 kg / 22% BF, target 77.554 kg; latest weigh-in 80.8 kg is
 * (82 − 80.8) / (82 − 77.554) ≈ 27% of the way to target. Latest BMI 24.94.
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

test('body trends plot each metric against its SETUP reference lines', async ({ page }) => {
  await page.goto('#/trends')

  // weight is the default metric: the SVG chart renders with start/target/limit lines
  const chart = page.getByRole('img', { name: /Weight trend/ })
  await expect(chart).toBeVisible()
  await expect(chart.locator('text', { hasText: 'Target' })).toHaveCount(1)
  await expect(chart.locator('text', { hasText: 'Limit' })).toHaveCount(1)
  // 80.8 kg latest is ~27% of the way from the 82 kg start to the 77.554 kg target
  await expect(page.getByText('27% to target')).toBeVisible()

  // switching metric recomputes the chart + read-out from the shared body engine
  await page.getByRole('tab', { name: 'BMI' }).click()
  await expect(page.getByRole('img', { name: /BMI trend/ })).toBeVisible()
  await expect(page.getByText('24.94')).toBeVisible()

  // mid-program the phase/all range filter is available
  await expect(page.getByRole('button', { name: 'This phase' })).toBeVisible()
})

test('E21 chart upgrades: trend overlay, phase shading, crosshair and composition', async ({
  page,
}) => {
  await page.goto('#/trends')

  const chart = page.getByRole('img', { name: /Weight trend/ })
  await expect(chart).toBeVisible()
  // dashed 7-day trend overlay is drawn and named in the legend
  await expect(page.getByText('┄ 7-day trend')).toBeVisible()
  // phase band labels shade the program phases behind the line
  await expect(chart.locator('text', { hasText: 'P1' })).toHaveCount(1)

  // the crosshair snaps to the nearest weigh-in and prints its value
  await chart.hover({ position: { x: 100, y: 100 } })
  await expect(chart.locator('[data-testid="crosshair"]')).toBeVisible()

  // the lean-vs-fat composition chart renders from the same weigh-ins
  await expect(page.getByText('Body composition')).toBeVisible()
  await expect(page.getByRole('img', { name: /Lean mass vs fat mass in kg/ })).toBeVisible()

  // E25: the composition chart toggles to percent of body weight and back
  await page
    .getByRole('group', { name: 'Composition unit' })
    .getByRole('button', { name: '%' })
    .click()
  await expect(page.getByRole('img', { name: 'Lean mass vs fat mass in %' })).toBeVisible()
  await page
    .getByRole('group', { name: 'Composition unit' })
    .getByRole('button', { name: 'kg' })
    .click()
  await expect(page.getByRole('img', { name: 'Lean mass vs fat mass in kg' })).toBeVisible()
})
