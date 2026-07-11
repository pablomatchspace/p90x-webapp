import { expect, test, type Page } from '@playwright/test'

/** Import the v1 public fixture so this journey also exercises migration to schema v6. */
async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  // UTC anchor plus playwright.config's Europe/Madrid timezone fixes local day 15.
  await page.clock.install({ time: new Date('2026-01-20T09:00:00Z') })
  await importSample(page)
})

test('rubs an FFMI target against the remaining program window', async ({ page }) => {
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  // The schema-v6 input defaults to intermediate after the v1 import migration.
  const intermediate = page.getByRole('button', { name: 'Interm.', exact: true })
  await expect(intermediate).toHaveAttribute('aria-pressed', 'true')
  await intermediate.click()

  // E14's target drafts drive the additive E20 reality panel live.
  const ffmiInput = page.getByRole('textbox', { name: 'Target FFMI (normalized)' })
  await ffmiInput.fill('21')
  await ffmiInput.blur()
  const bfInput = page.getByRole('textbox', { name: 'FFMI plan body-fat (%)' })
  await bfInput.fill('15')
  await bfInput.blur()

  const panel = page.getByRole('region', { name: 'Reality check' })
  await expect(panel).toBeVisible()
  const fatHeading = panel.getByRole('heading', { name: 'Fat-loss pace' })
  const muscleHeading = panel.getByRole('heading', { name: 'Muscle-gain pace' })
  await expect(fatHeading).toBeVisible()
  await expect(muscleHeading).toBeVisible()
  await expect(fatHeading.locator('..').getByText('realistic', { exact: true })).toBeVisible()
  await expect(muscleHeading.locator('..').getByText('unrealistic', { exact: true })).toBeVisible()
  await expect(panel.getByText('Recomp: harder', { exact: true })).toBeVisible()
  await expect(panel.getByText('Ceiling: within', { exact: true })).toBeVisible()
  await expect(panel.getByText(/Suggested target: 19.9/)).toBeVisible()

  // The suggestion updates only the draft until the user confirms E14's existing modal.
  await panel.getByRole('button', { name: 'Use realistic target', exact: true }).click()
  await expect(ffmiInput).toHaveValue('19.9')
  const estimator = page.locator('section').filter({ hasText: 'Estimate from FFMI' })
  await expect(
    estimator.getByText('Lean mass (plan)', { exact: true }).locator('..'),
  ).toContainText('64.5')
  await page.getByRole('button', { name: 'Apply as targets', exact: true }).click()
  await page.getByRole('button', { name: 'Apply targets', exact: true }).click()

  // Hash navigation preserves the confirmed target; FFMI alone receives the pace chip.
  await page.goto('#/')
  const ffmiTile = page
    .locator('div.rounded-lg')
    .filter({ has: page.getByText('FFMI', { exact: true }) })
  await expect(ffmiTile.getByText('behind', { exact: true })).toBeVisible()
})
