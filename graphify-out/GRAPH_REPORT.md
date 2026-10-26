# Graph Report - p90x-webapp  (2026-10-26)

## Corpus Check
- 245 files · ~150,008 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1563 nodes · 4828 edges · 76 communities (56 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da412460`
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
- rounds.ts
- Charts
- Schema & Units
- Quotes
- src_lib_shared_index_getworkout
- Body-Fat Calculators
- feasibility.ts
- Card
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
- shared/index.ts
- migrateToCurrent
- Sync State Wiring
- WorkoutLinksCard.tsx
- architecture.test.ts
- Sync Page & Secrets
- Sync Worker
- npm Scripts
- compareISO
- selectors.ts
- Sync Decisions
- @playwright/test
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
- status.test.ts
- AppState
- Dependabot
- CodeQL
- App Shell HTML

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
- `lb()` --calls--> `kg`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/units.ts
- `settingsWith()` --calls--> `emptyState()`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/schema.ts
- `entry()` --calls--> `kg`  [EXTRACTED]
  src/lib/nutrition/nutrition.test.ts → src/lib/shared/units.ts
- `BodySample` --references--> `ISODate`  [EXTRACTED]
  src/lib/rounds/roundReport.ts → src/lib/shared/dates.ts

## Import Cycles
- None detected.

## Communities (76 total, 20 thin omitted)

### Community 0 - "TodayPage.tsx"
Cohesion: 0.16
Nodes (13): DayCell(), LEGEND, Week(), CELL_CLASSES, DAY_STATUS_LABELS, DAY_STATUS_TONES, SHORT_CODES, shortCode() (+5 more)

### Community 1 - "Workbook Converter Tools"
Cohesion: 0.06
Nodes (36): convert(), main(), num(), read_settings(), length(), mass(), build_catalog(), build_templates() (+28 more)

### Community 2 - "Focus/Play UI"
Cohesion: 0.09
Nodes (30): FocusPage(), Sparkline(), MediaLinks(), useWakeLock(), PlayPage(), PRESETS, TimerCard(), beep() (+22 more)

### Community 3 - "SettingsPage.tsx"
Cohesion: 0.04
Nodes (23): Derived(), NUTRITION_GOAL_LABEL, NUTRITION_GOAL_TONE, NUTRITION_PHASES, RECOMP_TONE, Row(), Segmented(), SettingsPage() (+15 more)

### Community 4 - "Scoring, Overload, Progression"
Cohesion: 0.12
Nodes (22): workoutOccurrences(), ArchivedRound, ExerciseEntry, ScoringSettings, Session, archiveLatestNets(), overloadTarget, targetStatus (+14 more)

### Community 5 - "gen_sample.mjs"
Cohesion: 0.12
Nodes (14): arxDays, bodyLog, cardioPlan, catalog, entriesFor(), out, push(), root (+6 more)

### Community 6 - "programData.ts"
Cohesion: 0.09
Nodes (24): LinkField(), commit(), applyWorkoutLink(), isHttpUrl(), LinkParse, MEDIA_KIND_LABELS, MediaKind, parseLinkInput() (+16 more)

### Community 7 - "Nutrition Engine"
Cohesion: 0.07
Nodes (37): GOAL_LABEL, GOAL_TONE, kcal(), Macro(), NutritionCard(), pace(), KG_PER_LB, ACTIVITY_FACTOR (+29 more)

### Community 8 - "Shared Test Fixtures"
Cohesion: 0.13
Nodes (30): BodyMetric, sample, BodyDerived, BodySettings, deriveBody(), ffmiCategory(), heightUnit(), M_PER_INCH (+22 more)

### Community 9 - "RoundCompareSection.tsx"
Cohesion: 0.14
Nodes (15): BODY_KEYS, BODY_META, CompareCandidate, DAY_TICKS, RoundCompareSection(), bodySeriesByDay(), comparableWorkouts(), netSeriesByOccurrence() (+7 more)

### Community 10 - "Store & Persistence"
Cohesion: 0.17
Nodes (18): sampleState(), emptyState(), createDebouncedSaver(), daysSinceExport(), LoadIssue, loadState(), markExported(), readBackup() (+10 more)

### Community 11 - "BodyPage.tsx"
Cohesion: 0.10
Nodes (37): BodyPage(), Bounds, boundsFrom(), CHIP_TONE, chipTone(), EntryRow(), PercentField(), TEXT_TONE (+29 more)

### Community 12 - "RescheduleSection.tsx"
Cohesion: 0.06
Nodes (36): fast-check, HistoryPage(), contentLabel(), Mode, RescheduleSection(), submit(), ScheduleDay, describeOp() (+28 more)

### Community 13 - "Voice Entry"
Cohesion: 0.07
Nodes (29): fieldAria(), mainLabel(), SECONDARY_LABELS, RoundInputs(), pill(), SpeechRecognitionCtor, SpeechRecognitionLike, SpeechResultEvent (+21 more)

### Community 14 - "rounds.ts"
Cohesion: 0.08
Nodes (21): immer, applySnapshot(), buildArchivedRound(), defaultRoundLabel(), latestStartStats(), cleanupSession(), upsertSession(), WorkoutLogs (+13 more)

### Community 15 - "Charts"
Cohesion: 0.12
Nodes (20): axisDomain(), Band, ChartSeries, LineChart(), onMove(), pointerX(), LineChartProps, M (+12 more)

### Community 16 - "Schema & Units"
Cohesion: 0.09
Nodes (25): zod, archivedRoundSchema, bodyEntrySchema, customQuoteSchema, exerciseEntrySchema, ExerciseRound, exerciseRoundSchema, httpUrl (+17 more)

### Community 17 - "Quotes"
Cohesion: 0.13
Nodes (16): QuotesPage(), add(), activeQuotes(), addQuote(), BUILTIN_QUOTES, deleteQuote(), Quote, QuoteList (+8 more)

### Community 18 - "src_lib_shared_index_getworkout"
Cohesion: 0.29
Nodes (7): CatalogExercise, allRounds(), FocusStep, focusSteps(), resumeIndex(), ROUND_2_ORDER, cb

### Community 19 - "Body-Fat Calculators"
Cohesion: 0.13
Nodes (15): BodyFatCalculatorsPage(), confirmSave(), Field(), Method, METHODS, mToUnit(), brozek(), LengthUnit (+7 more)

### Community 20 - "feasibility.ts"
Cohesion: 0.16
Nodes (17): Sex, ARAGON_PCT, assessFatLoss(), assessLeanGain(), Band, bandVerdict(), ceilingStatus(), Experience (+9 more)

### Community 21 - "Card"
Cohesion: 0.13
Nodes (29): react, react-router-dom, NoProgramCard(), Card(), Page(), HelpPage(), items, MorePage() (+21 more)

### Community 22 - "App.tsx"
Cohesion: 0.06
Nodes (41): lucide-react, react-dom, @testing-library/react, App(), BodyFatCalculatorsPage, BodyPage, BodyTrendsPage, DataPage (+33 more)

### Community 23 - "roundReport.ts"
Cohesion: 0.13
Nodes (9): archivedRoundData(), BODY_KEYS, BodySample, liveRoundData(), RoundTopMover, pushUps(), WorkoutOutcome, WorkoutStyle (+1 more)

### Community 24 - "vitest"
Cohesion: 0.06
Nodes (57): vitest, cardioX, FLEX_FLOOR, FLEX_STANDING, gnActiveFlexibility, gnActiveMobility, gnMyofascialRelease, MOBILITY_FLOW (+49 more)

### Community 25 - "Build Config & Deps"
Cohesion: 0.09
Nodes (21): name, private, type, version, jsdom, @lhci/cli, oxlint, prettier (+13 more)

### Community 26 - "Sync Config"
Cohesion: 0.12
Nodes (14): RemoteMeta, SyncStoreState, config(), enable(), Route, secrets, clearSyncConfig(), loadSyncConfig() (+6 more)

### Community 27 - "Strength Progress"
Cohesion: 0.13
Nodes (15): PALETTE, StrengthProgressPage(), CompletionButtons(), CompletionLog(), initialIndex(), ScoreLine(), StrengthGrid(), STYLE_LABELS (+7 more)

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
Cohesion: 0.17
Nodes (19): EnableForm(), onSubmit(), Cipher, decryptJson(), deriveAuthToken(), deriveKey(), encryptJson(), EncryptOptions (+11 more)

### Community 32 - "Data Import/Export"
Cohesion: 0.19
Nodes (12): DataPage(), doExport(), handleParsed(), loadSample(), onFile(), Pending, exportFilename(), ImportSummary (+4 more)

### Community 33 - "Sync Engine Flow"
Cohesion: 0.25
Nodes (20): attachSync(), cancelPush(), fail(), forcePush(), isStale(), keyFits(), patchConfig(), pauseSync() (+12 more)

### Community 34 - "Sync API Client"
Cohesion: 0.24
Nodes (9): ApiFailure, ApiResult, commonFailure(), deleteState(), getMeta(), getState(), putState(), readJson() (+1 more)

### Community 35 - "Node TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, erasableSyntaxOnly, lib, module, moduleDetection (+10 more)

### Community 36 - "shared/index.ts"
Cohesion: 0.15
Nodes (15): RoundReport, Adherence, WeekBar, Content, GapDay, groupByWeek(), IgnoredOp, ProgramDay (+7 more)

### Community 37 - "migrateToCurrent"
Cohesion: 0.22
Nodes (7): migrateToCurrent(), MigrationResult, MIGRATIONS, assertNoUnmappedKeys(), baseDoc(), appStateSchema, SCHEMA_VERSION

### Community 38 - "Sync State Wiring"
Cohesion: 0.12
Nodes (4): ConflictChoice, EnableInput, EnableResult, PullOptions

### Community 39 - "WorkoutLinksCard.tsx"
Cohesion: 0.14
Nodes (10): WorkoutLinksCard(), KIND_ICONS, GENNEXT_GROUPS, Group, P90X_GROUPS, WorkoutsPage(), MEDIA_KINDS, WorkoutDef (+2 more)

### Community 40 - "architecture.test.ts"
Cohesion: 0.13
Nodes (11): ALLOWED, Context, CONTEXTS, LIB, LIB_ROOT_EXCEPTIONS, libFiles, outsideFiles, specCache (+3 more)

### Community 41 - "Sync Page & Secrets"
Cohesion: 0.23
Nodes (13): STATUS_LABEL, SyncPage(), TokenCard(), MIN_PASSPHRASE_LENGTH, disableSync(), SyncStatus, useSyncStore, clearSecrets() (+5 more)

### Community 42 - "Sync Worker"
Cohesion: 0.23
Nodes (13): authorized(), corsHeaders(), fetch(), handleRequest(), json(), putState(), readMeta(), call() (+5 more)

### Community 43 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, format, format:check, lhci, lint (+6 more)

### Community 44 - "compareISO"
Cohesion: 0.17
Nodes (16): BodyOutcome, buildRoundReport(), adherenceTrend(), computeAdherence(), isRestDay(), sampleAdherence(), sampleFixture(), materialize() (+8 more)

### Community 45 - "selectors.ts"
Cohesion: 0.25
Nodes (15): AdherenceCard(), Stat(), DashboardPage(), NextUp(), RoundCompleteCard(), QuoteCard(), dayNumberAt(), ProgramStatusBar() (+7 more)

### Community 46 - "Sync Decisions"
Cohesion: 0.17
Nodes (13): base64, cipherSchema, decideSync(), hasUserData(), normalizeEndpoint(), remoteMetaSchema, RemoteState, remoteStateSchema (+5 more)

### Community 50 - "Body Log Actions"
Cohesion: 0.27
Nodes (4): removeEntry(), upsertEntry(), deleteBodyEntry(), upsertBodyEntry()

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

### Community 61 - "status.test.ts"
Cohesion: 0.33
Nodes (3): entriesFor(), schedule, workoutState

### Community 66 - "AppState"
Cohesion: 0.33
Nodes (4): AppState, BackupEnvelope, DebouncedSaver, LoadResult

## Knowledge Gaps
- **19 isolated node(s):** `@lhci/cli`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8` (+14 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 562 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Focus/Play UI`, `SettingsPage.tsx`, `Scoring, Overload, Progression`, `gen_sample.mjs`, `programData.ts`, `Nutrition Engine`, `Shared Test Fixtures`, `RoundCompareSection.tsx`, `Store & Persistence`, `RescheduleSection.tsx`, `rounds.ts`, `Charts`, `Schema & Units`, `Quotes`, `src_lib_shared_index_getworkout`, `Body-Fat Calculators`, `feasibility.ts`, `App.tsx`, `roundReport.ts`, `Build Config & Deps`, `Sync Config`, `Sync Crypto`, `Data Import/Export`, `shared/index.ts`, `migrateToCurrent`, `architecture.test.ts`, `Sync Worker`, `compareISO`, `Sync Decisions`, `playerSettings.ts`, `status.test.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `@lhci/cli`, `@types/node`, `@types/react` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Workbook Converter Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.05621621621621622 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `FFMI Target E2E`, `Journeys E2E`, `Nutrition E2E`, `Rounds E2E`, `Schedule E2E`, `Settings E2E`, `Trends E2E`, `focus-play.spec.ts`, `gennext.spec.ts`, `Sync E2E Spec`, `Build Config & Deps`, `Voice E2E Spec`, `Play E2E Spec`, `Dashboard E2E`, `FFMI Feasibility E2E`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Focus/Play UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09147869674185463 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Card` to `Data Import/Export`, `TodayPage.tsx`, `Focus/Play UI`, `SettingsPage.tsx`, `WorkoutLinksCard.tsx`, `Sync Page & Secrets`, `RoundCompareSection.tsx`, `BodyPage.tsx`, `RescheduleSection.tsx`, `selectors.ts`, `Voice Entry`, `Charts`, `Quotes`, `Body-Fat Calculators`, `App.tsx`, `Build Config & Deps`, `Strength Progress`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `SettingsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04057971014492753 - nodes in this community are weakly interconnected._