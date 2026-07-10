import { expect, test } from '@playwright/test'

/**
 * Help / About (US-074): the abbreviations legend (from INSTRUCTIONS), the
 * local-only privacy note — including E10's one opt-in exception to it — and the
 * version + repo link. Static content — no import.
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

  // local-only privacy stance, and the one opt-in exception (cloud sync, E10)
  await expect(page.getByText(/nothing is uploaded anywhere/i)).toBeVisible()
  await expect(page.getByText(/off unless you turn it on/i)).toBeVisible()

  // version + source
  await expect(page.getByText('Version', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub repository' })).toBeVisible()
})
