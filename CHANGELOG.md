# Changelog

One entry per merged epic. From E16 onward, package semver maps to the
`1.E{epic}.U{story}` display format; this supersedes E13's minor/patch rule.
The bump and its entry land inside the epic's own PR, so the deployed app
(More → Help) always names the last merged epic.

## 1.E17.U115 (package 1.17.115) — 2026-07-11

- **E17 — Kenpo X play** (PR #<N>): 93-segment Kenpo timeline — timed stretch/
  cardio intervals count down; rep drills wait for a Done tap and log done/
  skipped per drill. Engine gains untimed-wait support; strength play unchanged.

## 1.E16.U112 (package 1.16.112) — 2026-07-11

- **E16 — Plyometrics play** (PR #<N>): “Play workout” runs the full Plyo video
  timeline — 76 segments (flattened splits, water breaks), authored 5s get-ready
  gaps, beep at every switch, per-jump done/skipped log (schema v4), optional
  auto-mark-done setting. Playback engine generalized; strength focus play
  unchanged. Versioning convention now `1.E{epic}.U{story}` (supersedes E13's
  minor/patch rule).

## 1.5.1 — 2026-07-11

- **E15 — Playwright test device replacement & UI validation** (PR #26): Replace emulated test
  device Pixel 7 with custom realme 16 Pro+ profile (RMX5131 specs), ensuring Playwright
  also verifies UI issues visible in screens for both desktop and the specific mobile device.
  - _Hardening pass (same PR):_ per-platform visual baselines (`-win32` committed from the dev
    machine, `-linux` from CI) so the diff threshold could tighten from 15% to **1%**; full-page
    captures instead of viewport-only; deterministic timer states (`clock.fastForward`) and a
    pinned timezone; soft, stepped assertions so all 31 comparisons run and report.

## 1.5.0 — 2026-07-11

- **E14 — FFMI target estimator** (PR #<N>): Settings → Targets & limits can now
  derive your targets from a normalized-FFMI goal (workbook 6.1 normalization) —
  implied lean mass, lean gain and weight shown live, applied behind a confirm as
  the honest lean-mass increase + target body-fat + a stored FFMI target
  (schema v3) that the dashboard KPI and trends track.

## 1.4.0 — 2026-07-11

- **E12 — Focus play timer** (PR #24): press Play and focus mode runs itself —
  work slot per step (default 60 s, adjustable), cue, rest at your configured
  duration with inputs still on the step you just did, auto-advance to the end.
  Pause / resume, +10 s, skip. Durations persist (schema v2 with a stepwise
  migration pipeline; old exports and the v1 sample import cleanly).

## 1.3.0 — 2026-07-11

- **E11 — Chest & Back focus sequence** (PR #23): focus mode plays Chest & Back
  as 24 single-round steps — round 1 in sheet order, round 2 with each push/pull
  pair swapped, matching the video. Grid, storage and scoring unchanged.

## 1.2.0 — 2026-07-10

- **E10 — Cloud sync** (PR #21): opt-in, end-to-end-encrypted cross-device sync
  against a self-hosted Cloudflare Worker + KV. D3 amended to "local-only by
  default; cloud strictly opt-in".
- Docs refresh chore (PR #19).

## 1.1.0 — 2026-07-10

- **E9 — Fresh-start onboarding** (PR #18): the `/start` route — begin a program
  by picking a date, no import needed.

## 1.0.0 — 2026-07-09

- **E0–E8 — the full v1.0.0 PRD scope** (PRs #8–#17): schedule + reschedule
  engine, workout logging with workbook-exact scoring, body log and derived
  metrics, dashboard / trends / strength progression, quotes, settings and
  body-fat calculators, hardening & release (error boundaries, a11y sweep,
  Lighthouse gates).
