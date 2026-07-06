import { expect, test } from '@playwright/test'

test('fresh app is empty and sample import journey works end-to-end', async ({ page }) => {
  await page.goto('/')
  // app never auto-loads data (PRD D3)
  await expect(page.getByText('No program yet')).toBeVisible()

  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()

  await expect(page.getByText('Preview — sample dataset')).toBeVisible()
  await expect(page.getByText('classic')).toBeVisible()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByText('No program yet')).not.toBeVisible()
})

test('invalid import file is rejected without touching state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.setInputFiles('input[type=file]', {
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{this is not json'),
  })
  await expect(page.getByRole('alert')).toContainText('Not valid JSON')
  await page.getByRole('link', { name: 'Dashboard' }).first().click()
  await expect(page.getByText('No program yet')).toBeVisible()
})
