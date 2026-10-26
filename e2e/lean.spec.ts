import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Program choice & lock (US-073, amended by E33 U163). The variant is picked when
 * a program starts — Lean is a choice on /start — and is then locked for the
 * round: Settings shows it read-only and points to Rounds.
 */

async function openSettings(page: Page) {
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test('Lean is chosen at start and then locked for the round', async ({ page }) => {
  await page.goto('#/start')
  await page.getByRole('radio', { name: /Lean/ }).click()
  await expect(page.getByRole('radio', { name: /Lean/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/Day 1: Core Synergistics/)).toBeVisible()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page).toHaveURL(/#\/today/)

  await openSettings(page)
  await expect(page.getByText('Lean', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Switch to/ })).toHaveCount(0)
  await expect(page.getByText(/Locked for this round/)).toBeVisible()
  await page.getByRole('link', { name: 'Change program on Rounds' }).click()
  await expect(page).toHaveURL(/#\/rounds/)
})

test('an imported Lean backup keeps its variant (v1 export → v14 ref)', async ({ page }) => {
  const sample = JSON.parse(readFileSync('public/sample-data.json', 'utf8'))
  sample.settings.program = 'lean'
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.setInputFiles('input[type=file]', {
    name: 'lean.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sample)),
  })
  await expect(page.getByText('Lean', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await openSettings(page)
  await expect(page.getByText('Lean', { exact: true })).toBeVisible()
})
