import { expect, test } from '@playwright/test'

/**
 * Help / About (US-074): the abbreviations legend (from INSTRUCTIONS), the
 * local-only privacy note and the version + repo link. Static content — no import.
 */
test('help page shows abbreviations, privacy note and version', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Help\s+Abbreviations/ }).click()
  await expect(page.getByRole('heading', { name: /Help/ })).toBeVisible()

  // abbreviations legend
  await expect(page.getByText('NC / C')).toBeVisible()
  await expect(page.getByText(/no chair \/ chair-assisted/i)).toBeVisible()
  await expect(page.getByText('RA / LA')).toBeVisible()

  // local-only privacy stance
  await expect(page.getByText(/nothing is ever uploaded/i)).toBeVisible()

  // version + source
  await expect(page.getByText('Version', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub repository' })).toBeVisible()
})
