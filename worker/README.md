# P90X Tracker — sync Worker

The optional backend for **cloud sync** (Epic E10). It is a single Cloudflare
Worker plus one KV namespace, and it holds exactly one blob: your app data,
**already encrypted** by the app before it leaves your browser.

**You run this yourself, in your own free Cloudflare account.** There is no shared
service and no account system. The app owner cannot read your data — nobody can
except a device that has your passphrase.

> Not required. With sync off (the default) the app behaves exactly as before:
> everything lives in your browser, and export/import is your backup.

## What it stores, and what it can't do

The Worker sees an envelope like `{v, updatedAt, deviceId, deviceName, cipher}`
where `cipher.data` is AES-256-GCM ciphertext. The key is derived from your
passphrase inside the browser and **never sent anywhere**.

The `SYNC_TOKEN` this Worker checks is a SHA-256 of your passphrase under a
different prefix, so it authenticates you without being able to decrypt anything.
Someone who steals the token can delete or overwrite your blob; they cannot read it.

Losing the passphrase orphans the **cloud** copy only — your local data is
untouched. Disable and re-enable sync with a new passphrase to start a fresh one.

## Setup — pick one

You need a free Cloudflare account for both.

### 1. Cloudflare dashboard — no terminal, no clone

`index.js` is a single file with **no imports** precisely so it can be pasted.

1. **Workers & Pages → Create → Start from Hello World! → Deploy.** Name it
   `p90x-sync`.
2. **Edit code**, select everything, and paste the contents of
   [`index.js`](index.js). **Deploy.**
3. **Storage & Databases → KV → Create namespace**, name it `p90x-sync`.
4. Back in the Worker: **Settings → Bindings → Add → KV namespace.** Variable
   name **`SYNC_KV`** (exactly), bound to the namespace from step 3.
5. **Settings → Variables and Secrets:**
   - **Secret** named `SYNC_TOKEN` — the value comes from the app (see below).
   - **Text** variable named `ALLOWED_ORIGINS` — set it to
     `https://pablomatchspace.github.io`, or `*` if you would rather not maintain
     a list.

Copy your Worker's URL (`https://p90x-sync.<your-subdomain>.workers.dev`).

### 2. wrangler CLI

```bash
npm install -g wrangler        # or use npx below
npx wrangler login
npx wrangler kv namespace create SYNC_KV   # paste the printed id into wrangler.toml
npx wrangler deploy                        # from this worker/ directory
npx wrangler secret put SYNC_TOKEN         # paste the value from the app
```

Edit `ALLOWED_ORIGINS` in [`wrangler.toml`](wrangler.toml) if you run a fork on a
different origin. To develop against it locally, `npx wrangler dev` and point the
app at `http://localhost:8787` (the app allows plain http on loopback only).

## Connect the app

1. In the app: **More → Cloud sync.**
2. Paste your Worker URL, choose a passphrase (8+ characters), name the device.
3. The page then shows your **`SYNC_TOKEN`** — copy it into the Worker (dashboard
   secret, or `npx wrangler secret put SYNC_TOKEN`).
4. **Sync now.**

On your second device: same URL, same passphrase. It pulls.

## API

Every route needs `Authorization: Bearer <SYNC_TOKEN>`.

| Route              | Returns                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `GET /v1/meta`     | `{revision, updatedAt, deviceName}` · `404` when empty                     |
| `GET /v1/state`    | `{revision, envelope}` · `404` when empty                                  |
| `PUT /v1/state`    | body `{baseRevision, envelope}` → `{revision, updatedAt}` · `409` if stale |
| `DELETE /v1/state` | `{ok: true}`                                                               |

`PUT` is a compare-and-swap on `baseRevision`, which is what stops a device that
has not seen the latest write from silently clobbering it. On `409` the response
carries the current `revision`, and the app asks you which copy wins.

The contract is small on purpose: any HTTPS host implementing these four routes
works. This Worker is the reference implementation, not a requirement.

## Cost, limits, maintenance

The free plan (100k requests/day, 1k KV writes/day) is far beyond one person's
use — a debounced push per edit burst is tens of writes a day.

Redeploy only when this directory changes; the app's own releases do not touch it.
**Nothing here is deployed by CI** — deploying is always a deliberate act by the
person who owns the account.

### One caveat, stated plainly

Cloudflare KV is eventually consistent. Two devices pushing within the same
propagation window could both pass the compare-and-swap, and the later write wins
— the earlier one is lost. For a single person syncing their own devices this is
rare and low-harm (the losing device still holds its data locally, and the app
writes a backup before every pull). If it ever matters, the same four routes can
be re-implemented on a Durable Object, which serialises writes.

## Tests

`worker/index.test.ts` drives the real HTTP contract against a fake KV and runs in
the app's normal `npm run test`. It covers auth (including refusing to start with
an unset secret), CORS allow-listing, the compare-and-swap, body validation and
the 5 MB cap, and the full round trip.
