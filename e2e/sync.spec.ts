import { expect, test, type Page } from '@playwright/test'

/**
 * Cloud-sync journeys against a mocked Worker (US-094).
 *
 * The endpoint is on loopback, which the app allows (it is the `wrangler dev`
 * path) and which keeps these specs same-origin — no CORS, no preflight, nothing
 * for the mock to get subtly wrong. The Worker's own CORS and compare-and-swap are
 * covered directly in `worker/index.test.ts`.
 *
 * Crypto is real: the browser genuinely encrypts on push and decrypts on pull.
 */

const ENDPOINT = 'http://localhost:4173/sync-test'
const PASSPHRASE = 'a good passphrase'

interface FakeWorker {
  revision: number
  envelope: unknown | null
  /** raw PUT bodies, so a spec can assert what actually crossed the wire */
  puts: string[]
}

async function mockWorker(page: Page): Promise<FakeWorker> {
  const server: FakeWorker = { revision: 0, envelope: null, puts: [] }

  await page.route('**/sync-test/v1/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path.endsWith('/v1/meta')) {
      if (server.envelope === null) return json({ error: 'empty' }, 404)
      return json({ revision: server.revision, updatedAt: '2026-01-05T09:00:00.000Z' })
    }

    if (request.method() === 'GET') {
      if (server.envelope === null) return json({ error: 'empty' }, 404)
      return json({ revision: server.revision, envelope: server.envelope })
    }

    if (request.method() === 'PUT') {
      const raw = request.postData() ?? ''
      server.puts.push(raw)
      const body = JSON.parse(raw)
      if (body.baseRevision !== server.revision) {
        return json({ error: 'revision conflict', revision: server.revision, updatedAt: 'x' }, 409)
      }
      server.revision += 1
      server.envelope = body.envelope
      return json({ revision: server.revision, updatedAt: 'x' })
    }

    if (request.method() === 'DELETE') {
      server.envelope = null
      return json({ ok: true })
    }
    return json({ error: 'not found' }, 404)
  })

  return server
}

/** The one-time "ready to work offline" toast is pinned bottom-centre and eats clicks on mobile. */
async function dismissToast(page: Page) {
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 3000 })
    .catch(() => {})
}

async function startProgram(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Start a program' }).click()
  await dismissToast(page)
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()
}

async function enableSync(page: Page, deviceName = 'Desktop') {
  await page.goto('#/more/sync')
  await dismissToast(page)
  await page.getByLabel('Endpoint URL').fill(ENDPOINT)
  await page.getByLabel('Passphrase', { exact: true }).fill(PASSPHRASE)
  await page.getByLabel('Device name').fill(deviceName)
  await page.getByRole('button', { name: 'Enable sync' }).click()
}

test('enabling sync uploads an encrypted copy, and a second device pulls it back', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') })
  const server = await mockWorker(page)

  await startProgram(page)
  await enableSync(page)

  // The setup token appears without another click — the README promises this, and
  // on a real first run the sync below would 401 until it is set on the Worker.
  await expect(page.getByText('Set this as SYNC_TOKEN on your Worker')).toBeVisible()

  await expect(page.getByText('Uploaded — revision 1.')).toBeVisible()
  expect(server.revision).toBe(1)

  // What crossed the wire is ciphertext: no field name from the document survives.
  expect(server.puts).toHaveLength(1)
  expect(server.puts[0]).not.toContain('schemaVersion')
  expect(server.puts[0]).not.toContain('startDate')
  expect(server.puts[0]).toContain('cipher')

  // A true second device: no document, no config, no key — only the endpoint and
  // the passphrase, entered through the form. Everything else must be recovered:
  // the token re-derived, the cloud envelope's salt adopted, the blob decrypted.
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('p90x-sync')
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })
  await page.reload()
  await enableSync(page, 'Phone')

  await expect(page.getByText('Downloaded — revision 1.')).toBeVisible()
  await page.goto('#/today')
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()
})

test('a conflict is raised rather than resolved silently, and "keep this device" wins', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') })
  const server = await mockWorker(page)

  await startProgram(page)
  await enableSync(page)
  await expect(page.getByText('Uploaded — revision 1.')).toBeVisible()

  // The other device pushes while this one is offline…
  server.revision = 2

  // …and this one edits locally, so both sides have moved.
  await page.goto('#/more/notes')
  await page.getByRole('textbox').first().fill('logged on this device')
  await page.goto('#/more/sync')
  await page.getByRole('button', { name: 'Sync now' }).click()

  await expect(page.getByRole('heading', { name: 'Both copies changed' })).toBeVisible()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Nothing has been overwritten' }),
  ).toBeVisible()
  expect(server.revision).toBe(2) // nothing was clobbered

  await page.getByRole('button', { name: 'Keep this device' }).click()
  await expect(page.getByText('Uploaded — revision 3.')).toBeVisible()
  // The force-push based on the revision the server handed back, not the stale one.
  expect(JSON.parse(server.puts.at(-1)!).baseRevision).toBe(2)
})

test('a reset pauses sync instead of wiping the cloud copy, and the copy can be restored', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-05T09:00:00') })
  const server = await mockWorker(page)

  await startProgram(page)
  await enableSync(page)
  await expect(page.getByText('Uploaded — revision 1.')).toBeVisible()

  await page.goto('#/more/data')
  await dismissToast(page)
  await page.getByLabel('Type RESET to confirm').fill('RESET')
  await page.getByRole('button', { name: 'Reset everything' }).click()
  await expect(page.getByText('All data cleared.')).toBeVisible()

  // The empty document must never reach the cloud on its own.
  await expect(
    page.getByRole('alert').filter({ hasText: 'Sync is paused after a reset' }),
  ).toBeVisible()
  expect(server.revision).toBe(1)
  expect(server.puts).toHaveLength(1)

  await page.getByRole('link', { name: 'Resolve' }).click()
  await expect(page.getByRole('heading', { name: 'Paused after a reset' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore from the cloud' }).click()

  // Restoring pulls even though this device never left revision 1.
  await expect(page.getByText('Downloaded — revision 1.')).toBeVisible()
  await page.goto('#/today')
  await expect(page.getByText('Day 1 of 90', { exact: true })).toBeVisible()
})
