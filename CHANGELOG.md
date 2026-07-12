# Changelog

One entry per merged epic. From E16 onward, package semver maps to the
`1.E{epic}.U{story}` display format; this supersedes E13's minor/patch rule.
The bump and its entry land inside the epic's own PR, so the deployed app
(More → Help) always names the last merged epic.

From the first post-1.E20.U128 hotfix onward, bug-fix-only releases (no new
story) append a bug-release counter: package `-bN` prerelease suffix →
display `1.E{epic}.U{story}.B{NN}` (zero-padded). A fresh story release
carries no suffix and displays `B00` — nothing's been fixed against it yet.
Each bug fix increments N from the last one merged against the _same_ story;
a new story resets it to B00. PRs #33 and #34 predate this convention and
didn't bump the package version — they're numbered B01/B02 here for a
continuous record; #33's package column is left at the un-suffixed version
that was actually shipped.

## 1.E20.U128.B03 (package 1.20.128-b3) — 2026-07-12

- **Bug fix**: the grid view's round row (main reps field + secondary field,
  e.g. knee reps) didn't wrap on narrower phones, so the secondary field's
  +/− buttons rendered outside the card frame instead of stacking below the
  main field. `RoundInputs` row now wraps.

## 1.E20.U128.B02 (package 1.20.128) — 2026-07-12

- **Bug fix** (PR #34): the rest timer's custom-seconds field couldn't take
  multi-digit values (45, 100, 120, 300...); fixed three related races in the
  cloud-sync engine (an after-reset safety pause cleared before its
  restore/upload finished, an in-flight pull silently discarding a concurrent
  local edit, a debounced push dropped mid-cycle), plus a follow-up for a
  conflict the pause fix itself left behind.

## 1.E20.U128.B01 (package 1.20.128) — 2026-07-12

- **Bug fix** (PR #33): the Reality check panel paced fat-loss verdicts off
  fat-mass lost instead of scale-weight lost, wrongly flagging sound recomp
  plans as unrealistic — now paces against actual weight change and explains
  recomp cases. Also fixed a hard-coded "kg" unit ignoring the units setting,
  and Row crushing labels into an unreadable one-word-per-line column next to
  wide controls on mobile.

## 1.E20.U128 (package 1.20.128) — 2026-07-11

- **E20 — FFMI target feasibility** (PR #<N>): the estimator now rubs the target
  against reality — remaining-horizon fat-loss and muscle-gain pace verdicts
  (fat-loss first) from two published rate models shown side by side, a recomp
  flag, an approximate natural-FFMI ceiling, and a suggested achievable target,
  plus an on-pace chip on the dashboard FFMI tile. New `settings.training`
  (schema v6). Evidence-tiered and cited in `docs/requirements/ffmi-feasibility.md`;
  gain-rate models are practitioner heuristics, not RCTs — labelled as such.

## 1.E19.U121 (package 1.19.121) — 2026-07-11

- **E19 — Yoga play variants** (PR #<N>): Yoga X days play the classic timeline
  (transcript-faithful, truncated where the transcript ends) or the P90X3
  30-minute timeline — persisted preference in Settings (schema v5) with a
  per-launch override on the play screen.

## 1.E18.U118 (package 1.18.118) — 2026-07-11

- **E18 — X Stretch + Cardio X play** (PR #<N>): both workouts join play mode as
  data-only timelines — timed holds, Done-to-advance flows and rep drills;
  Cardio X logs its 12 drills done/skipped. No engine or schema changes.

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
