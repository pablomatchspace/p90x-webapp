# User stories

This file is the delivery index: every story below shipped, grouped by the epic
(one squash-merged PR per epic). The authoritative story text (full acceptance
criteria) lives in two places:

- **E0–E8** (the v1.0.0 scope) → [`docs/PRD.md` §9](../PRD.md#9-epics--user-stories).
- **E9 onwards** → the epic's own document under [`docs/epics/`](../epics/).

Story sizes: **S** ≤150 LOC · **M** ≤350 · **L** ≤500. Priority: **P0**
V1-blocking · **P1** fast-follow.

## E0 — Foundation & infrastructure

- ✅ US-001 · Project scaffold (M, P0)
- ✅ US-002 · CI pipeline (S, P0)
- ✅ US-003 · GitHub Pages deploy (S, P0)
- ✅ US-004 · Storage layer & schema (M, P0)
- ✅ US-005 · PWA (M, P0)
- ✅ US-006 · App shell & navigation (M, P0)

## E1 — Program template, converter & data lifecycle

- ✅ US-010 · Program templates & exercise catalog (L, P0)
- ✅ US-011 · xlsm→JSON converter (L, P0)
- ✅ US-012 · Import flow (M, P0)
- ✅ US-013 · Export, backup & reset (S, P0)
- ✅ US-014 · Sample dataset (S, P0)

## E2 — Schedule & program navigation

- ✅ US-020 · Schedule derivation engine (M, P0)
- ✅ US-021 · Calendar view (M, P0)
- ✅ US-022 · Today & day detail (M, P0)
- ✅ US-023 · Program status header (S, P0)

## E3 — Rescheduling

- ✅ US-030 · Skip / shift remaining (M, P0)
- ✅ US-031 · Undo & pull-forward (M, P0)
- ✅ US-032 · Move / swap single days (M, P0)
- ✅ US-033 · Weekly template editor (L, P1)
- ✅ US-034 · Reschedule integrity & audit (S, P0)

## E4 — Workout logging

- ✅ US-040 · Scoring engine (M, P0)
- ✅ US-041 · Strength log — grid view (L, P0)
- ✅ US-042 · Entry accelerators (M, P0)
- ✅ US-043 · Focus mode (L, P0)
- ✅ US-044 · Cardio-style logging (S, P0)
- ✅ US-045 · Ab Ripper X log (M, P0)
- ✅ US-046 · Rest/interval timer (S, P1)
- ✅ US-047 · Completion status rules (S, P0)

## E5 — Body log

- ✅ US-050 · Body log entry & derivations (M, P0)
- ✅ US-051 · Body log list & thresholds (S, P0)

## E6 — Dashboard & analytics

- ✅ US-060 · Dashboard assembly (M, P0)
- ✅ US-061 · Body trend charts (M, P0)
- ✅ US-062 · Adherence & pace (M, P0)
- ✅ US-063 · Strength progression charts (L, P0)
- ✅ US-064 · Motivational quotes (M, P0)

## E7 — Settings & extras

- ✅ US-070 · Settings screen (M, P0)
- ✅ US-071 · Notes page (S, P1)
- ✅ US-072 · Body-fat calculators (M, P1)
- ✅ US-073 · Lean variant toggle (L, P1)
- ✅ US-074 · Help / About (S, P1)

## E8 — Hardening & release

- ✅ US-080 · E2E journey suite (L, P0)
- ✅ US-081 · Performance & accessibility pass (M, P1)
- ✅ US-082 · Resilience & error UX (M, P0)
- ✅ US-083 · Docs & handover (S, P0)

## E9 — Fresh-start onboarding

Post-v1.0.0. Full write-up: [`docs/epics/E9-fresh-start-onboarding.md`](../epics/E9-fresh-start-onboarding.md).

- ✅ US-084 · `startProgram` action + no-overwrite guard (S, P0)
- ✅ US-085 · `/start` onboarding screen (M, P0)
- ✅ US-086 · Shared `NoProgramCard` empty state (S, P0)
- ✅ US-087 · E2E first-visit journey (S, P0)
- ✅ US-088 · Docs & README (S, P0)

## E10 — Cloud sync

Post-v1.0.0. Full write-up: [`docs/epics/E10-cloud-sync.md`](../epics/E10-cloud-sync.md).

- ✅ US-089 · Wire format, decision core, config store (S, P0)
- ✅ US-090 · End-to-end encryption layer (M, P0)
- ✅ US-091 · Self-hosted Cloudflare sync Worker (M, P0)
- ✅ US-092 · Client sync engine (M, P0)
- ✅ US-093 · Cloud sync screen and banners (M, P0)
- ✅ US-094 · E2E journeys against a mocked Worker (S, P0)
- ✅ US-095 · Docs and the D3 amendment (S, P0)

## E13 — Per-epic versioning & changelog

Post-v1.0.0. Full write-up: [`docs/epics/E13-versioning.md`](../epics/E13-versioning.md).

- ✅ US-096 · Version policy, `CHANGELOG.md`, correction of the deployed version to 1.2.0 (S, P1)

## E11 — Chest & Back focus sequence

- ✅ US-097 — focusSteps lib: 24-step C&B order, step-aware resume
- ✅ US-098 — step-based FocusPage, single-round cards, e2e rewrite

Post-v1.0.0. Full write-up: [`docs/epics/E11-chest-back-focus-sequence.md`](../epics/E11-chest-back-focus-sequence.md).

## E12 — Focus play timer

- ✅ US-100 — persisted timer settings: schema v2 + migration pipeline
- ✅ US-101 — pure playback engine
- ✅ US-102 — Play UI in FocusPage + e2e

Post-v1.0.0. Full write-up: [`docs/epics/E12-focus-play-timer.md`](../epics/E12-focus-play-timer.md).

## E14 — FFMI target estimator

- ✅ US-104 — shared FFMI math, schema v3 migration and dashboard target
- ✅ US-105 — Settings estimator with live plan and confirm-gated apply
- ✅ US-106 — end-to-end estimator and dashboard progress journey

Post-v1.0.0. Full write-up: [`docs/epics/E14-ffmi-target-estimator.md`](../epics/E14-ffmi-target-estimator.md).

## E15 — Playwright test device replacement & UI validation

- ✅ US-108 · Playwright test device replacement and UI validation (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E15-playwright-device-replacement.md`](../epics/E15-playwright-device-replacement.md).

## E16 — Plyometrics play

- ✅ US-108 · Playback engine per-step durations and skippable rests (M, P0)
- ✅ US-109 · Schema v4 play settings and per-exercise log (M, P0)
- ✅ US-110 · Plyometrics authored timeline and golden pins (M, P0)
- ✅ US-111 · Guided Plyometrics player, entries and e2e (L, P0)
- ✅ US-112 · Versioning convention, docs and release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E16-plyometrics-play.md`](../epics/E16-plyometrics-play.md).

## E17 — Kenpo X play

- ✅ US-113 · Untimed rep segments — engine waits and Done-to-advance UI (M, P0)
- ✅ US-114 · Kenpo X authored timeline and golden pins (M, P0)
- ✅ US-115 · Docs and release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E17-kenpo-play.md`](../epics/E17-kenpo-play.md).

## E18 — X Stretch + Cardio X play

- ✅ US-116 · X Stretch authored timeline and golden pins (M, P0)
- ✅ US-117 · Cardio X authored timeline, golden pins and e2e (M, P0)
- ✅ US-118 · Docs and release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E18-stretch-cardio-play.md`](../epics/E18-stretch-cardio-play.md).

## E19 — Yoga play variants

- ✅ US-119 · Both Yoga timelines (classic truncated, P90X3) and golden pins (L, P0)
- ✅ US-120 · Schema v5 yoga preference, Settings toggle and PlayPage picker (M, P0)
- ✅ US-121 · Docs and release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E19-yoga-play-variants.md`](../epics/E19-yoga-play-variants.md).

## E20 — FFMI target feasibility ("rub targets against reality")

- ✅ US-122 · Foundational hardening & the shared plan helper (M, P0)
- ✅ US-123 · Schema v6 + `settings.training` (M, P0)
- ✅ US-124 · Pure feasibility engine `src/lib/feasibility.ts` (L, P0)
- ✅ US-125 · The "Reality check" panel in Settings (L, P0)
- ✅ US-126 · Dashboard on-pace chip (M, P0)
- ✅ US-127 · E2E journey + visual baselines (M, P0)
- ✅ US-128 · Docs, oracle & release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E20-ffmi-feasibility.md`](../epics/E20-ffmi-feasibility.md).

## E21 — Sophisticated charting

- ✅ US-129 · Crosshair, trend lines, phase bands and new charts (L, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E21-charting.md`](../epics/E21-charting.md).

## E22 — Nutrition targets

- ✅ US-130 · Pure nutrition engine + schema v7 `settings.nutrition` (M, P0)
- ✅ US-131 · Today Nutrition card + Settings Nutrition section (M, P0)
- ✅ US-132 · Evidence-based target layer, docs & release (M, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E22-nutrition-targets.md`](../epics/E22-nutrition-targets.md).

## E23 — Workout media deeplinks

- ✅ US-133 · Schema v8 `settings.workoutLinks`, pure link helpers and store action (M, P0)
- ✅ US-134 · Settings Workout-links card, new-tab launch buttons and e2e (M, P0)
- ✅ US-135 · Docs and release (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E23-workout-deeplinks.md`](../epics/E23-workout-deeplinks.md).

## E24 — Recomposition-aware targets & low-carb diet style

- ✅ US-136 · `targetComposition` + per-tissue energy budget, schema v9 `dietStyle`, docs & release (L, P0)

Post-v1.0.0. Full write-up: [`docs/epics/E24-recomp-nutrition.md`](../epics/E24-recomp-nutrition.md).

## E25 — Body-trend continuity, composition units & motivation-first dashboard

- ✅ US-137 · Composition chart kg/% unit toggle (M, P1)
- ✅ US-138 · `fillForward` carry-forward continuity with dashed assumed spans (M, P0)
- ✅ US-139 · Daily-quote card first on the Dashboard (S, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E25-body-trend-continuity.md`](../epics/E25-body-trend-continuity.md).

## E26 — Audible play-mode coaching

- ✅ US-140 · Distinct rest beep — `beep(kind)` (S, P0)
- ✅ US-141 · Spoken exercise announcements + schema v10 `player.voiceCues` (M, P0)

Post-v1.0.0. Full write-up: [`docs/epics/E26-audible-play-coaching.md`](../epics/E26-audible-play-coaching.md).

## E27 — Workout media deeplinks in focus & play mode

- ✅ US-142 · E23 `MediaLinks` on the focus and play screens, visible during playback (M, P0)

Post-v1.0.0. Full write-up: [`docs/epics/E27-play-media-links.md`](../epics/E27-play-media-links.md).

## E28 — Round lifecycle: archive, report & round-over-round comparison

- ✅ US-143 · Round archive schema v11 (`rounds`) & lifecycle actions (M, P0)
- ✅ US-144 · End-of-round report — `roundReport.ts`, report view, dashboard card (L, P0)
- ✅ US-145 · Rounds page & guarded complete-and-archive flow (M, P0)
- ✅ US-146 · Round-over-round comparison — `roundCompare.ts` + report overlays (L, P1)

Post-v1.0.0. Full write-up: [`docs/epics/E28-round-lifecycle.md`](../epics/E28-round-lifecycle.md).
