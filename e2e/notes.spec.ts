import { expect, test } from '@playwright/test'

/**
 * Notes page (US-071): a single autosaving text area whose content survives a
 * reload (persisted through the store's debounced saver) — no import needed.
 */
test('notes autosave and survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Notes\s+Free-form/ }).click()
  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()

  const box = page.getByRole('textbox', { name: 'Notes' })
  await box.fill('Phase 2 — up the pull-up weight; knees felt great today.')
  await page.waitForTimeout(400) // let the 300 ms debounced save fire

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue(
    'Phase 2 — up the pull-up weight; knees felt great today.',
  )
})
