# Epic E41 — Feature switches (More → Features)

> **Status:** delivered · **Stories:** US-180 – US-184
> **Ships as:** package **1.41.184**, displayed **`1.E41.U184`** · **Schema:** v15 (additive)
> **One-liner:** a **Features** page in More lets the owner turn optional parts of the app on or off,
> like feature flags — switching one off only hides it; nothing is deleted.

---

## 1. Problem

The app has grown many optional parts (quotes, notes, calculators, nutrition, FFMI, voice…).
Someone who does not use a part still sees it everywhere. They want a lean interface they control.

## 2. Decisions (owner, 2026-10-28)

| Topic | Decision |
|---|---|
| Scope | 13 features in three groups: **Sections** (rest timer, quotes, notes, calculators, trends & strength progress), **Cards and aids** (FFMI, nutrition, gear, workout links, adherence, overload targets), **Workout player** (voice entry, beeps & spoken cues). |
| Not switchable | Today, Schedule, Workouts and logging, Body log, Settings, Data, Help — and, by explicit decision, **Cloud sync** and **Rounds**. |
| Default | Everything **on** — no change on upgrade. |
| Storage | In app settings (`settings.disabledFeatures`), so it travels with export, backup and cloud sync. Schema v14 → v15; only keys switched **off** are stored, so a future feature is on by default with no migration. |
| Off behaviour | **Hide entry points only.** Data stays, and a page reached by URL still opens (e.g. `#/more/notes`). |
| FFMI scope | **Everything FFMI**: the card and scale (Body, dashboard), the dashboard FFMI tile and Trends metric, the FFMI value in the body log, and the Settings "Estimate from FFMI" panel with its Reality check. The stored FFMI target is kept. Archived round reports are historical and unchanged. |

## 3. Design

- `lib/shared/features.ts` — `FEATURE_KEYS`, the `FEATURES` catalog (title, what it hides, group),
  `isFeatureEnabled`, `applyFeatureToggle` (canonical order, no duplicates).
- Schema: `settings.disabledFeatures: FeatureKey[]`; migration `14` adds `[]`. An unknown key fails
  validation rather than being silently dropped.
- `state`: `setFeatureEnabled(key, enabled)` action; `useFeature(key)` selector.
- `features/more/FeaturesPage.tsx` — grouped `role="switch"` list; More shows a **Features** entry
  (never itself switchable) and hides the entries of switched-off sections.
- Surfaces gate themselves (`QuoteCard`, `AdherenceCard`, `NutritionCard`, `FfmiCard`, `GearList`,
  `MediaLinks`, `WorkoutLinksCard`) so every call site is covered at once. Settings hides the Nutrition
  card and the FFMI estimator; Focus mode hides the rest-timer card, overload target, mic button and the
  Voice-cues toggle.
- Audio: `setAudioEnabled` in `workouts/audio.ts` is a master switch — `beep`, `scheduleCues`,
  `unlockAudio` and `speak` become no-ops and queued cues/speech are cancelled. `useAudioFeature`
  (mounted by Focus, Play and the rest timer) keeps it in step with the setting.

## 4. Stories

### US-180 — Feature catalog, schema v15, action and selector (S, P1)
**AC:** [x] 13 keys, each with title/description/group · [x] migration v14→v15 leaves all features on ·
[x] unknown key rejected · [x] toggle keeps canonical order, is idempotent, never touches feature data.

### US-181 — More → Features page (S, P1)
**AC:** [x] grouped switches, all on by default · [x] persists across reload · [x] More entry always
visible · [x] accessible switches (`role="switch"`, `aria-checked`, name = feature title).

### US-182 — Sections (M, P1)
Rest timer, quotes, notes, calculators, trends & strength progress.
**AC:** [x] More entries hide · [x] quote cards hide · [x] Trends / Strength / Charts links hide ·
[x] pages still open by URL · [x] notes survive off → on.

### US-183 — Cards and aids (M, P1)
FFMI, nutrition, gear, workout links, adherence, overload targets.
**AC:** [x] each surface hidden on Today / Body / dashboard / Settings / Focus as listed above ·
[x] stored targets and links kept.

### US-184 — Workout player (S, P1)
Voice entry and beeps & spoken cues.
**AC:** [x] mic button hidden · [x] audio master switch silences beeps, scheduled cues and speech and
cancels queued ones · [x] Voice-cues toggle hidden while audio is off.

## 5. Not done / notes

- Cloud sync and Rounds are intentionally outside the switch list (owner decision).
- Visual baselines: only the More screenshot changes (new Features entry); Linux baselines regenerate
  via the **Update visual baselines** workflow, win32 stay stale.
