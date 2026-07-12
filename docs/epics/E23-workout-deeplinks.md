# Epic E23 — Workout media deeplinks (open video/audio in a new tab)

> **Status:** delivered · **Stories:** US-133 → US-135 · **Branch:** `claude/workout-deeplinks-new-tab-h0rdox`
> **Ships as:** package **1.23.135**, displayed **`1.E23.U135.B00`** · **Schema:** **v7 → v8** (`settings.workoutLinks`) · **Depends on:** E22 merged (package 1.22.132)
> **One-liner:** The athlete pastes a **video and/or audio deeplink per workout** in a new Settings card; each configured link becomes a launch button on that workout's Today/day card and detail header that opens the session media **in a new tab**, so the video or audio plays alongside the log screens.

---

## 1. Design

- **Persisted setting (schema v8):** `settings.workoutLinks: Record<workoutKey, { video?: url, audio?: url }>`,
  default `{}`, migration `7:` backfills. Raw user input, not derived (rule 2 holds).
  A workout whose links are all cleared drops out of the record entirely, keeping
  export/import minimal.
- **http(s)-only, enforced at every layer.** The Zod schema (`workoutLinkSchema`),
  the pure input parser (`src/lib/links.ts` — `isHttpUrl` / `parseLinkInput`) and the
  `updateWorkoutLink` action all reject `javascript:`/`data:`/relative input, so a
  pasted link can never inject script into the app. Launch anchors render with
  `target="_blank" rel="noopener noreferrer"`.
- **Entry UI:** a **Workout links** card at the end of Settings — one row per
  non-rest catalog workout (the rest day is covered by X Stretch), each with a
  Video and an Audio URL field. Commit on blur/Enter; invalid input gets an inline
  `Enter a full http(s) link` error and is never stored; blanking clears the link.
- **Launch UI:** `MediaLinks` (`src/features/workouts/MediaLinks.tsx`) renders the
  configured buttons (icon + Video/Audio + external-link affordance, accessible
  name `Open <workout> <kind> in a new tab`). Mounted on both branches of the
  Today/day `WorkoutCard` and in the `WorkoutDetailPage` header actions. Renders
  nothing when no link is configured — zero visual change for un-configured users.
- **No per-session storage.** Which link was opened is not logged (derived
  context, not raw input — mirrors E19's GD-F reasoning).

## 2. Stories

### US-133 — schema v8 `settings.workoutLinks` + pure lib + action (M, P0)

`src/lib/links.ts` (`MediaKind`, `isHttpUrl`, `parseLinkInput`), `workoutLinkSchema` +
`settings.workoutLinks` + `SCHEMA_VERSION = 8` in `schema.ts`, migration `7:`,
`updateWorkoutLink` action (unknown keys and non-http(s) input ignored; clearing the
last kind drops the workout entry), `useWorkoutLinks` selector. Unit tests: URL
acceptance/rejection matrix (`javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`,
relative, blank), migration chain v1→v8 and v7 keep-and-gain, action
set/replace/clear/reject paths.

**AC:** [x] v1–v7 docs migrate to v8 with `workoutLinks: {}` · [x] nothing
script-capable can enter state through schema, parser or action · [x] cleared
workouts leave no residue entry.

### US-134 — Settings card + launch buttons + e2e (M, P0)

`WorkoutLinksCard` in Settings (commit-on-blur drafts, inline invalid flag),
`MediaLinks` on Today/day cards + workout detail header. e2e journey
(`e2e/settings.spec.ts`): store a link → button appears on the day card with the
exact href/`target="_blank"`/`rel` → also on the detail page → invalid input
flagged and produces no button → blanking removes it.

Test fallout handled: `lean.spec.ts`'s loose `getByText(/Core Synergistics/)` is
scoped to the variant-confirm dialog (the links card also names the routine);
smoke step 24 pins `scrollTo(0, 0)` before shooting the fixed FFMI overlay (the
longer settings page made the fullPage stitch offset nondeterministic). Settings
visual baselines 22–24 regenerated for **linux**; **win32** needs the usual
regeneration pass on the Windows machine (CLAUDE.md).

**AC:** [x] buttons only for configured workouts · [x] new-tab semantics with
`noopener noreferrer` · [x] full suite + visual baselines green on linux.

### US-135 — docs & release (S, P1)

This doc, stories README section, CHANGELOG entry, `npm version 1.23.135`.

## 3. Scenario matrix

| Scenario                                | Expected                                                          |
| --------------------------------------- | ----------------------------------------------------------------- |
| Fresh state / migrated v1–v7            | `workoutLinks === {}`, no buttons anywhere                        |
| Valid https URL committed               | stored trimmed; buttons on Today card + detail header             |
| `javascript:`/`data:`/relative input    | inline error, nothing stored, no button                           |
| Blank a field                           | link cleared; empty workout entry dropped; buttons disappear      |
| Video only / audio only                 | only that button renders                                          |
| Rest day                                 | X Stretch's links cover the "Rest or X Stretch" card              |
| Export/import/sync round-trip           | links travel with the document (schema-validated)                 |
| Regression                              | E21 charts, E22 nutrition, play/focus flows — untouched and green |

## 4. Out of scope

Embedded playback inside the app (links open externally by design — offline-first
PWA stays network-free at runtime); per-session logging of which media was used;
auto-derived links or bundled media URLs (the app ships none — the athlete supplies
their own legally-sourced links).
