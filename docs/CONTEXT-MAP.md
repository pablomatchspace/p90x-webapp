# Context map — bounded contexts of `src/lib`

The domain layer (`src/lib`) is organized into seven bounded contexts, each a
directory with a public API barrel (`index.ts`). Terms are defined in
[`docs/GLOSSARY.md`](GLOSSARY.md). The boundaries are enforced mechanically by
`src/lib/architecture.test.ts` — a change that violates them fails `npm run test`.

## Contexts

| Context     | Directory            | Owns                                                                                                                                                                    |
| ----------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schedule`  | `src/lib/schedule/`  | Materializing the calendar (`materialize`, `occurrences`), reschedule ops, day/session status, adherence.                                                               |
| `workouts`  | `src/lib/workouts/`  | Scoring (workbook formulas), progression, overload targets, focus steps, playback, voice entry, interval timelines.                                                     |
| `body`      | `src/lib/body/`      | Body log derivations, BMI/FFMI, body-fat calculators, SETUP derivations & warnings, feasibility.                                                                        |
| `nutrition` | `src/lib/nutrition/` | Nutrition phases, calorie/macro targets, diet styles.                                                                                                                   |
| `rounds`    | `src/lib/rounds/`    | End-of-round report and round-over-round comparison, computed from archived rounds.                                                                                     |
| `sync`      | `src/lib/sync/`      | Cloud-sync document envelope and end-to-end crypto (E10).                                                                                                               |
| `shared`    | `src/lib/shared/`    | Shared kernel: the persisted document schema, migrations, import/export, ISO dates, workbook reference data (`programData`), chart helpers, links, quotes, app version. |

`src/state` is the application layer (store wiring, actions as use-cases,
selectors as the read model); `src/features` + `src/components` are the UI.
`worker/` is a separate deployable that shares no code with `src/lib`.

## Allowed dependencies

Each context may import only from the contexts listed (plus itself). The graph
is a DAG — no cycles, and `shared` depends on nothing.

| From \ may import | shared | schedule | body | workouts |
| ----------------- | ------ | -------- | ---- | -------- |
| `shared`          | —      |          |      |          |
| `schedule`        | ✓      | —        |      |          |
| `body`            | ✓      |          | —    |          |
| `workouts`        | ✓      | ✓        |      | —        |
| `nutrition`       | ✓      |          | ✓    |          |
| `sync`            | ✓      |          |      |          |
| `rounds`          | ✓      | ✓        | ✓    | ✓        |

The application layer (`src/state`) and UI (`src/features`, `src/components`)
may import from any context. Nothing in `src/lib` may import from `src/state`,
`src/features`, or `src/components` — the domain layer has no upward
dependencies and no side effects.

## Import rules

1. **Cross-context imports go through the barrel.** Outside a context, import
   `@/lib/<context>` — never a deep path like `@/lib/<context>/<module>`. The
   barrel is the context's published API.
2. **Within a context, import modules directly** (relative or deep `@/lib/...`
   path) — never your own barrel, to keep module resolution cycle-free.
3. **Respect the matrix above.** Needing an edge it doesn't allow is a design
   decision, not a lint fix: propose the edge (or a better home for the code)
   in the PR and update this document and the architecture test together.

## Notes on placement

- `programData` sits in `shared`, not `schedule` or `workouts`: the
  workbook-generated templates + catalog are reference data every context
  reads — a published language, not scheduling logic.
- `adherence` sits in `schedule`: it is a derivation over the materialized
  schedule and session index.
- `feasibility` sits in `body`: it judges body-composition targets, not
  workout performance.
- The persisted document schema (`shared/schema.ts`) intentionally spans
  contexts — the app persists one versioned document (CLAUDE.md, Schema
  changes). Contexts own _behavior_ over their slices of the document, not
  separate stores.
