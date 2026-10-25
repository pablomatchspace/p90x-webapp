# Graph Report - p90x-webapp  (2026-10-25)

## Corpus Check
- 241 files · ~140,016 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1485 nodes · 4655 edges · 80 communities (57 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Schedule & Round Report
- Workbook Converter Tools
- Focus/Play UI
- Settings & Nutrition UI
- Scoring, Overload, Progression
- Arch & Migration Tests
- Settings & Media Links
- Nutrition Engine
- Shared Test Fixtures
- Round Report & Compare UI
- Store & Persistence
- Body Trends & Quick Add
- Today & Schedule Pages
- Voice Entry
- Session Actions
- Charts
- Schema & Units
- Quotes
- Program Data & Focus Steps
- Body-Fat Calculators
- Rounds Archive & Ports
- Dashboard & Page Shell
- App Routing
- Body Derivation & Settings
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
- Reschedule & History
- FFMI Feasibility
- Sync State Wiring
- Entry & Error Boundary
- Body Log Page
- Sync Page & Secrets
- Sync Worker
- npm Scripts
- Start & Workout Detail
- Selectors & Workouts List
- Sync Decisions
- Playwright E2E Specs
- Layout & Banners
- Misc Pages & Actions
- Body Log Actions
- Runtime Dependencies
- Weekly Editor
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
1. `Card()` - 77 edges
2. `SettingsPage()` - 57 edges
3. `vitest` - 55 edges
4. `useStore` - 53 edges
5. `Page()` - 49 edges
6. `getWorkout()` - 47 edges
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
- `Progression` --references--> `ProgramDay`  [EXTRACTED]
  src/lib/workouts/progression.ts → src/lib/schedule/materialize.ts

## Import Cycles
- None detected.

## Communities (80 total, 23 thin omitted)

### Community 0 - "Schedule & Round Report"
Cohesion: 0.05
Nodes (63): fast-check, submit(), comparableWorkouts(), netSeriesByOccurrence(), BODY_KEYS, BodyOutcome, BodyOutcomeKey, BodySample (+55 more)

### Community 1 - "Workbook Converter Tools"
Cohesion: 0.06
Nodes (31): convert(), main(), num(), read_settings(), length(), mass(), build_catalog(), build_templates() (+23 more)

### Community 2 - "Focus/Play UI"
Cohesion: 0.09
Nodes (32): FocusPage(), Sparkline(), KIND_ICONS, MediaLinks(), useWakeLock(), PlayPage(), PRESETS, TimerCard() (+24 more)

### Community 3 - "Settings & Nutrition UI"
Cohesion: 0.05
Nodes (17): Derived(), NUTRITION_GOAL_LABEL, NUTRITION_GOAL_TONE, NUTRITION_PHASES, RECOMP_TONE, Row(), Segmented(), VERDICT_TONE (+9 more)

### Community 4 - "Scoring, Overload, Progression"
Cohesion: 0.10
Nodes (24): workoutOccurrences(), ArchivedRound, ExerciseRound, ScoringSettings, Session, formatAppVersion(), cb, archiveLatestNets() (+16 more)

### Community 5 - "Arch & Migration Tests"
Cohesion: 0.05
Nodes (29): ALLOWED, Context, CONTEXTS, LIB, LIB_ROOT_EXCEPTIONS, libFiles, outsideFiles, specCache (+21 more)

### Community 6 - "Settings & Media Links"
Cohesion: 0.08
Nodes (21): LinkField(), commit(), applyNutritionPatch(), applyWorkoutLink(), isHttpUrl(), LinkParse, MEDIA_KIND_LABELS, MEDIA_KINDS (+13 more)

### Community 7 - "Nutrition Engine"
Cohesion: 0.10
Nodes (31): KG_PER_LB, ACTIVITY_FACTOR, currentLeanKg(), currentWeightKg(), DietStyle, energyAmount(), FAT_FLOOR_G_PER_KG, FAT_G_PER_KG (+23 more)

### Community 8 - "Shared Test Fixtures"
Cohesion: 0.17
Nodes (21): vitest, sample, entry(), FfmiPlan, leanMassForFfmi(), planFromFfmi(), weightForLeanMass(), sample (+13 more)

### Community 9 - "Round Report & Compare UI"
Cohesion: 0.09
Nodes (21): GainModelBar(), BODY_KEYS, BODY_META, CompareCandidate, DAY_TICKS, RoundCompareSection(), toDisplaySeries(), AdherenceOutcomeCard() (+13 more)

### Community 10 - "Store & Persistence"
Cohesion: 0.12
Nodes (25): migrateToCurrent(), MigrationResult, MIGRATIONS, AppState, appStateSchema, SCHEMA_VERSION, BackupEnvelope, createDebouncedSaver() (+17 more)

### Community 11 - "Body Trends & Quick Add"
Cohesion: 0.15
Nodes (18): BodyQuickAdd(), BodyMetric, buildBodyMetrics(), expectedProgressPct(), MetricKey, progressToTarget(), TONE_CHIP, BodyTrendsPage() (+10 more)

### Community 12 - "Today & Schedule Pages"
Cohesion: 0.16
Nodes (20): NoProgramCard(), dayNumberAt(), ProgramStatusBar(), DayCell(), LEGEND, SchedulePage(), Week(), CELL_CLASSES (+12 more)

### Community 13 - "Voice Entry"
Cohesion: 0.10
Nodes (22): pill(), SpeechRecognitionCtor, SpeechRecognitionLike, SpeechResultEvent, VoiceEntryButton(), assignVoiceValues(), COMMANDS, lookup() (+14 more)

### Community 14 - "Session Actions"
Cohesion: 0.10
Nodes (9): cleanupSession(), upsertSession(), WorkoutLogs, writeRoundValue(), setCompletionStatus(), setExerciseDone(), setSessionAnnotation(), setSessionNotes() (+1 more)

### Community 15 - "Charts"
Cohesion: 0.13
Nodes (20): axisDomain(), Band, ChartSeries, LineChart(), onMove(), pointerX(), LineChartProps, M (+12 more)

### Community 16 - "Schema & Units"
Cohesion: 0.08
Nodes (27): archivedRoundSchema, bodyEntrySchema, customQuoteSchema, exerciseEntrySchema, exerciseRoundSchema, httpUrl, isoDate, nullableFraction (+19 more)

### Community 17 - "Quotes"
Cohesion: 0.13
Nodes (16): QuotesPage(), add(), activeQuotes(), addQuote(), BUILTIN_QUOTES, deleteQuote(), Quote, QuoteList (+8 more)

### Community 18 - "Program Data & Focus Steps"
Cohesion: 0.11
Nodes (19): fieldAria(), mainLabel(), SECONDARY_LABELS, RoundInputs(), previousValue(), byKey, catalog, CatalogExercise (+11 more)

### Community 19 - "Body-Fat Calculators"
Cohesion: 0.12
Nodes (17): BodyFatCalculatorsPage(), confirmSave(), Field(), Method, METHODS, applyProgram(), switchProgram(), brozek() (+9 more)

### Community 20 - "Rounds Archive & Ports"
Cohesion: 0.11
Nodes (14): immer, applySnapshot(), buildArchivedRound(), defaultRoundLabel(), latestStartStats(), completeRound(), restoreRound(), clock (+6 more)

### Community 21 - "Dashboard & Page Shell"
Cohesion: 0.21
Nodes (18): react, react-router-dom, Card(), AdherenceCard(), Stat(), DashboardPage(), NextUp(), RoundCompleteCard() (+10 more)

### Community 22 - "App Routing"
Cohesion: 0.16
Nodes (24): App(), BodyFatCalculatorsPage, BodyPage, BodyTrendsPage, DataPage, FocusPage, HelpPage, HistoryPage (+16 more)

### Community 23 - "Body Derivation & Settings"
Cohesion: 0.17
Nodes (21): SettingsPage(), applyFfmiTargets(), applyPending(), onDateInput(), BodySettings, deriveBody(), ffmiCategory(), heightUnit() (+13 more)

### Community 24 - "Timeline Registry"
Cohesion: 0.24
Nodes (12): cardioX, getTimeline(), hasTimeline(), TIMELINES, timelinesFor(), kenpoX, plyometrics, PlaySegment (+4 more)

### Community 25 - "Build Config & Deps"
Cohesion: 0.09
Nodes (21): name, private, type, version, jsdom, @lhci/cli, oxlint, prettier (+13 more)

### Community 26 - "Sync Config"
Cohesion: 0.12
Nodes (14): zod, SyncStoreState, config(), enable(), Route, secrets, clearSyncConfig(), loadSyncConfig() (+6 more)

### Community 27 - "Strength Progress"
Cohesion: 0.13
Nodes (10): LOGGABLE, PALETTE, StrengthProgressPage(), initialIndex(), ScoreLine(), StrengthGrid(), formatShort(), ExerciseScore (+2 more)

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
Cohesion: 0.20
Nodes (17): Cipher, decryptJson(), deriveAuthToken(), deriveKey(), encryptJson(), EncryptOptions, fromBase64(), KDF_MAX_ITERATIONS (+9 more)

### Community 32 - "Data Import/Export"
Cohesion: 0.19
Nodes (12): DataPage(), doExport(), handleParsed(), loadSample(), onFile(), Pending, exportFilename(), ImportSummary (+4 more)

### Community 33 - "Sync Engine Flow"
Cohesion: 0.28
Nodes (19): onSubmit(), attachSync(), cancelPush(), fail(), forcePush(), isStale(), patchConfig(), pauseSync() (+11 more)

### Community 34 - "Sync API Client"
Cohesion: 0.17
Nodes (13): RemoteState, remoteStateSchema, SyncEnvelope, ApiFailure, ApiResult, commonFailure(), deleteState(), describeFailure() (+5 more)

### Community 35 - "Node TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, erasableSyntaxOnly, lib, module, moduleDetection (+10 more)

### Community 36 - "Reschedule & History"
Cohesion: 0.16
Nodes (9): HistoryPage(), contentLabel(), Mode, RescheduleSection(), ScheduleDay, describeOp(), opEffect(), revertScheduleOp() (+1 more)

### Community 37 - "FFMI Feasibility"
Cohesion: 0.18
Nodes (16): ARAGON_PCT, assessFatLoss(), assessLeanGain(), Band, bandVerdict(), ceilingStatus(), Experience, FAT_LOSS_BAND (+8 more)

### Community 38 - "Sync State Wiring"
Cohesion: 0.11
Nodes (5): ConflictChoice, EnableInput, EnableResult, keyFits(), PullOptions

### Community 39 - "Entry & Error Boundary"
Cohesion: 0.15
Nodes (7): react-dom, @testing-library/react, ErrorBoundary, Props, State, persistencePort, syncPort

### Community 40 - "Body Log Page"
Cohesion: 0.25
Nodes (13): BodyPage(), Bounds, boundsFrom(), CHIP_TONE, chipTone(), EntryRow(), PercentField(), TEXT_TONE (+5 more)

### Community 41 - "Sync Page & Secrets"
Cohesion: 0.23
Nodes (13): EnableForm(), STATUS_LABEL, SyncPage(), TokenCard(), MIN_PASSPHRASE_LENGTH, disableSync(), SyncStatus, clearSecrets() (+5 more)

### Community 42 - "Sync Worker"
Cohesion: 0.23
Nodes (13): authorized(), corsHeaders(), fetch(), handleRequest(), json(), putState(), readMeta(), call() (+5 more)

### Community 43 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, format, format:check, lhci, lint (+6 more)

### Community 44 - "Start & Workout Detail"
Cohesion: 0.22
Nodes (10): day1Of(), StartPage(), VARIANTS, WorkoutCard(), CompletionButtons(), CompletionLog(), STYLE_LABELS, WorkoutDetailPage() (+2 more)

### Community 45 - "Selectors & Workouts List"
Cohesion: 0.19
Nodes (3): GROUPS, WorkoutsPage(), useWorkoutLogs()

### Community 46 - "Sync Decisions"
Cohesion: 0.21
Nodes (11): base64, cipherSchema, decideSync(), hasUserData(), normalizeEndpoint(), RemoteMeta, remoteMetaSchema, SYNC_WIRE_VERSION (+3 more)

### Community 48 - "Layout & Banners"
Cohesion: 0.30
Nodes (8): lucide-react, Layout(), navClasses(), PageFallback(), tabs, SystemBanners(), UpdateToast(), useSyncStore

### Community 49 - "Misc Pages & Actions"
Cohesion: 0.23
Nodes (7): Page(), ABBREVIATIONS, HelpPage(), VOICE_PHRASES, NotesPage(), TimerPage(), setNotes()

### Community 50 - "Body Log Actions"
Cohesion: 0.31
Nodes (4): removeEntry(), upsertEntry(), deleteBodyEntry(), upsertBodyEntry()

### Community 51 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, immer, lucide-react, react, react-dom, react-router-dom, zod, zustand

### Community 52 - "Weekly Editor"
Cohesion: 0.32
Nodes (4): IDENTITY, OrderList(), slotNames(), addScheduleOp()

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
  These have ≤1 connection - possible missing edges. (Counts symbols only; 521 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Shared Test Fixtures` to `Schedule & Round Report`, `Focus/Play UI`, `Scoring, Overload, Progression`, `Arch & Migration Tests`, `Settings & Media Links`, `Nutrition Engine`, `Store & Persistence`, `Voice Entry`, `Session Actions`, `Charts`, `Schema & Units`, `Quotes`, `Body-Fat Calculators`, `Rounds Archive & Ports`, `Body Derivation & Settings`, `Timeline Registry`, `Build Config & Deps`, `Sync Config`, `Sync Crypto`, `Data Import/Export`, `FFMI Feasibility`, `Entry & Error Boundary`, `Sync Worker`, `Sync Decisions`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `@lhci/cli`, `@types/node`, `@types/react` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schedule & Round Report` be split into smaller, more focused modules?**
  _Cohesion score 0.050915211445402904 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Playwright E2E Specs` to `Build Config & Deps`, `Sync E2E Spec`, `Voice E2E Spec`, `Play E2E Spec`, `Calculators E2E`, `Dashboard E2E`, `FFMI Feasibility E2E`, `FFMI Target E2E`, `Journeys E2E`, `Lean E2E`, `Nutrition E2E`, `Overload E2E`, `Progress E2E`, `Quotes E2E`, `Reschedule E2E`, `Rounds E2E`, `Schedule E2E`, `Settings E2E`, `Trends E2E`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Workbook Converter Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.06286748077792854 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Dashboard & Page Shell` to `Focus/Play UI`, `Settings & Nutrition UI`, `Settings & Media Links`, `Round Report & Compare UI`, `Body Trends & Quick Add`, `Today & Schedule Pages`, `Voice Entry`, `Charts`, `Quotes`, `Body-Fat Calculators`, `App Routing`, `Build Config & Deps`, `Strength Progress`, `Data Import/Export`, `Reschedule & History`, `Entry & Error Boundary`, `Body Log Page`, `Sync Page & Secrets`, `Start & Workout Detail`, `Selectors & Workouts List`, `Layout & Banners`, `Weekly Editor`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Focus/Play UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08700564971751412 - nodes in this community are weakly interconnected._