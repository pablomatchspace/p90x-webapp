# Graph Report - p90x-webapp  (2026-10-26)

## Corpus Check
- 239 files · ~146,926 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1508 nodes · 4716 edges · 79 communities (54 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c38c816`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ops.ts
- Workbook Converter Tools
- Focus/Play UI
- SettingsPage.tsx
- Scoring, Overload, Progression
- gen_sample.mjs
- programData.ts
- Nutrition Engine
- Shared Test Fixtures
- RoundCompareSection.tsx
- Store & Persistence
- BodyPage.tsx
- Card
- Voice Entry
- workouts/index.ts
- Charts
- Schema & Units
- Quotes
- Program Data & Focus Steps
- Body-Fat Calculators
- rounds.ts
- actions.test.ts
- App.tsx
- roundReport.ts
- Timeline Registry
- Build Config & Deps
- Sync Config
- Strength Progress
- App TS Config
- Dev Dependencies
- Repomix Config
- Sync Crypto
- Data Import/Export
- Sync Engine Flow
- Sync API Client
- Node TS Config
- shared/index.ts
- migrateToCurrent
- Sync State Wiring
- ports.ts
- schedule.ts
- Sync Page & Secrets
- Sync Worker
- npm Scripts
- src_lib_shared_index_getworkout
- selectors.ts
- Sync Decisions
- Playwright E2E Specs
- playerSettings.ts
- Body Log Actions
- Runtime Dependencies
- Sync E2E Spec
- Oxlint Config
- CI Workflow
- Voice E2E Spec
- Prettier Config
- Pages Deploy
- Root TS Config
- Dependabot
- CodeQL
- App Shell HTML

## God Nodes (most connected - your core abstractions)
1. `Card()` - 78 edges
2. `vitest` - 55 edges
3. `SettingsPage()` - 54 edges
4. `useStore` - 53 edges
5. `Page()` - 49 edges
6. `getWorkout()` - 45 edges
7. `FocusPage()` - 41 edges
8. `todayISO()` - 39 edges
9. `formatLong()` - 37 edges
10. `react` - 34 edges

## Surprising Connections (you probably didn't know these)
- `enable()` --indirect_call--> `fetch()`  [INFERRED]
  src/state/sync.test.ts → worker/index.js
- `lb()` --calls--> `kg`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/units.ts
- `settingsWith()` --calls--> `emptyState()`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/schema.ts
- `entry()` --calls--> `kg`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/units.ts
- `entriesFor()` --calls--> `getWorkout()`  [EXTRACTED]
  src/lib/schedule/status.test.ts → src/lib/shared/programData.ts

## Import Cycles
- None detected.

## Communities (79 total, 25 thin omitted)

### Community 0 - "ops.ts"
Cohesion: 0.14
Nodes (12): fast-check, groupByWeek(), materialize(), slotId(), newRemapOp(), opEffect(), previewOp(), remapBaseWeek() (+4 more)

### Community 1 - "Workbook Converter Tools"
Cohesion: 0.06
Nodes (36): convert(), main(), num(), read_settings(), length(), mass(), build_catalog(), build_templates() (+28 more)

### Community 2 - "Focus/Play UI"
Cohesion: 0.09
Nodes (32): react, FocusPage(), Sparkline(), MediaLinks(), useWakeLock(), PlayPage(), PRESETS, TimerCard() (+24 more)

### Community 3 - "SettingsPage.tsx"
Cohesion: 0.04
Nodes (38): Derived(), NUTRITION_GOAL_LABEL, NUTRITION_GOAL_TONE, NUTRITION_PHASES, RECOMP_TONE, Row(), Segmented(), SettingsPage() (+30 more)

### Community 4 - "Scoring, Overload, Progression"
Cohesion: 0.13
Nodes (17): workoutOccurrences(), ArchivedRound, ExerciseEntry, ScoringSettings, archiveLatestNets(), overloadTarget, targetStatus, entry() (+9 more)

### Community 5 - "gen_sample.mjs"
Cohesion: 0.12
Nodes (14): arxDays, bodyLog, cardioPlan, catalog, entriesFor(), out, push(), root (+6 more)

### Community 6 - "programData.ts"
Cohesion: 0.07
Nodes (25): LinkField(), commit(), KIND_ICONS, applyWorkoutLink(), isHttpUrl(), LinkParse, MEDIA_KIND_LABELS, MEDIA_KINDS (+17 more)

### Community 7 - "Nutrition Engine"
Cohesion: 0.07
Nodes (38): GOAL_LABEL, GOAL_TONE, kcal(), Macro(), NutritionCard(), pace(), ACTIVITY_FACTOR, currentLeanKg() (+30 more)

### Community 8 - "Shared Test Fixtures"
Cohesion: 0.14
Nodes (27): boundsFrom(), BodySettings, ffmiCategory(), heightUnit(), KG_PER_LB, M_PER_INCH, percentToFraction(), TargetSettings (+19 more)

### Community 9 - "RoundCompareSection.tsx"
Cohesion: 0.11
Nodes (16): BODY_KEYS, BODY_META, CompareCandidate, DAY_TICKS, RoundCompareSection(), bodySeriesByDay(), comparableWorkouts(), netSeriesByOccurrence() (+8 more)

### Community 10 - "Store & Persistence"
Cohesion: 0.12
Nodes (24): NotesPage(), CurrentRoundCard(), RoundsPage(), AppState, setNotes(), BackupEnvelope, createDebouncedSaver(), daysSinceExport() (+16 more)

### Community 11 - "BodyPage.tsx"
Cohesion: 0.09
Nodes (42): BodyPage(), Bounds, CHIP_TONE, chipTone(), EntryRow(), PercentField(), TEXT_TONE, ToneText() (+34 more)

### Community 12 - "Card"
Cohesion: 0.05
Nodes (82): react-router-dom, NoProgramCard(), Card(), Page(), AdherenceCard(), Stat(), DashboardPage(), NextUp() (+74 more)

### Community 13 - "Voice Entry"
Cohesion: 0.10
Nodes (22): pill(), SpeechRecognitionCtor, SpeechRecognitionLike, SpeechResultEvent, VoiceEntryButton(), assignVoiceValues(), COMMANDS, lookup() (+14 more)

### Community 14 - "workouts/index.ts"
Cohesion: 0.24
Nodes (8): cleanupSession(), upsertSession(), WorkoutLogs, writeRoundValue(), setCompletionStatus(), setExerciseDone(), setSessionAnnotation(), setWorkoutCompleted()

### Community 15 - "Charts"
Cohesion: 0.13
Nodes (20): axisDomain(), Band, ChartSeries, LineChart(), onMove(), pointerX(), LineChartProps, M (+12 more)

### Community 16 - "Schema & Units"
Cohesion: 0.08
Nodes (29): zod, archivedRoundSchema, bodyEntrySchema, customQuoteSchema, exerciseEntrySchema, ExerciseRound, exerciseRoundSchema, httpUrl (+21 more)

### Community 17 - "Quotes"
Cohesion: 0.13
Nodes (16): QuotesPage(), add(), activeQuotes(), addQuote(), BUILTIN_QUOTES, deleteQuote(), Quote, QuoteList (+8 more)

### Community 18 - "Program Data & Focus Steps"
Cohesion: 0.16
Nodes (13): fieldAria(), mainLabel(), SECONDARY_LABELS, RoundInputs(), previousValue(), CatalogExercise, WorkoutDef, allRounds() (+5 more)

### Community 19 - "Body-Fat Calculators"
Cohesion: 0.12
Nodes (16): BodyFatCalculatorsPage(), confirmSave(), Field(), Method, METHODS, mToUnit(), brozek(), LengthUnit (+8 more)

### Community 20 - "rounds.ts"
Cohesion: 0.28
Nodes (6): immer, applySnapshot(), buildArchivedRound(), defaultRoundLabel(), latestStartStats(), completeRound()

### Community 21 - "actions.test.ts"
Cohesion: 0.20
Nodes (4): ArchivedRoundCard(), deleteRound(), renameRound(), restoreRound()

### Community 22 - "App.tsx"
Cohesion: 0.07
Nodes (39): lucide-react, react-dom, @testing-library/react, App(), BodyFatCalculatorsPage, BodyPage, BodyTrendsPage, DataPage (+31 more)

### Community 23 - "roundReport.ts"
Cohesion: 0.16
Nodes (13): archivedRoundData(), BODY_KEYS, buildRoundReport(), liveRoundData(), RoundTopMover, pushUps(), WorkoutOutcome, computeAdherence() (+5 more)

### Community 24 - "Timeline Registry"
Cohesion: 0.10
Nodes (25): vitest, ALLOWED, Context, CONTEXTS, LIB, LIB_ROOT_EXCEPTIONS, libFiles, outsideFiles (+17 more)

### Community 25 - "Build Config & Deps"
Cohesion: 0.09
Nodes (21): name, private, type, version, jsdom, @lhci/cli, oxlint, prettier (+13 more)

### Community 26 - "Sync Config"
Cohesion: 0.14
Nodes (12): config(), enable(), Route, secrets, clearSyncConfig(), loadSyncConfig(), PausedReason, pausedReasonSchema (+4 more)

### Community 27 - "Strength Progress"
Cohesion: 0.13
Nodes (10): PALETTE, StrengthProgressPage(), initialIndex(), ScoreLine(), StrengthGrid(), formatShort(), loggableWorkoutsFor(), formatScore() (+2 more)

### Community 28 - "App TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+13 more)

### Community 29 - "Dev Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, fast-check, jsdom, @lhci/cli, oxlint, @playwright/test, prettier, repomix (+13 more)

### Community 30 - "Repomix Config"
Cohesion: 0.10
Nodes (20): sortByChanges, sortByChangesMaxCommits, ignore, customPatterns, useDefaultPatterns, useGitignore, include, output (+12 more)

### Community 31 - "Sync Crypto"
Cohesion: 0.27
Nodes (14): decryptJson(), deriveAuthToken(), deriveKey(), encryptJson(), EncryptOptions, fromBase64(), PBKDF2_ITERATIONS, randomBytes() (+6 more)

### Community 32 - "Data Import/Export"
Cohesion: 0.16
Nodes (16): DataPage(), doExport(), handleParsed(), loadSample(), onFile(), Pending, exportFilename(), ImportSummary (+8 more)

### Community 33 - "Sync Engine Flow"
Cohesion: 0.28
Nodes (19): onSubmit(), attachSync(), cancelPush(), fail(), forcePush(), isStale(), patchConfig(), pauseSync() (+11 more)

### Community 34 - "Sync API Client"
Cohesion: 0.18
Nodes (12): RemoteState, remoteStateSchema, ApiFailure, ApiResult, commonFailure(), deleteState(), describeFailure(), getMeta() (+4 more)

### Community 35 - "Node TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, erasableSyntaxOnly, lib, module, moduleDetection (+10 more)

### Community 36 - "shared/index.ts"
Cohesion: 0.15
Nodes (11): Content, IgnoredOp, ProgramDay, ScheduleDay, WeekSection, entriesFor(), schedule, Session (+3 more)

### Community 37 - "migrateToCurrent"
Cohesion: 0.22
Nodes (7): migrateToCurrent(), MigrationResult, MIGRATIONS, assertNoUnmappedKeys(), baseDoc(), appStateSchema, SCHEMA_VERSION

### Community 38 - "Sync State Wiring"
Cohesion: 0.10
Nodes (7): KDF_MAX_ITERATIONS, SALT_BYTES, ConflictChoice, EnableInput, EnableResult, keyFits(), PullOptions

### Community 39 - "ports.ts"
Cohesion: 0.21
Nodes (7): clock, Detach, PersistencePort, realClock, resetClock(), setClock(), SyncPort

### Community 40 - "schedule.ts"
Cohesion: 0.36
Nodes (3): beginProgram(), canStartProgram(), ProgramRef

### Community 41 - "Sync Page & Secrets"
Cohesion: 0.23
Nodes (13): EnableForm(), STATUS_LABEL, SyncPage(), TokenCard(), disableSync(), SyncStatus, useSyncStore, clearSecrets() (+5 more)

### Community 42 - "Sync Worker"
Cohesion: 0.25
Nodes (12): authorized(), corsHeaders(), fetch(), handleRequest(), json(), putState(), readMeta(), call() (+4 more)

### Community 43 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, format, format:check, lhci, lint (+6 more)

### Community 44 - "src_lib_shared_index_getworkout"
Cohesion: 0.24
Nodes (6): sampleAdherence(), sampleFixture(), sampleFixture(), sampleProgression(), candidates, localFile

### Community 45 - "selectors.ts"
Cohesion: 0.17
Nodes (10): BodySample, RoundReport, Adherence, isRestDay(), WeekBar, GapDay, Schedule, OpPreview (+2 more)

### Community 46 - "Sync Decisions"
Cohesion: 0.13
Nodes (16): base64, Cipher, cipherSchema, decideSync(), hasUserData(), MIN_PASSPHRASE_LENGTH, normalizeEndpoint(), RemoteMeta (+8 more)

### Community 50 - "Body Log Actions"
Cohesion: 0.35
Nodes (4): removeEntry(), upsertEntry(), BodyEntry, deleteBodyEntry()

### Community 51 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, immer, lucide-react, react, react-dom, react-router-dom, zod, zustand

### Community 53 - "Sync E2E Spec"
Cohesion: 0.47
Nodes (4): dismissToast(), enableSync(), FakeWorker, startProgram()

### Community 54 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 55 - "CI Workflow"
Cohesion: 0.40
Nodes (5): CI workflow, CI e2e job (Playwright on built app), CI lighthouse job (lhci, perf/a11y/best-practices >= 90), CI validate job (lint, format:check, typecheck, test:coverage, build), Update smoke snapshots (linux) workflow

### Community 58 - "Prettier Config"
Cohesion: 0.50
Nodes (3): printWidth, semi, singleQuote

### Community 59 - "Pages Deploy"
Cohesion: 0.67
Nodes (3): Deploy build job (uploads dist as pages artifact), Deploy job (actions/deploy-pages), Deploy to GitHub Pages workflow

## Knowledge Gaps
- **19 isolated node(s):** `@lhci/cli`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8` (+14 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 536 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Timeline Registry` to `ops.ts`, `Focus/Play UI`, `SettingsPage.tsx`, `Scoring, Overload, Progression`, `gen_sample.mjs`, `programData.ts`, `Nutrition Engine`, `Shared Test Fixtures`, `RoundCompareSection.tsx`, `Store & Persistence`, `BodyPage.tsx`, `Card`, `Voice Entry`, `workouts/index.ts`, `Charts`, `Schema & Units`, `Quotes`, `Body-Fat Calculators`, `rounds.ts`, `actions.test.ts`, `App.tsx`, `roundReport.ts`, `Build Config & Deps`, `Sync Config`, `Sync Crypto`, `Data Import/Export`, `shared/index.ts`, `migrateToCurrent`, `ports.ts`, `schedule.ts`, `Sync Worker`, `src_lib_shared_index_getworkout`, `Sync Decisions`, `playerSettings.ts`, `Body Log Actions`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `@lhci/cli`, `@types/node`, `@types/react` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ops.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Playwright E2E Specs` to `Build Config & Deps`, `focus-play.spec.ts`, `gennext.spec.ts`, `Sync E2E Spec`, `Voice E2E Spec`, `Play E2E Spec`, `Calculators E2E`, `Dashboard E2E`, `FFMI Feasibility E2E`, `FFMI Target E2E`, `Journeys E2E`, `Nutrition E2E`, `Overload E2E`, `Progress E2E`, `Quotes E2E`, `Reschedule E2E`, `Rounds E2E`, `Schedule E2E`, `Settings E2E`, `Trends E2E`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `Workbook Converter Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.05621621621621622 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Focus/Play UI` to `Data Import/Export`, `SettingsPage.tsx`, `programData.ts`, `Sync Page & Secrets`, `RoundCompareSection.tsx`, `BodyPage.tsx`, `Card`, `Voice Entry`, `selectors.ts`, `Charts`, `Quotes`, `Body-Fat Calculators`, `actions.test.ts`, `App.tsx`, `Build Config & Deps`, `Strength Progress`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Focus/Play UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09000584453535944 - nodes in this community are weakly interconnected._