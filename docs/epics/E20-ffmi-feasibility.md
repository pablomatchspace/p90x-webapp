# Epic E20 — FFMI target feasibility ("rub targets against reality")

> **Status:** EXECUTION BLUEPRINT — awaiting build greenlight · **Stories:** US-122 → US-128 · **Branch:** `claude/epic-e20-ffmi-feasibility`
> **Ships as:** package **1.20.128** (display `1.E20.U128`) · **Schema:** **v5 → v6** (adds `settings.training`)
> **Depends on:** E18 + E19 merged (main at `a3b13f4`, version 1.19.121, SCHEMA_VERSION = 5, migrations 1–4 present)
> **Oracle:** `docs/requirements/ffmi-feasibility.md` — the evidence-tiered constants live there (this blueprint pins the goldens). Read it first.
> **One-liner:** below E14's estimator, assess whether the FFMI-implied lean gain (and the body-fat drop) is achievable in the remaining program window, ranked fat-loss-first, with a suggested realistic target and a dashboard on-pace chip.

Execution blueprint — follow literally. If a quoted anchor doesn't match disk or a precondition fails, **STOP and report**.

---

## 0. Executor contract

Repo root `p90x-webapp/`; all commands run there.

**Preconditions — STOP on any mismatch:**
1. `git status` clean, on `main`, after `git pull --ff-only`.
2. `node -e "console.log(require('./package.json').version)"` → `1.19.121`. If higher, another epic landed — **STOP**, re-derive story numbers, schema version and anchors before proceeding.
3. `grep -n "SCHEMA_VERSION = " src/lib/schema.ts` → `5`. `src/lib/migrations.ts` has entries `1:` … `4:`.
4. `npm ci` if needed; `npm run test` green; `npm run build && npm run e2e` green before any change.
5. `docs/requirements/ffmi-feasibility.md` will be **created** in US-128; the constants it holds are pinned as goldens in US-124 below. If the numbers here and there ever diverge, the oracle doc wins — **STOP and reconcile**.

**Repo rules (self-contained):** Conventional Commits + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; validate before every commit (`npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`, + `npm run e2e` after build when journeys change, + `npm run lhci` once pre-PR — UI epic). Explicit `git add` lists. TS strict / `import type` / **no enums** (use string-literal unions). Vitest globals OFF, pure-logic tests in node. e2e name-matching is substring — selectors below are collision-checked. Open the PR; **never merge**.

**DO NOT TOUCH:** `src/lib/scoring.ts`, the FFMI **display** constant 6.1, `docs/PRD.md`, `worker/**`, and anything under `src/lib/timelines/**` or the player/focus code (E16–E19 territory).

**Versioning (E16/Q20):** package `1.{epic}.{lastStory}` = **1.20.128**; `npm version 1.20.128 --no-git-tag-version`; CHANGELOG heading `## 1.E20.U128 (package 1.20.128) — <date>`.

**Visual baselines (E15):** this epic changes the **Settings** and **Dashboard** pages → regenerate BOTH `-win32` (local) AND `-linux` (CI/Docker) smoke snapshot sets in US-127. A UI diff with stale baselines fails CI.

---

## 1. Locked decisions (Pablo, 2026-07-11)

- **Evidence policy:** tiered & disclosed. Two published pace models shown **side by side, no picker** (Aragon %BW = Tier B; Lyle absolute = Tier B). The self-synthesized "RCT band" is **out**. FFMI ceiling (Kouri, Tier A) + fat-loss pace (Helms, Tier A) overlaid.
- **Baseline = CURRENT lean** (latest weigh-in; fallback start lean). **Horizon = remaining program days** (no start date → 90; ≤ 0 → "program complete — fresh 90-day block").
- **Verdicts fat-loss-first**, lean-gain second; recomp simultaneity = *harder, not impossible* (Barakat); concurrent-training caveat cited (Wilson), **no invented discount multiplier**.
- **Sex:** %BW model gets **no** female multiplier (Refalo — relative gains similar); absolute model halves for females. Ceiling male 25.0 / female 23.9 (Harty), both approximate, 6.1-normalized with a provenance note.
- **Suggested target** = conservative (low) end of the user's tier across both models; CTA hidden when ≤ current FFMI + 0.1; rounded to 0.1; ceiling-clamped.
- **New raw input** `settings.training` (enum) — nothing derived is stored.
- **Dashboard on-pace chip** on the FFMI KPI tile only (target-relative, no science constants).
- Verdict bands (0.85× / 1.15×) are **product policy**, documented as such.

---

## 2. Story US-122 — Foundational hardening & the shared plan helper (M)

**Goal:** extract E14's inline `ffmiPlan` math from `SettingsPage.tsx` into a pure, tested helper (feasibility consumes it), and backfill the missing dashboard unit tests. **Zero behavior change.**

---

## 3. Story US-123 — Schema v6 + `settings.training` (M)

**Goal:** add training experience enum to `settingsSchema` and define v5 to v6 migration default to intermediate.

---

## 4. Story US-124 — Pure feasibility engine `src/lib/feasibility.ts` (L)

**Goal:** create pure feasibility helper evaluating monthly gain rates, fat loss rates, recomp flags, ceiling status, and suggested target from Aragon, Lyle, Helms, and Kouri data.

---

## 5. Story US-125 — The "Reality check" panel in Settings (L)

**Goal:** display the feasibility verdicts, recomposition flags, natural ceilings, and suggested target with an apply button below the E14 estimator in settings.

---

## 6. Story US-126 — Dashboard on-pace chip (M)

**Goal:** add pace evaluation logic and display status chip on the dashboard FFMI tile (on pace, behind, ahead).

---

## 7. Story US-127 — E2E journey + visual baselines (M)

**Goal:** implement Playwright journey testing for the FFMI estimator settings panel and dashboard chip. Regenerate local and CI snapshots.

---

## 8. Story US-128 — Docs, oracle & release (S)

**Goal:** finalize oracle requirements, copy epic blueprint, update story logs, and prepare package/changelog release.
