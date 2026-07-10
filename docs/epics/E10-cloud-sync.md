# Epic E10 — Cloud sync (opt-in, self-hosted, end-to-end encrypted)

> **Status:** delivered · **Stories:** US-089 → US-095 · **Depends on:** E0–E9
> **One-liner:** Keep two devices in step through a small backend the user runs
> themselves — strictly opt-in, the server only ever holds ciphertext, and the app
> stays fully offline-capable.

## 1. Problem

The app is deliberately local-only (PRD decision D3): one browser's
`localStorage` is the single copy. That is the right default, but it makes a
second device a dead end — logging on the phone and reviewing on the desktop
means export → file shuffle → import, every time. The one-slot backup and the
export reminder mitigate _loss_; nothing mitigates _divergence_.

## 2. What the investigation found

The route was chosen against three alternatives (2026-07-10). An SFTP-based
design — the original request — is not buildable from a browser: browser
JavaScript has no raw TCP, so SFTP is unreachable without a bridge, and the
managed SFTP service evaluated exposes no HTTP file API. Its filesystem event
listeners push webhooks, which a client-only PWA has no server to receive. Once a
bridge is required, the bridge _is_ the backend and the SFTP hop adds nothing.

What made the rest cheap is that the document was already the sync unit:

| Fact                                                                | Evidence                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| The whole app state is one versioned JSON document                  | `lib/schema.ts` → `appStateSchema`, `SCHEMA_VERSION`           |
| Wholesale replacement already exists, and backs up what it replaces | `state/store.ts` → `replaceData(next, backupReason)`           |
| Untrusted documents already have a validation path                  | `lib/migrations.ts` → `migrateToCurrent` (used by file import) |
| Subscribe-debounce-write is an established pattern here             | `state/store.ts` → `attachPersistence()`                       |
| No Content-Security-Policy to amend                                 | verified: none in `index.html` or the Vite config              |
| The service worker precaches only; no runtime caching to bypass     | verified: `vite.config.ts` → `workbox.globPatterns`            |

**Consequence:** sync is "move that document, safely". No schema change, no
migration, no engine work — a wire format, a decision function, an encryption
layer, ~180 lines of Worker, and a screen.

## 3. Goals

1. Edit on one device, open another, be current — no file shuffling.
2. **Strictly opt-in.** Off until the user enters an endpoint and passphrase.
3. **Zero-knowledge storage.** The server holds AES-GCM ciphertext; the
   passphrase never leaves the device.
4. **No regression to the offline story.** Sync off ⇒ zero network calls.
5. **No schema bump.** Config lives outside the versioned document; exports stay
   byte-identical to v1.0.0.
6. **No lost updates.** A stale device cannot silently overwrite a newer copy.
7. **Anyone can run it.** No shared service, no account system, no owner-operated
   backend holding other people's data.

## 4. Non-goals

- **Accounts / multi-user.** One person, one passphrase, one blob. Two people =
  two Workers.
- **Field-level merge (CRDTs).** Full-document last-write-wins with an explicit
  conflict prompt. Simultaneous editing is not the use case.
- **Version history.** The Worker keeps one envelope; the app keeps its existing
  one-slot backup. R2/versioning is an escalation path.
- **Realtime.** No polling, no WebSockets. Freshness check on open plus a
  debounced push after edits is enough for a workout tracker.
- **Push-on-close.** `fetch` with `keepalive` caps bodies at 64 KB and beacons
  cannot carry auth headers. The dirty flag persists instead; the next open pushes.
- **Passphrase rotation or recovery.** Losing it orphans the _cloud_ copy only;
  local data is untouched. Disable → re-enable re-seeds.
- **In-app provisioning via a pasted Cloudflare API token.** Rejected twice over:
  a token that can deploy Workers is an account-level credential, and a public web
  app's `localStorage` is the wrong home for one (our derived `SYNC_TOKEN` unlocks
  exactly one ciphertext blob by contrast); and `api.cloudflare.com` is not built
  for browser origins, so the calls would likely die in preflight anyway. Users
  deploy the Worker themselves — see §10.

## 5. Design

### Server: `worker/` — self-hosted, one Worker, one KV key

A single module with **no imports**, so it can be pasted straight into the
Cloudflare dashboard editor by someone who will not clone a repo. Plain JS with
JSDoc types, kept honest by `checkJs`, and driven through its real HTTP contract
against a fake KV inside the existing Vitest suite — no new dependency, no new CI
job. All routes require `Authorization: Bearer <SYNC_TOKEN>`.

| Route              | Behaviour                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| `GET /v1/meta`     | `{revision, updatedAt, deviceName}` from KV metadata · 404 when empty       |
| `GET /v1/state`    | `{revision, envelope}` · 404 when empty                                     |
| `PUT /v1/state`    | body `{baseRevision, envelope}` — compare-and-swap · 409 + current revision |
| `DELETE /v1/state` | removes the envelope                                                        |

`PUT` is the whole safety story: it lands only when `baseRevision` still matches
the stored revision. `GET /v1/meta` reads metadata via `list`, so the open-time
freshness check never moves the blob. An unset `SYNC_TOKEN` refuses every request
rather than failing open. `ALLOWED_ORIGINS` is a CSV allow-list; nothing is
deployed by CI and no secret lives in the repo.

### Wire envelope (opaque to the server)

```jsonc
{
  "v": 1, // wire version, independent of SCHEMA_VERSION
  "updatedAt": "2026-07-10T…", // client clock — display only, never orders anything
  "deviceId": "uuid",
  "deviceName": "Desktop",
  "cipher": { "salt": "b64", "iv": "b64", "iterations": 600000, "data": "b64" },
}
```

`revision` is assigned by the server and is the sole ordering authority, because
client clocks disagree.

### Crypto (`lib/syncCrypto.ts`) — WebCrypto, zero dependencies

Two different values come out of the one passphrase:

- **Encryption key** — PBKDF2-SHA256 (600k, OWASP's current floor) → AES-256-GCM,
  created **non-extractable**. The salt travels in the envelope by design, so a
  second device derives the same key from the passphrase alone; the nonce is fresh
  per push; `iterations` is recorded so the cost can be raised without orphaning old
  envelopes.
- **Auth token** — PBKDF2-SHA256 at the same 600k cost over the domain-separated
  input `"p90x-sync-auth-v1:" + passphrase` (fixed salt), base64url. This is the
  `SYNC_TOKEN` the Worker stores. It is deliberately as expensive to brute-force
  as the key: the server necessarily holds it, and the adversary E2EE exists for
  _is_ a compromised server — a fast hash here would hand that adversary a cheap
  passphrase oracle. Two tests pin the consequences: **the token cannot decrypt an
  envelope**, and the domain separation holds **even under an attacker-chosen
  salt** (the prefix on the password input, not the salt, is what keeps the two
  derivations disjoint — the envelope's salt is server-supplied).

**The passphrase is never persisted.** It is stretched into the key at enable time
and then dropped. The key and the token live in IndexedDB
(`state/syncSecrets.ts`); because the key is non-extractable, `exportKey` refuses
and a copy of the browser profile yields nothing that decrypts the blob offline.
Nothing secret is ever written to `localStorage`.

Losing that store (clearing site data, a new browser profile) is not data loss: the
engine reports "turn sync off and on again to re-enter your passphrase".

### Client (`lib/sync.ts` pure core, `state/sync.ts` engine)

Config lives under its own `p90x.sync` localStorage key — outside the versioned
document, so no schema bump, no migration, and exports remain clean and portable.
It holds `{endpoint, salt, iterations, deviceId, deviceName, lastRevision, dirty,
pausedReason}` — **no secrets**. `salt` and `iterations` are public: they travel in
the envelope so another device can derive the same key.

Enabling on a device where the cloud already holds a copy **adopts that envelope's
salt** rather than minting a new one. Without this the second device would encrypt
correctly but never be able to read what the first one wrote. If the endpoint is
unreachable at that moment (the normal first run, before `SYNC_TOKEN` is set on the
Worker) a fresh salt is used, and a later pull of a foreign envelope reports a
precise "different passphrase or setup" message rather than an opaque decrypt
failure. Adoption is **bounded**: the envelope is server-supplied, so its
`iterations` must sit within `[PBKDF2_ITERATIONS, KDF_MAX_ITERATIONS]` (no silent
KDF downgrade, no minutes-long stall) and every cipher field is validated as
strict base64 before anything feeds `atob`.

The engine is fenced by a **generation counter**: enable, disable, pause, and
reset each bump it, and an in-flight cycle discards its own results if the world
moved on — a push resolving after "turn off sync" changes nothing. Push completion
compares the document against the exact **snapshot it encrypted**: an edit that
lands mid-flight keeps the dirty flag and schedules a follow-up push, instead of
being marked clean and later clobbered by a pull.

`decideSync({dirty, lastRevision, remote})` is the entire policy, and is pure:

| Remote                     | Local clean | Local dirty  |
| -------------------------- | ----------- | ------------ |
| absent (404)               | first-push  | first-push   |
| `revision == lastRevision` | idle        | push         |
| `revision != lastRevision` | pull        | **conflict** |

`attachSync()` mirrors `attachPersistence()`: subscribe, mark dirty, debounce
(3 s), push. On open it runs one cycle. Notable edges:

- **Pull is a `replaceData`**, so the one-slot backup is written first and a
  surprising download is undoable. The cloud copy is treated exactly like an
  imported file — it runs through `migrateToCurrent`, so a **newer-schema**
  document is refused with "update the app" rather than downgraded.
- **`applyingRemote`** guards the subscription so a pull cannot mark the document
  dirty and bounce straight back out.
- **`dirty` is persisted**, so a tab closed inside the debounce pushes next open.
- **`resetAll` notifies a listener the engine registers** (`setResetListener`).
  Without it the debounced push following a reset would replace the cloud copy
  with the empty document. Sync pauses instead, and resuming asks which copy wins.
- **Both resume-after-reset branches bypass `decideSync`** — a reset leaves the
  device in step (`lastRevision` never moved), so the decision core would answer
  `idle` and neither restoring nor uploading would happen. The user has already
  said which copy wins.
- **Every transport failure is a value, not an exception.** Unreachable is
  "offline, will retry"; 401 names `SYNC_TOKEN`; the local document is never
  touched on any failure path.

### UI (`/more/sync`)

Enable form asking for exactly two things — endpoint URL and passphrase — plus an
optional device name. Never a Cloudflare credential. It then derives and displays
the `SYNC_TOKEN` to set on the Worker, and links to the setup guide. Status card
(state, revision, last synced) with **Sync now**, **Pause/Resume**, **Show setup
token**; a split "turn off" (forget locally / also delete the cloud copy).

Two states get a banner in the app shell rather than waiting to be discovered,
because both mean data sits unreconciled and only the user can break the tie:
**conflict** and **paused after reset**. Each states plainly that nothing has been
overwritten, and deep-links to the resolution.

## 6. Stories

- ✅ **US-089 · Wire format, decision core, config store** (S, P0)
- ✅ **US-090 · End-to-end encryption layer** (M, P0)
- ✅ **US-091 · Self-hosted Cloudflare sync Worker** (M, P0)
- ✅ **US-092 · Client sync engine** (M, P0)
- ✅ **US-093 · Cloud sync screen and banners** (M, P0)
- ✅ **US-094 · e2e journeys against a mocked Worker** (S, P0)
- ✅ **US-095 · Docs, and the D3 amendment** (S, P0)

## 7. Scenario matrix

| Scenario                                     | Expected                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Sync disabled (default)                      | Zero network calls; behaviour identical to v1.0.0                       |
| First enable, empty cloud                    | First-push; revision 1                                                  |
| Second device, same endpoint + passphrase    | Fresh document ⇒ clean ⇒ pull, decrypt, apply (backup written first)    |
| Second device that already has data          | Dirty ⇒ conflict, never a silent overwrite                              |
| Edit, then 3 s idle                          | One debounced push; revision +1                                         |
| Edit, then close the tab before the debounce | `dirty` persists; next open pushes                                      |
| Offline for a week                           | App fully usable; pushes on the next online open                        |
| Remote ahead, local clean                    | Auto-pull, no prompt                                                    |
| Remote ahead, local dirty                    | Conflict banner; keep-mine force-pushes, take-cloud pulls               |
| Stale push reaches the server                | 409 → conflict → force-push bases on the returned revision              |
| Wrong passphrase on the second device        | Token mismatch ⇒ 401 before any decryption; clear message, no data loss |
| Second device enabled after the first pushed | Adopts the cloud envelope's salt, so its key opens that envelope        |
| Browser site data cleared (the key is gone)  | "Turn sync off and on again to re-enter your passphrase"; no data loss  |
| Edit lands while a push is in flight         | Stays dirty (snapshot comparison); a follow-up push is scheduled        |
| Sync disabled while a cycle is in flight     | Late results discarded (generation fence); status stays disabled        |
| Envelope demands out-of-bounds KDF cost      | Enable refuses — no silent downgrade, no stall                          |
| Envelope carries malformed base64            | Rejected by schema before anything reaches `atob`                       |
| Envelope from a newer app schema             | Pull refused, "update the app"; local untouched                         |
| Envelope from a newer **wire** version       | Refused by the envelope schema; local untouched                         |
| Corrupt / undecryptable envelope             | Refused; local untouched; error names the passphrase                    |
| `resetAll` with sync on                      | Sync pauses; resume asks upload-empty vs restore-cloud                  |
| Restore-after-reset when revisions match     | Pulls anyway (bypasses `decideSync`)                                    |
| Import a file with sync on                   | Normal dirty ⇒ push (last-write-wins, intended)                         |
| Endpoint unreachable                         | "Offline — will retry"; zero functional impact                          |
| Export with sync on                          | File byte-identical to v1.0.0 (config excluded)                         |
| Cloud copy deleted elsewhere                 | Re-seeded from this device                                              |

## 8. Risks & mitigations

| Risk                                                                | Mitigation                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A stale device overwrites newer cloud data                          | Server-side compare-and-swap on `baseRevision` → 409 → explicit user choice                                                                                                                                                               |
| KV is eventually consistent: two near-simultaneous pushes both pass | Single owner + LWW ⇒ rare and low-harm; documented in `worker/README.md`; Durable Object is the escalation path, same contract                                                                                                            |
| A pull replaces good local data                                     | Every pull goes through `replaceData`, which writes the one-slot backup first                                                                                                                                                             |
| Passphrase lost                                                     | Local data unaffected; cloud copy re-created by disable → re-enable                                                                                                                                                                       |
| A stolen browser profile decrypts the blob offline                  | The passphrase is never persisted, and the AES key is non-extractable — `exportKey` refuses, so its bytes cannot be lifted out of IndexedDB. (Script running _in the origin_ can still use the key; that is inherent to unattended sync.) |
| Server-held token brute-forced back to the passphrase               | The token is PBKDF2 at the full 600k cost, so each guess is as expensive as attacking the key itself; passphrase entropy still matters (≥ 8 chars enforced, longer advised)                                                               |
| Malicious server tricks a device into weak or hostile KDF params    | Adopted `iterations` bounded to `[600k, 10M]`; cipher fields schema-validated as strict base64; key/token domain separation holds under attacker-chosen salts (pinned by test)                                                            |
| IndexedDB unavailable or cleared                                    | Enable fails cleanly ("private mode?"); a later loss reports "re-enter your passphrase". Never data loss                                                                                                                                  |
| Secrets leak via the public repo                                    | Repo ships code only; `SYNC_TOKEN` is set by the operator; KV holds ciphertext                                                                                                                                                            |
| A reset wipes the cloud copy                                        | `resetAll` pauses sync; resuming demands an explicit choice                                                                                                                                                                               |
| Service worker caches sync responses                                | No Workbox runtime caching (verified); e2e drives real fetches per open                                                                                                                                                                   |
| Cloudflare free-tier limits (~1k KV writes/day)                     | One person's debounced pushes are tens per day                                                                                                                                                                                            |
| Multi-tab races on one device                                       | Same single-tab assumption as the existing persistence layer; unchanged                                                                                                                                                                   |

## 9. Verification

- **Unit (85 new):** `decideSync` truth table incl. the backwards-remote case;
  crypto round-trip, wrong passphrase, tampered ciphertext, nonce freshness, and
  the token-cannot-decrypt property; the Worker's four routes against a fake KV
  (auth, unset-secret, CORS allow-list, compare-and-swap, validation, 5 MB cap);
  the engine's every branch under mocked `fetch` (first-push, pull-with-backup,
  conflict both ways, reset-pause, resume both ways, offline, 401, 500, newer
  schema, newer wire version, dirty persistence, disable-and-delete).
- **e2e (6 new, both profiles):** push → second-device pull with real browser
  crypto; conflict raised then force-pushed; reset pauses and restores. One spec
  asserts the PUT body carries neither `schemaVersion` nor `startDate`.
- **Full CI:** lint, typecheck, unit + coverage, build, e2e, Lighthouse ≥ 90 —
  the sync-off path shows no regression.
- **Owner smoke (post-merge):** deploy the Worker once, enable on two devices, log
  a workout on one and watch it appear on the other.

## 10. Running it — including for people who are not the owner

The app hardcodes **no endpoint and no credentials**. Anyone deploys the same
`worker/` to their own free Cloudflare account; the app only ever asks for the
endpoint URL and a passphrase. Isolation is structural: each user's ciphertext
sits in their own Cloudflare account under their own passphrase. **The project
owner runs no service and holds nobody's data.**

Two setup paths, neither of which requires cloning the repo:

1. **Dashboard only** — paste `worker/index.js` into the online editor, create and
   bind the KV namespace, set the secret. No terminal. This is why the Worker has
   no imports.
2. **wrangler** — `login`, `kv namespace create`, `deploy`, `secret put`.

A one-click **Deploy to Cloudflare** button would remove most of path 1, but
whether that flow auto-provisions a KV binding for a Worker living in a repo
subdirectory is **unverified** — it is deliberately not documented as a supported
path until someone confirms it. A small mirror template repo is the likely fix.

Then: **More → Cloud sync** → endpoint + passphrase → copy the shown `SYNC_TOKEN`
onto the Worker. Second device: same URL, same passphrase.

Full instructions, the API contract, cost, and the KV consistency caveat live in
[`worker/README.md`](../../worker/README.md).

## 11. Decision amended

**D3** becomes: _"Personal data is local-only **by default**. Cloud sync is
strictly opt-in, end-to-end encrypted, and runs on a backend the user hosts
themselves."_ The app still never auto-loads or auto-uploads anything, the repo
still ships no real data, and with sync off the behaviour is exactly v1.0.0's.
