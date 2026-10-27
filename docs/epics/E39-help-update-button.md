# Epic E39 — "Check for updates" in Help

> **Status:** delivered · **Stories:** US-176
> **Ships as:** package **1.39.176**, displayed **`1.E39.U176`** · **Schema:** unchanged (v14)
> **One-liner:** Help → About has a **Check for updates** button that fetches the newest
> build and, if there is one, installs it and reloads — no waiting for the browser's own
> update check or the bottom toast.

---

## 1. Problem

The app only learns about a new deploy when the browser happens to re-check its service
worker (on a fresh navigation), then shows a toast. An installed PWA that stays open or
backgrounded can sit on an old version for days, with no way to ask.

## 2. Decisions (owner, 2026-10-27)

| Topic | Decision |
|---|---|
| Behaviour | **Check, then update** — one button; installs and reloads when a newer version exists, otherwise says "You're on the latest version." |
| Confirmation | None — data is persisted locally (300 ms debounce) and survives the reload, like the toast's Update button |
| Version label | Not shown — plain "update found / up to date" |

## 3. Design

- `src/components/swBridge.ts` (no virtual PWA imports → unit-testable): holds the service-worker
  registration that `UpdateToast` hands over. `checkForUpdate()` → `'update-ready' | 'up-to-date' |
  'offline' | 'unavailable' | 'error'` (calls `registration.update()`, waits for a new worker to finish
  installing, 30 s cap). `applyUpdate()` posts `SKIP_WAITING` to the waiting worker and reloads on
  `controllerchange`, with a 3 s fallback for pages the worker never controlled.
- **Why not `updateServiceWorker(true)`:** vite-plugin-pwa wires its reload hook ~200 ms *after* a
  worker finishes installing (workbox debounces the `waiting` event). A user-triggered update can take
  over inside that window and the page never reloads — found by driving a real "deploy" in Chromium.
- `HelpPage` → About card: button + `role="status"` message; spinner while checking.

## 4. Stories

### US-176 — Check for updates button (S, P1)

**AC:** [x] button in Help → About · [x] installs and reloads when a newer build exists ·
[x] "latest version" / offline / unavailable / error messages · [x] unit tests for the check and apply
logic · [x] e2e: up-to-date and offline on the built app.
