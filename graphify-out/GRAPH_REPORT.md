# Graph Report - p90x-webapp  (2026-10-26)

## Corpus Check
- 245 files · ~153,038 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1566 nodes · 4836 edges · 85 communities (65 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3a99b40`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TodayPage.tsx
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
- RescheduleSection.tsx
- Voice Entry
- actions/sessions.ts
- Charts
- Schema & Units
- Quotes
- shared/index.ts
- Body-Fat Calculators
- feasibility.ts
- actions.test.ts
- App.tsx
- roundReport.ts
- vitest
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
- materialize.ts
- emptyState
- Sync State Wiring
- BodyPage.tsx
- architecture.test.ts
- Sync Page & Secrets
- Sync Worker
- npm Scripts
- progression.test.ts
- selectors.ts
- Sync Decisions
- @playwright/test
- Card
- Body Log Actions
- Runtime Dependencies
- Sync E2E Spec
- Oxlint Config
- CI Workflow
- Voice E2E Spec
- Prettier Config
- Pages Deploy
- Root TS Config
- FocusPage
- AppState
- schedule/index.ts
- rounds.ts
- compareISO
- ports.ts
- Dependabot
- CodeQL
- App Shell HTML
- WeeklyEditorPage.tsx
- entryUi.tsx
- selectors.ts
- StrengthProgressPage.tsx
- isISODate

## God Nodes (most connected - your core abstractions)
1. `Card()` - 78 edges
2. `vitest` - 56 edges
3. `SettingsPage()` - 54 edges
4. `useStore` - 53 edges
5. `Page()` - 49 edges
6. `getWorkout()` - 46 edges
7. `FocusPage()` - 41 edges
8. `todayISO()` - 39 edges
9. `formatLong()` - 37 edges
10. `useSettings()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `enable()` --indirect_call--> `fetch()`  [INFERRED]
  src/state/sync.test.ts → worker/index.js
- `settingsWith()` --calls--> `emptyState()`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/schema.ts
- `entriesFor()` --calls--> `getWorkout()`  [EXTRACTED]
  src/lib/schedule/status.test.ts → src/lib/shared/programData.ts
- `ex()` --calls--> `getWorkout()`  [EXTRACTED]
  src/lib/workouts/scoring.test.ts → src/lib/shared/programData.ts
- `App()` --calls--> `DashboardPage()`  [EXTRACTED]
  src/App.tsx → src/features/dashboard/DashboardPage.tsx

## Import Cycles
- None detected.

## Communities (85 total, 20 thin omitted)

### Community 0 - "TodayPage.tsx"
Cohesion: 0.21
Nodes (11): CELL_CLASSES, DAY_STATUS_LABELS, DAY_STATUS_TONES, SHORT_CODES, WORKOUT_STATE_LABELS, WORKOUT_STATE_TONES, BonusAddOns(), WorkoutCard() (+3 more)

### Community 1 - "Workbook Converter Tools"
Cohesion: 0.05
Nodes (38): convert(), main(), num(), read_settings(), length(), mass(), build_catalog(), build_templates() (+30 more)

### Community 2 - "Focus/Play UI"
Cohesion: 0.11
Nodes (10): react, useWakeLock(), PRESETS, TimerCard(), TimerPage(), beep(), BeepKind, mmss() (+2 more)

### Community 3 - "SettingsPage.tsx"
Cohesion: 0.05
Nodes (24): Derived(), NUTRITION_GOAL_LABEL, NUTRITION_GOAL_TONE, NUTRITION_PHASES, RECOMP_TONE, Row(), Segmented(), SettingsPage() (+16 more)

### Community 4 - "Scoring, Overload, Progression"
Cohesion: 0.11
Nodes (20): pushUps(), round(), workoutOccurrences(), ArchivedRound, ExerciseEntry, ScoringSettings, archiveLatestNets(), overloadTarget (+12 more)

### Community 5 - "gen_sample.mjs"
Cohesion: 0.12
Nodes (14): arxDays, bodyLog, cardioPlan, catalog, entriesFor(), out, push(), root (+6 more)

### Community 6 - "programData.ts"
Cohesion: 0.06
Nodes (33): LinkField(), commit(), KIND_ICONS, GENNEXT_GROUPS, Group, P90X_GROUPS, WorkoutsPage(), applyWorkoutLink() (+25 more)

### Community 7 - "Nutrition Engine"
Cohesion: 0.08
Nodes (37): GOAL_LABEL, GOAL_TONE, kcal(), Macro(), NutritionCard(), pace(), KG_PER_LB, ACTIVITY_FACTOR (+29 more)

### Community 8 - "Shared Test Fixtures"
Cohesion: 0.15
Nodes (20): sample, entry(), FfmiPlan, leanMassForFfmi(), normalizedFfmi(), planFromFfmi(), weightForLeanMass(), settingsWarnings() (+12 more)

### Community 9 - "RoundCompareSection.tsx"
Cohesion: 0.15
Nodes (13): BODY_KEYS, BODY_META, DAY_TICKS, RoundCompareSection(), bodySeriesByDay(), comparableWorkouts(), netSeriesByOccurrence(), BodyOutcome (+5 more)

### Community 10 - "Store & Persistence"
Cohesion: 0.18
Nodes (18): migrateToCurrent(), createDebouncedSaver(), daysSinceExport(), LoadIssue, loadState(), markExported(), readBackup(), saveState() (+10 more)

### Community 11 - "BodyPage.tsx"
Cohesion: 0.11
Nodes (20): BodyMetric, expectedProgressPct(), MetricKey, progressToTarget(), TONE_CHIP, currentPhaseWindow(), phaseBands(), KpiCards() (+12 more)

### Community 12 - "RescheduleSection.tsx"
Cohesion: 0.13
Nodes (14): HistoryPage(), contentLabel(), Mode, RescheduleSection(), ScheduleDay, describeOp(), newSkipOp(), newSwapOp() (+6 more)

### Community 13 - "Voice Entry"
Cohesion: 0.09
Nodes (24): pill(), SpeechRecognitionCtor, SpeechRecognitionLike, SpeechResultEvent, VoiceEntryButton(), CatalogExercise, FocusStep, assignVoiceValues() (+16 more)

### Community 14 - "actions/sessions.ts"
Cohesion: 0.25
Nodes (6): cleanupSession(), upsertSession(), WorkoutLogs, writeRoundValue(), setExerciseDone(), setSessionAnnotation()

### Community 15 - "Charts"
Cohesion: 0.12
Nodes (20): axisDomain(), Band, ChartSeries, LineChart(), onMove(), pointerX(), LineChartProps, M (+12 more)

### Community 16 - "Schema & Units"
Cohesion: 0.08
Nodes (28): archivedRoundSchema, bodyEntrySchema, customQuoteSchema, exerciseEntrySchema, ExerciseRound, exerciseRoundSchema, httpUrl, isoDate (+20 more)

### Community 17 - "Quotes"
Cohesion: 0.13
Nodes (16): QuotesPage(), add(), activeQuotes(), addQuote(), BUILTIN_QUOTES, deleteQuote(), Quote, QuoteList (+8 more)

### Community 18 - "shared/index.ts"
Cohesion: 0.16
Nodes (10): previousValue(), entriesFor(), schedule, WorkoutDef, Session, allRounds(), focusSteps(), resumeIndex() (+2 more)

### Community 19 - "Body-Fat Calculators"
Cohesion: 0.13
Nodes (16): BodyFatCalculatorsPage(), confirmSave(), Field(), Method, METHODS, mToUnit(), brozek(), LengthUnit (+8 more)

### Community 20 - "feasibility.ts"
Cohesion: 0.18
Nodes (16): ARAGON_PCT, assessFatLoss(), assessLeanGain(), Band, bandVerdict(), ceilingStatus(), Experience, FAT_LOSS_BAND (+8 more)

### Community 21 - "actions.test.ts"
Cohesion: 0.11
Nodes (7): NotesPage(), ArchivedRoundCard(), CurrentRoundCard(), RoundsPage(), deleteRound(), renameRound(), setNotes()

### Community 22 - "App.tsx"
Cohesion: 0.07
Nodes (38): lucide-react, react-dom, @testing-library/react, App(), BodyFatCalculatorsPage, BodyPage, BodyTrendsPage, DataPage (+30 more)

### Community 23 - "roundReport.ts"
Cohesion: 0.15
Nodes (14): CompareCandidate, archivedRoundData(), BODY_KEYS, buildRoundReport(), liveRoundData(), RoundData, RoundTopMover, pushUps() (+6 more)

### Community 24 - "vitest"
Cohesion: 0.06
Nodes (57): vitest, cardioX, FLEX_FLOOR, FLEX_STANDING, gnActiveFlexibility, gnActiveMobility, gnMyofascialRelease, MOBILITY_FLOW (+49 more)

### Community 25 - "Build Config & Deps"
Cohesion: 0.09
Nodes (21): name, private, type, version, jsdom, @lhci/cli, oxlint, prettier (+13 more)

### Community 26 - "Sync Config"
Cohesion: 0.10
Nodes (16): zod, SyncEnvelope, SyncStoreState, config(), enable(), Route, secrets, clearSyncConfig() (+8 more)

### Community 27 - "Strength Progress"
Cohesion: 0.15
Nodes (12): CompletionLog(), initialIndex(), ScoreLine(), StrengthGrid(), STYLE_LABELS, WorkoutDetailPage(), hasWorkoutIn(), formatScore() (+4 more)

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
Cohesion: 0.19
Nodes (12): DataPage(), doExport(), handleParsed(), loadSample(), onFile(), Pending, exportFilename(), ImportSummary (+4 more)

### Community 33 - "Sync Engine Flow"
Cohesion: 0.28
Nodes (19): onSubmit(), attachSync(), cancelPush(), fail(), forcePush(), isStale(), patchConfig(), pauseSync() (+11 more)

### Community 34 - "Sync API Client"
Cohesion: 0.24
Nodes (10): ApiFailure, ApiResult, commonFailure(), deleteState(), describeFailure(), getMeta(), getState(), putState() (+2 more)

### Community 35 - "Node TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, erasableSyntaxOnly, lib, module, moduleDetection (+10 more)

### Community 36 - "materialize.ts"
Cohesion: 0.16
Nodes (12): fast-check, Content, groupByWeek(), IgnoredOp, ProgramDay, slotId(), WeekSection, mkBase() (+4 more)

### Community 37 - "emptyState"
Cohesion: 0.21
Nodes (6): sampleState(), assertNoUnmappedKeys(), baseDoc(), emptyState(), applyPlayerPatch(), applyTimerPatch()

### Community 38 - "Sync State Wiring"
Cohesion: 0.10
Nodes (7): KDF_MAX_ITERATIONS, SALT_BYTES, ConflictChoice, EnableInput, EnableResult, keyFits(), PullOptions

### Community 39 - "BodyPage.tsx"
Cohesion: 0.14
Nodes (32): BodyPage(), Bounds, boundsFrom(), CHIP_TONE, chipTone(), EntryRow(), PercentField(), TEXT_TONE (+24 more)

### Community 40 - "architecture.test.ts"
Cohesion: 0.13
Nodes (11): ALLOWED, Context, CONTEXTS, LIB, LIB_ROOT_EXCEPTIONS, libFiles, outsideFiles, specCache (+3 more)

### Community 41 - "Sync Page & Secrets"
Cohesion: 0.20
Nodes (14): EnableForm(), STATUS_LABEL, SyncPage(), TokenCard(), MIN_PASSPHRASE_LENGTH, disableSync(), SyncStatus, useSyncStore (+6 more)

### Community 42 - "Sync Worker"
Cohesion: 0.25
Nodes (12): authorized(), corsHeaders(), fetch(), handleRequest(), json(), putState(), readMeta(), call() (+4 more)

### Community 43 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, format, format:check, lhci, lint (+6 more)

### Community 44 - "progression.test.ts"
Cohesion: 0.27
Nodes (5): sampleFixture(), sampleProgression(), workoutProgression(), candidates, localFile

### Community 45 - "selectors.ts"
Cohesion: 0.23
Nodes (16): AdherenceCard(), Stat(), dayNumberAt(), ProgramStatusBar(), DayCell(), LEGEND, SchedulePage(), Week() (+8 more)

### Community 46 - "Sync Decisions"
Cohesion: 0.16
Nodes (14): base64, Cipher, cipherSchema, decideSync(), hasUserData(), normalizeEndpoint(), RemoteMeta, remoteMetaSchema (+6 more)

### Community 48 - "Card"
Cohesion: 0.19
Nodes (13): react-router-dom, Card(), Page(), DashboardPage(), NextUp(), RoundCompleteCard(), QuoteCard(), ABBREVIATIONS (+5 more)

### Community 50 - "Body Log Actions"
Cohesion: 0.33
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

### Community 61 - "FocusPage"
Cohesion: 0.19
Nodes (21): FocusPage(), Sparkline(), MediaLinks(), PlayPage(), extendPlayback(), pausePlayback(), PlaybackEvent, PlaybackOpts (+13 more)

### Community 66 - "AppState"
Cohesion: 0.21
Nodes (8): MigrationResult, MIGRATIONS, AppState, appStateSchema, SCHEMA_VERSION, BackupEnvelope, DebouncedSaver, LoadResult

### Community 68 - "schedule/index.ts"
Cohesion: 0.20
Nodes (9): day1Of(), StartPage(), submit(), VARIANTS, beginProgram(), canStartProgram(), getTemplate(), ProgramRef (+1 more)

### Community 69 - "rounds.ts"
Cohesion: 0.24
Nodes (7): immer, applySnapshot(), buildArchivedRound(), defaultRoundLabel(), latestStartStats(), completeRound(), restoreRound()

### Community 70 - "compareISO"
Cohesion: 0.37
Nodes (9): adherenceTrend(), computeAdherence(), isRestDay(), sampleAdherence(), sampleFixture(), WeekBar, dayStatus, SessionIndex (+1 more)

### Community 71 - "ports.ts"
Cohesion: 0.21
Nodes (7): clock, Detach, PersistencePort, realClock, resetClock(), setClock(), SyncPort

### Community 80 - "WeeklyEditorPage.tsx"
Cohesion: 0.29
Nodes (8): NoProgramCard(), IDENTITY, OrderList(), slotNames(), WeeklyEditorPage(), newRemapOp(), remapBaseWeek(), addScheduleOp()

### Community 81 - "entryUi.tsx"
Cohesion: 0.31
Nodes (5): fieldAria(), mainLabel(), SECONDARY_LABELS, RoundInputs(), setRoundValue()

### Community 82 - "selectors.ts"
Cohesion: 0.24
Nodes (7): BodySample, RoundReport, Adherence, GapDay, Schedule, OpPreview, ISODate

### Community 84 - "isISODate"
Cohesion: 0.54
Nodes (6): addDays(), fromISO(), isISODate(), longFmt, shortFmt, toISO()

## Knowledge Gaps
- **19 isolated node(s):** `@lhci/cli`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8` (+14 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 563 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Scoring, Overload, Progression`, `gen_sample.mjs`, `programData.ts`, `Nutrition Engine`, `Shared Test Fixtures`, `Store & Persistence`, `Voice Entry`, `actions/sessions.ts`, `Charts`, `Schema & Units`, `Quotes`, `shared/index.ts`, `Body-Fat Calculators`, `feasibility.ts`, `actions.test.ts`, `App.tsx`, `roundReport.ts`, `Build Config & Deps`, `Sync Config`, `Sync Crypto`, `Data Import/Export`, `materialize.ts`, `emptyState`, `BodyPage.tsx`, `architecture.test.ts`, `Sync Worker`, `progression.test.ts`, `Sync Decisions`, `Card`, `Body Log Actions`, `FocusPage`, `AppState`, `schedule/index.ts`, `compareISO`, `ports.ts`, `isISODate`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `@lhci/cli`, `@types/node`, `@types/react` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Workbook Converter Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.053946053946053944 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `FFMI Target E2E`, `Journeys E2E`, `Nutrition E2E`, `Rounds E2E`, `Schedule E2E`, `Settings E2E`, `Trends E2E`, `focus-play.spec.ts`, `gennext.spec.ts`, `Sync E2E Spec`, `Build Config & Deps`, `Voice E2E Spec`, `Play E2E Spec`, `Dashboard E2E`, `FFMI Feasibility E2E`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Focus/Play UI` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Focus/Play UI` to `SettingsPage.tsx`, `programData.ts`, `RoundCompareSection.tsx`, `BodyPage.tsx`, `RescheduleSection.tsx`, `Voice Entry`, `Charts`, `Quotes`, `Body-Fat Calculators`, `actions.test.ts`, `App.tsx`, `Build Config & Deps`, `Strength Progress`, `Data Import/Export`, `BodyPage.tsx`, `Sync Page & Secrets`, `selectors.ts`, `Card`, `schedule/index.ts`, `WeeklyEditorPage.tsx`, `selectors.ts`, `StrengthProgressPage.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `SettingsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05185185185185185 - nodes in this community are weakly interconnected._