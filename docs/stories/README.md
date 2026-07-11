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
