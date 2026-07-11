# Epic E13 — Per-epic versioning & changelog

> **Status:** SPEC — awaiting build greenlight · **Story:** US-096 · **Branch:** `claude/epic-e13-versioning`
> **Ships as:** app version **1.2.0** (a _correction_ — E9/E10 are already deployed but still labeled 1.0.0)
> **Schema:** unchanged (SCHEMA_VERSION stays 1) · **Build order:** FIRST of the E11–E14 batch
> **One-liner:** every epic PR bumps the version and adds a changelog entry, so the deployed app always names the last merged epic; retroactively E9 = 1.1.0, E10 = 1.2.0.

This spec is an **execution blueprint**: follow it literally. Every file content and command is given in full. If any precondition or instruction does not match reality, **STOP and report — do not improvise.**

---

## 0. Executor contract

Repo root: `p90x-webapp/` inside the project folder. All commands run there.

**Preconditions — verify ALL before creating the branch; STOP on any mismatch:**

1. `git status` → clean working tree, branch `main`, up to date with `origin/main` (run `git pull` first).
2. `node -e "console.log(require('./package.json').version)"` → `1.0.0`.
3. File `CHANGELOG.md` does **not** exist yet at the repo root.
4. `npm ci` if `node_modules` is missing; then `npm run test` → all green **before any change**.

**Rules (from `CLAUDE.md`, restated so this file stands alone):**

- One epic = one branch = one PR. Conventional Commits. End every commit message with the trailer line CLAUDE.md specifies (`Co-Authored-By: …`).
- Validate before the commit: `npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`. No journey changes here, so `npm run e2e` is optional locally (CI runs it regardless).
- Stage explicit file lists. Never `git add -A`.
- Open the PR, watch CI. **Never merge** — stop and wait for Pablo's explicit "merge".
- `docs/PRD.md` is FROZEN. Do not edit it.

---

## 1. Problem & goal

`package.json` says `1.0.0` and flows into the UI via `vite.config.ts:45` → `__APP_VERSION__` → `src/features/more/HelpPage.tsx:64`. But E9 (PR #18) and E10 (PR #21) merged and deployed after 1.0.0, so the deployed app misreports itself. There is also no changelog and no rule forcing future epics to bump.

Goal: (a) a standing policy — **feature epic ⇒ minor bump, pure-fix work ⇒ patch bump, always with a CHANGELOG entry, inside the epic's own PR**; (b) retroactive correction to 1.2.0 now. Pablo's decision (Q9): the version simply always reflects the last merged epic — no separate "final version" target.

Verified: no hardcoded current-version strings exist anywhere else — a repo-wide grep for `1.0.0` finds only `package.json`, `package-lock.json`, and _historical/scope_ mentions in frozen docs (`docs/PRD.md`, `docs/epics/*`, `docs/stories/README.md` say "the v1.0.0 scope" — these describe scope E0–E8 and are **correct as written; do not touch them**). No e2e spec asserts a version string.

## 2. Story US-096 — policy, changelog, correction to 1.2.0

### Step 1 — branch

```
git checkout -b claude/epic-e13-versioning
```

### Step 2 — bump the version (updates `package.json` AND `package-lock.json` together)

```
npm version 1.2.0 --no-git-tag-version
```

Verify: `node -e "console.log(require('./package.json').version)"` → `1.2.0`, and `git diff --name-only` shows exactly `package.json` and `package-lock.json` so far.

### Step 3 — create `CHANGELOG.md` at the repo root with EXACTLY this content

```markdown
# Changelog

One entry per merged epic. Feature epics bump the **minor** version; pure-fix
work bumps **patch**. The bump and its entry land inside the epic's own PR, so
the deployed app (More → Help, via `__APP_VERSION__`) always names the last
merged epic.

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
```

> Note: versions 1.1.0/1.2.0 were never deployed under those numbers — the entries document which epic _would have_ carried them; from 1.2.0 onward the number is live. This is intentional and approved by Pablo (Q8).

### Step 4 — add the standing rule to `CLAUDE.md`

In the `## Workflow` section, the first bullet currently reads:

```markdown
- **One epic = one branch = one PR**, squash-merged after CI is green. Branch
  name `claude/epic-eN-<slug>`. Story-level Conventional Commits within the branch.
```

Insert this new bullet **immediately after it**:

```markdown
- **Version per epic:** every epic PR bumps the version — minor for feature
  epics, patch for pure-fix work — via `npm version <x.y.z> --no-git-tag-version`,
  plus a matching `CHANGELOG.md` entry (version — date — epic — PR). The deployed
  app must always report the last merged epic's version on More → Help.
```

### Step 5 — copy this spec into the repo

Copy this file verbatim to `docs/epics/E13-versioning.md`.

Append to the epic list in `docs/stories/README.md` (mirror the existing E9/E10 sections at its end — same heading level and format they use):

```markdown
## E13 — Per-epic versioning & changelog

- ✅ US-096 — version policy, `CHANGELOG.md`, correction of the deployed version to 1.2.0

Post-v1.0.0. Full write-up: [`docs/epics/E13-versioning.md`](../epics/E13-versioning.md).
```

(If that file's existing sections use a different heading depth for E9/E10, match theirs exactly.)

### Step 6 — validate, commit, PR

```
npm run format
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: all green; test count unchanged (296 unit tests as of E10 — if the number on main differs, that's fine, it must simply match pre-change main).

Commit (single commit, exact file list):

```
git add package.json package-lock.json CHANGELOG.md CLAUDE.md docs/epics/E13-versioning.md docs/stories/README.md
git commit -m "chore(release): version policy, changelog, correct deployed version to 1.2.0" -m "<trailer per CLAUDE.md>"
git push -u origin claude/epic-e13-versioning
```

Open the PR against `main` titled `E13 — per-epic versioning & changelog (v1.2.0)`, body = What (policy + retroactive correction) / Why (deployed app misreports 1.0.0 after E9+E10) / How (npm version, CHANGELOG back-entries, CLAUDE.md rule) / AC checklist from §3. Watch CI (`gh pr checks <N> --watch`). **STOP when green — do not merge.**

## 3. Acceptance criteria

- [ ] `package.json` and `package-lock.json` both say `1.2.0`; no other dependency/lockfile change.
- [ ] `CHANGELOG.md` exists with the three entries above, newest first.
- [ ] `CLAUDE.md` Workflow section contains the "Version per epic" bullet.
- [ ] `docs/PRD.md` untouched; scope mentions of "v1.0.0" elsewhere untouched.
- [ ] Spec copied to `docs/epics/E13-versioning.md`; `docs/stories/README.md` lists E13.
- [ ] CI fully green; PR open; merge NOT performed by the agent.
- [ ] After Pablo merges + Pages deploys: More → Help shows **1.2.0** (Pablo verifies in prod).

## 4. Scenario matrix

| Scenario                                        | Expected                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm version` on a dirty tree fails             | Preconditions require a clean tree first — investigate, don't force                       |
| A future epic forgets the bump                  | The CLAUDE.md bullet + each epic spec's release story prevent it; reviewer checklist item |
| Hotfix outside an epic                          | Patch bump + its own CHANGELOG entry, same mechanism                                      |
| Someone edits frozen PRD "v1.0.0 scope" wording | Out of scope — revert; those are scope labels, not version claims                         |

## 5. Out of scope / DO NOT TOUCH

- No in-app changelog UI (Help keeps showing just the version).
- No git tags, no GitHub Releases (can be added later; not requested).
- `docs/PRD.md` (frozen), `src/**` (zero source changes in this epic), `worker/**`.

## 6. Versions of the rest of this batch (for reference)

E11 → 1.3.0, E12 → 1.4.0, E14 → 1.5.0 — each epic's own spec contains its release story. E15 (grid responsiveness, on hold) will be patch or minor depending on final scope.
