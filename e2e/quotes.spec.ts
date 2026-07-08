import { expect, test, type Page } from '@playwright/test'

/**
 * Quote editor journeys (US-064). The sample ships one custom quote; adding
 * another and reloading proves custom quotes persist in user data (the same
 * store slice that rides export/import).
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

test('curate the quote pack: add a custom quote that survives reload', async ({ page }) => {
  await page.goto('#/more/quotes')
  await expect(page.getByText('Your quotes (1)')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Edit quote/ })).toHaveValue(
    'Sample data: bring your own fire.',
  )

  await page.getByLabel('Quote text', { exact: true }).fill('Finish what you started today.')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Your quotes (2)')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Edit quote/ }).last()).toHaveValue(
    'Finish what you started today.',
  )

  // custom quotes live in user data → survive a reload (and export/import)
  await page.clock.fastForward(500)
  await page.reload()
  await expect(page.getByText('Your quotes (2)')).toBeVisible()
})
