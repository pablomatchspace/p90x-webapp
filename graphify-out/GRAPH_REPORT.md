# Graph Report - p90x-webapp  (2026-10-25)

## Corpus Check
- 279 files · ~201,031 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 1, .toml 1)

## Summary
- 1851 nodes · 5342 edges · 104 communities (80 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 156 edges (avg confidence: 0.89)
- Token cost: 573,687 input · 0 output

## Community Hubs (Navigation)
- Workbook Converter Tools
- Body Pages & Metrics
- App Shell & Routing
- Body Derivation Logic
- Nutrition Settings UI
- Page Layout & Dates
- Selectors & Round Report
- PRD Decisions & Scope
- Schedule Editing & Ops
- Charts & Strength Progress
- Focus/Play Timer UI
- Cardio X Requirements
- Overload & Workout Detail
- Bounded Contexts Glossary
- Voice Entry
- Schema & Units
- Nutrition Engine
- Materialize, Status, Adherence
- Settings Actions
- Store & Persistence
- Body-Fat Calculators
- Quotes
- Sync API Client
- Today, Schedule, Start Pages
- Timeline Registry
- Build Config & Deps
- Shared Barrel & Sessions
- Sync Crypto
- Round Comparison
- Nutrition Targets Docs
- Workout Media Links
- Playback Engine
- App TS Config
- FFMI Recomp Targets
- Body Trend Charting Docs
- Dev Tooling Deps
- Sync Config
- Repomix Config
- Today Status Bar & ISO Dates
- Data Import/Export
- Sync Engine Internals
- Rounds Actions & Ports
- Body Log & Archive
- FFMI Feasibility Logic
- Sync Store State
- Node TS Config
- Session Actions & Logging UI
- Cloud Sync Epic
- Plyo & Kenpo Play Epics
- Sample Data Generator
- Strength Grid
- Feasibility Requirements
- Sync Page & Secrets
- Actions Tests
- Sync Worker
- Architecture Boundary Test
- Focus Timer & Visual Baselines
- Stretch, Cardio, Yoga Play
- npm Scripts
- Working Agreement & README
- Voice & Overload Epics
- Program Data Catalog
- Versioning Scheme
- Playwright E2E Specs
- Progression Tests
- Round Input Entry UI
- Sync Envelope README
- Sync Security Design
- Round Lifecycle Epic
- Schema Migrations
- CI Workflow
- Runtime Dependencies
- Deploy & CodeQL
- Raw-Inputs Rule & Epics
- FFMI Target Estimator
- Play-Mode Epic Family
- E31 DDD Stories
- E32 Migration Safety
- Onboarding Paths
- Sync E2E Spec
- Oxlint Config
- Voice E2E Spec
- Prettier Config
- Program Start Rules
- Bug-Release Counter
- Root TS Config
- Body-Trend Continuity

## God Nodes (most connected - your core abstractions)
1. `Card()` - 77 edges
2. `SettingsPage()` - 57 edges
3. `vitest` - 55 edges
4. `useStore` - 53 edges
5. `Page()` - 49 edges
6. `getWorkout()` - 47 edges
7. `FocusPage()` - 41 edges
8. `Glossary — ubiquitous language` - 41 edges
9. `todayISO()` - 39 edges
10. `formatLong()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `enable()` --indirect_call--> `fetch()`  [INFERRED]
  src/state/sync.test.ts → worker/index.js
- `Pull request template (What/Why/How/AC/Validation)` --references--> `Rule 2: never store derived values`  [INFERRED]
  .github/pull_request_template.md → CLAUDE.md
- `Pull request template (What/Why/How/AC/Validation)` --references--> `Versioned state document (schemaVersion + migrations)`  [INFERRED]
  .github/pull_request_template.md → CLAUDE.md
- `CodeQL workflow (javascript-typescript, weekly cron)` --conceptually_related_to--> `Rule 3: personal data local-only by default (D3 as amended by E10)`  [EXTRACTED]
  .github/workflows/codeql.yml → CLAUDE.md
- `One epic = one branch = one PR (claude/epic-eN-<slug>)` --references--> `Pull request template (What/Why/How/AC/Validation)`  [INFERRED]
  CLAUDE.md → .github/pull_request_template.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI quality gate pipeline** — _github_workflows_ci_validate, _github_workflows_ci_e2e, _github_workflows_ci_lighthouse, _github_workflows_codeql_codeql_workflow, _github_dependabot_dependabot_config, claude_quality_gates [EXTRACTED 1.00]
- **End-to-end-encrypted self-hosted cloud sync design** — worker_readme_encrypted_envelope, worker_readme_sync_token_pbkdf2, worker_readme_cas_base_revision, claude_sync_secrets_indexeddb, claude_local_only_data_d3, readme_cloud_sync_self_hosted [INFERRED 0.85]
- **E31 domain-driven design stories U153-U158** — changelog_u153_ubiquitous_language, changelog_u154_bounded_contexts, changelog_u155_branded_units, changelog_u156_field_renames, changelog_u157_application_layer, changelog_u158_ports_store_events [EXTRACTED 1.00]
- **Seven bounded contexts of src/lib** — docs_context_map_schedule_context, docs_context_map_workouts_context, docs_context_map_body_context, docs_context_map_nutrition_context, docs_context_map_rounds_context, docs_context_map_sync_context, docs_context_map_shared_context [EXTRACTED 1.00]
- **Play-mode authored interval timelines (E16–E19)** — docs_glossary_timeline, docs_requirements_plyometrics_plyometrics_workout, docs_requirements_kenpo_x_kenpo_x_workout, docs_requirements_x_stretch_x_stretch_workout, docs_requirements_cardio_x_cardio_x_workout, docs_requirements_yoga_yoga_x_classic, docs_requirements_yoga_p90x3_yoga, docs_requirements_plyometrics_q15_generalize_playback [INFERRED 0.85]
- **Shared evidence base for E20 feasibility and E22/E24 targets** — docs_requirements_ffmi_feasibility_helms_fat_loss_pace, docs_requirements_ffmi_feasibility_recomp_simultaneity, docs_requirements_ffmi_feasibility_horizon_baseline, docs_requirements_nutrition_targets_target_nutrition, docs_requirements_nutrition_targets_protein_targets, docs_requirements_ffmi_feasibility_evidence_tiers [INFERRED 0.85]
- **Schema migration chain v2→v12 via stepwise pipeline** — docs_epics_e12_focus_play_timer_migration_pipeline, docs_epics_e12_focus_play_timer_schema_v2, docs_epics_e14_ffmi_target_estimator_schema_v3, docs_epics_e16_plyometrics_play_schema_v4, docs_epics_e19_yoga_play_variants_schema_v5, docs_epics_e20_ffmi_feasibility_schema_v6, docs_epics_e22_nutrition_targets_schema_v7, docs_epics_e23_workout_deeplinks_schema_v8, docs_epics_e24_recomp_nutrition_schema_v9, docs_epics_e26_audible_play_coaching_schema_v10, docs_epics_e28_round_lifecycle_schema_v11, docs_epics_e30_voice_entry_schema_v12 [EXTRACTED 1.00]
- **Authored play timelines implementing PlayTimeline** — docs_epics_e16_plyometrics_play_play_timeline_types, docs_epics_e16_plyometrics_play_plyometrics_timeline, docs_epics_e17_kenpo_play_kenpo_timeline, docs_epics_e18_stretch_cardio_play_xstretch_timeline, docs_epics_e18_stretch_cardio_play_cardiox_timeline, docs_epics_e19_yoga_play_variants_yoga_classic_timeline, docs_epics_e19_yoga_play_variants_yoga_x3_timeline [EXTRACTED 1.00]
- **Body-target planning: FFMI target to feasibility to nutrition** — docs_epics_e14_ffmi_target_estimator_normalizedffmi, docs_epics_e14_ffmi_target_estimator_schema_v3, docs_epics_e20_ffmi_feasibility_feasibility_engine, docs_epics_e22_nutrition_targets_evidence_based_layer, docs_epics_e24_recomp_nutrition_targetcomposition [INFERRED 0.85]

## Communities (104 total, 24 thin omitted)

### Community 0 - "Workbook Converter Tools"
Cohesion: 0.06
Nodes (31): convert(), main(), num(), read_settings(), length(), mass(), build_catalog(), build_templates() (+23 more)

### Community 1 - "Body Pages & Metrics"
Cohesion: 0.10
Nodes (41): react, BodyPage(), Bounds, boundsFrom(), CHIP_TONE, chipTone(), EntryRow(), PercentField() (+33 more)

### Community 2 - "App Shell & Routing"
Cohesion: 0.06
Nodes (42): lucide-react, react-dom, @testing-library/react, App(), BodyFatCalculatorsPage, BodyPage, BodyTrendsPage, DataPage (+34 more)

### Community 3 - "Body Derivation Logic"
Cohesion: 0.10
Nodes (33): sample, BodySettings, ffmiCategory(), heightUnit(), KG_PER_LB, M_PER_INCH, TargetSettings, targetWeight() (+25 more)

### Community 4 - "Nutrition Settings UI"
Cohesion: 0.05
Nodes (12): NUTRITION_GOAL_LABEL, NUTRITION_GOAL_TONE, NUTRITION_PHASES, RECOMP_TONE, VERDICT_TONE, GOAL_LABEL, GOAL_TONE, kcal() (+4 more)

### Community 5 - "Page Layout & Dates"
Cohesion: 0.14
Nodes (34): NoProgramCard(), Card(), Page(), AdherenceCard(), Stat(), DashboardPage(), NextUp(), RoundCompleteCard() (+26 more)

### Community 6 - "Selectors & Round Report"
Cohesion: 0.09
Nodes (25): CompareCandidate, archivedRoundData(), BODY_KEYS, BodySample, buildRoundReport(), liveRoundData(), RoundData, RoundReport (+17 more)

### Community 7 - "PRD Decisions & Scope"
Cohesion: 0.08
Nodes (29): Catalog / templates (programData), Focus steps, PRD — p90x-webapp (v1.0.0 scope), tools/convert_xlsm.py xlsm→JSON converter, Single versioned JSON document data model (§8), Definition of Done (§11.3), E0 Foundation & infrastructure, E1 Program template, converter & data lifecycle (+21 more)

### Community 8 - "Schedule Editing & Ops"
Cohesion: 0.08
Nodes (19): fast-check, HistoryPage(), contentLabel(), Mode, IDENTITY, OrderList(), slotNames(), describeOp() (+11 more)

### Community 9 - "Charts & Strength Progress"
Cohesion: 0.10
Nodes (22): axisDomain(), Band, ChartSeries, LineChart(), onMove(), pointerX(), LineChartProps, M (+14 more)

### Community 10 - "Focus/Play Timer UI"
Cohesion: 0.10
Nodes (11): useWakeLock(), PRESETS, TimerCard(), beep(), BeepKind, mmss(), speak(), allRounds() (+3 more)

### Community 11 - "Cardio X Requirements"
Cohesion: 0.09
Nodes (23): Timeline (interval workout segment list), P90X Cardio X workout requirements, Cardio X workout structure (yoga + kenpo + plyo + core), Cardio X core section, Cardio X Kenpo karate series, Cardio X plyometrics series (2 rounds), Cardio X yoga warm-up series, P90X Kenpo X workout requirements (+15 more)

### Community 12 - "Overload & Workout Detail"
Cohesion: 0.13
Nodes (17): STYLE_LABELS, ProgramDay, workoutOccurrences(), WorkoutDef, ArchivedRound, archiveLatestNets(), overloadTarget, entry() (+9 more)

### Community 13 - "Bounded Contexts Glossary"
Cohesion: 0.13
Nodes (29): rounds bounded context, schedule bounded context, workouts bounded context, Glossary — ubiquitous language, Adherence (computeAdherence), Chair factor (SETUP!C47), Day status (gap/rest/done/partial/missed/pending), Exercise round (ExerciseRound attempt column) (+21 more)

### Community 14 - "Voice Entry"
Cohesion: 0.09
Nodes (22): pill(), SpeechRecognitionCtor, SpeechRecognitionLike, SpeechResultEvent, VoiceEntryButton(), assignVoiceValues(), COMMANDS, lookup() (+14 more)

### Community 15 - "Schema & Units"
Cohesion: 0.08
Nodes (28): zod, archivedRoundSchema, bodyEntrySchema, customQuoteSchema, exerciseEntrySchema, ExerciseRound, exerciseRoundSchema, httpUrl (+20 more)

### Community 16 - "Nutrition Engine"
Cohesion: 0.12
Nodes (25): ACTIVITY_FACTOR, currentLeanKg(), currentWeightKg(), DietStyle, energyAmount(), FAT_FLOOR_G_PER_KG, FAT_G_PER_KG, katchMcArdle() (+17 more)

### Community 17 - "Materialize, Status, Adherence"
Cohesion: 0.13
Nodes (19): adherenceTrend(), computeAdherence(), isRestDay(), sampleAdherence(), sampleFixture(), WeekBar, Content, groupByWeek() (+11 more)

### Community 18 - "Settings Actions"
Cohesion: 0.10
Nodes (21): Derived(), Row(), Segmented(), SettingsPage(), applyFfmiTargets(), applyPending(), onDateInput(), percentToFraction() (+13 more)

### Community 19 - "Store & Persistence"
Cohesion: 0.14
Nodes (20): AppState, BackupEnvelope, createDebouncedSaver(), daysSinceExport(), DebouncedSaver, LoadIssue, LoadResult, loadState() (+12 more)

### Community 20 - "Body-Fat Calculators"
Cohesion: 0.13
Nodes (18): BodyFatCalculatorsPage(), confirmSave(), Field(), Method, METHODS, applyProgram(), switchProgram(), mToUnit() (+10 more)

### Community 21 - "Quotes"
Cohesion: 0.12
Nodes (15): add(), activeQuotes(), addQuote(), BUILTIN_QUOTES, deleteQuote(), Quote, QuoteList, quoteOfDay() (+7 more)

### Community 22 - "Sync API Client"
Cohesion: 0.11
Nodes (20): base64, cipherSchema, decideSync(), remoteMetaSchema, RemoteState, remoteStateSchema, SYNC_WIRE_VERSION, SyncAction (+12 more)

### Community 23 - "Today, Schedule, Start Pages"
Cohesion: 0.15
Nodes (12): react-router-dom, DayCell(), LEGEND, Week(), CELL_CLASSES, DAY_STATUS_LABELS, DAY_STATUS_TONES, SHORT_CODES (+4 more)

### Community 24 - "Timeline Registry"
Cohesion: 0.24
Nodes (12): cardioX, getTimeline(), hasTimeline(), TIMELINES, timelinesFor(), kenpoX, plyometrics, PlaySegment (+4 more)

### Community 25 - "Build Config & Deps"
Cohesion: 0.09
Nodes (21): name, private, type, version, jsdom, @lhci/cli, oxlint, prettier (+13 more)

### Community 26 - "Shared Barrel & Sessions"
Cohesion: 0.18
Nodes (8): vitest, CatalogExercise, ExerciseEntry, Session, FocusStep, ROUND_2_ORDER, cb, WorkoutLogs

### Community 27 - "Sync Crypto"
Cohesion: 0.16
Nodes (20): EnableForm(), onSubmit(), Cipher, normalizeEndpoint(), decryptJson(), deriveAuthToken(), deriveKey(), encryptJson() (+12 more)

### Community 28 - "Round Comparison"
Cohesion: 0.13
Nodes (12): BODY_KEYS, BODY_META, DAY_TICKS, RoundCompareSection(), bodySeriesByDay(), comparableWorkouts(), netSeriesByOccurrence(), BodyOutcome (+4 more)

### Community 29 - "Nutrition Targets Docs"
Cohesion: 0.16
Nodes (19): nutrition bounded context, Calorie override, Diet style (balanced/lowCarb), Nutrition phase (phaseOverride), Muscle-sparing fat-loss pace 0.5–1%/week (Helms 2014), Body recomposition simultaneity (Barakat 2020), E22 Nutrition targets requirements (calories & macros), BMR: Katch–McArdle / Mifflin–St Jeor (+11 more)

### Community 30 - "Workout Media Links"
Cohesion: 0.15
Nodes (13): LinkField(), commit(), WorkoutLinksCard(), KIND_ICONS, applyWorkoutLink(), isHttpUrl(), LinkParse, MEDIA_KIND_LABELS (+5 more)

### Community 31 - "Playback Engine"
Cohesion: 0.19
Nodes (20): FocusPage(), Sparkline(), PlayPage(), resumeIndex(), targetStatus, extendPlayback(), pausePlayback(), PlaybackEvent (+12 more)

### Community 32 - "App TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+13 more)

### Community 33 - "FFMI Recomp Targets"
Cohesion: 0.16
Nodes (19): Stepwise migration pipeline (MIGRATIONS / migrateToCurrent), Schema v3 — settings.targets.ffmi, E20 — FFMI target feasibility, Feasibility engine (feasibility.ts), Shared ffmiPlan helper extraction, Dashboard FFMI on-pace chip, Reality check panel (Settings), Schema v6 — settings.training (+11 more)

### Community 34 - "Body Trend Charting Docs"
Cohesion: 0.13
Nodes (19): E21 — Sophisticated charting, adherenceTrend cumulative rate, Body composition chart (lean vs fat), LineChart crosshair, markers, phase bands, movingAverage / nearestX chart helpers, workoutTotalTrend session net score, E23 — Workout media deeplinks, links.ts isHttpUrl / parseLinkInput (+11 more)

### Community 35 - "Dev Tooling Deps"
Cohesion: 0.10
Nodes (21): devDependencies, fast-check, jsdom, @lhci/cli, oxlint, @playwright/test, prettier, repomix (+13 more)

### Community 36 - "Sync Config"
Cohesion: 0.14
Nodes (12): config(), enable(), Route, secrets, clearSyncConfig(), loadSyncConfig(), PausedReason, pausedReasonSchema (+4 more)

### Community 37 - "Repomix Config"
Cohesion: 0.10
Nodes (20): sortByChanges, sortByChangesMaxCommits, ignore, customPatterns, useDefaultPatterns, useGitignore, include, output (+12 more)

### Community 38 - "Today Status Bar & ISO Dates"
Cohesion: 0.26
Nodes (18): dayNumberAt(), ProgramStatusBar(), RescheduleSection(), StartPage(), submit(), TodayPage(), nextProgramDateAfter(), addDays() (+10 more)

### Community 39 - "Data Import/Export"
Cohesion: 0.19
Nodes (12): DataPage(), doExport(), handleParsed(), loadSample(), onFile(), Pending, exportFilename(), ImportSummary (+4 more)

### Community 40 - "Sync Engine Internals"
Cohesion: 0.25
Nodes (20): attachSync(), cancelPush(), fail(), forcePush(), isStale(), keyFits(), patchConfig(), pauseSync() (+12 more)

### Community 41 - "Rounds Actions & Ports"
Cohesion: 0.13
Nodes (8): immer, clock, Detach, PersistencePort, realClock, resetClock(), setClock(), SyncPort

### Community 42 - "Body Log & Archive"
Cohesion: 0.19
Nodes (11): BodyMetric, BodyDerived, removeEntry(), upsertEntry(), applySnapshot(), buildArchivedRound(), defaultRoundLabel(), latestStartStats() (+3 more)

### Community 43 - "FFMI Feasibility Logic"
Cohesion: 0.16
Nodes (17): Sex, ARAGON_PCT, assessFatLoss(), assessLeanGain(), Band, bandVerdict(), ceilingStatus(), Experience (+9 more)

### Community 44 - "Sync Store State"
Cohesion: 0.11
Nodes (6): RemoteMeta, ConflictChoice, EnableInput, EnableResult, PullOptions, SyncStoreState

### Community 45 - "Node TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, checkJs, erasableSyntaxOnly, lib, module, moduleDetection (+10 more)

### Community 46 - "Session Actions & Logging UI"
Cohesion: 0.20
Nodes (14): WorkoutCard(), CompletionButtons(), CompletionLog(), MediaLinks(), WorkoutDetailPage(), cleanupSession(), upsertSession(), writeRoundValue() (+6 more)

### Community 47 - "Cloud Sync Epic"
Cohesion: 0.18
Nodes (14): Context map — bounded contexts of src/lib, Application layer (src/state: store, actions, selectors, ports), src/lib/architecture.test.ts boundary enforcement, shared kernel bounded context, sync bounded context, Canonical units (Kg, Meters, BodyFraction), Document (AppState, appStateSchema), Import/export (anti-corruption layer) (+6 more)

### Community 48 - "Plyo & Kenpo Play Epics"
Cohesion: 0.21
Nodes (13): Screen wake lock during playback, E16 — Plyometrics play, Auto-mark done setting (Q17, default off), Per-exercise done/skipped logging (Q21c), Playback per-step durations & skippable rests (stepSeconds/restAfter), PlayPage (/workouts/:key/play/:programDayId), Plyometrics timeline (76 segments), Schema v4 — player.autoMarkDone + session.exerciseDone (+5 more)

### Community 49 - "Sample Data Generator"
Cohesion: 0.12
Nodes (14): arxDays, bodyLog, cardioPlan, catalog, entriesFor(), out, push(), root (+6 more)

### Community 50 - "Strength Grid"
Cohesion: 0.18
Nodes (8): StrengthProgressPage(), initialIndex(), ScoreLine(), StrengthGrid(), ExerciseScore, formatScore(), useScoringSettings(), useWorkoutSessions()

### Community 51 - "Feasibility Requirements"
Cohesion: 0.22
Nodes (14): body bounded context, BMI / FFMI, Body entry (BodyEntry, bodyLog), Feasibility, SETUP inputs (settings), FFMI Target Feasibility requirements (Reality Check oracle), Aragon %BW muscle-gain model (Aragon 2012), Feasibility horizon & baseline (+6 more)

### Community 52 - "Sync Page & Secrets"
Cohesion: 0.23
Nodes (13): STATUS_LABEL, SyncPage(), TokenCard(), MIN_PASSPHRASE_LENGTH, disableSync(), SyncStatus, useSyncStore, clearSecrets() (+5 more)

### Community 54 - "Sync Worker"
Cohesion: 0.23
Nodes (13): authorized(), corsHeaders(), fetch(), handleRequest(), json(), putState(), readMeta(), call() (+5 more)

### Community 55 - "Architecture Boundary Test"
Cohesion: 0.13
Nodes (11): ALLOWED, Context, CONTEXTS, LIB, LIB_ROOT_EXCEPTIONS, libFiles, outsideFiles, specCache (+3 more)

### Community 56 - "Focus Timer & Visual Baselines"
Cohesion: 0.20
Nodes (10): E12 — Focus mode play timer, Pure focus playback engine (playback.ts), Schema v2 — settings.timer, timerUtils beep/mmss, updateTimerSettings clamped action, E15 — Playwright device replacement & UI validation, Adversarial re-review findings F1–F8, realme 16 Pro+ (RMX5131) emulation profile (+2 more)

### Community 57 - "Stretch, Cardio, Yoga Play"
Cohesion: 0.26
Nodes (10): PlaySegment / PlayTimeline types, E18 — X Stretch + Cardio X play, Cardio X timeline, Flow segments (untimed chain cues, no reps), X Stretch timeline, E19 — Yoga play variants, Per-launch yoga variant picker (not persisted), Schema v5 — settings.yoga (+2 more)

### Community 58 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, format, format:check, lhci, lint (+6 more)

### Community 59 - "Working Agreement & README"
Cohesion: 0.18
Nodes (8): E2E pitfalls (frozen page.clock, getByLabel substring, 300ms debounced persistence), npm run repomix codebase-wide context pack, CLAUDE.md working agreement, index.html app shell (#root, loads /src/main.tsx), README - P90X Tracker PWA, P90Xcel v2.05 Excel workbook (52 sheets), Tech stack (Vite, React 19, Zustand+Immer, Zod, Tailwind, vite-plugin-pwa, Vitest, Playwright, oxlint, Lighthouse CI), worker/index.test.ts HTTP contract tests (fake KV, CORS, CAS, 5 MB cap)

### Community 60 - "Voice & Overload Epics"
Cohesion: 0.26
Nodes (13): E26 — Audible play-mode coaching, Schema v10 — player.voiceCues, speak() Web Speech announcements, E29 — Progressive-overload targets, archiveLatestNets archive fallback, overloadTarget — beat last net score, Focus-mode target chip & targets-beaten tally, targetStatus pending/beaten/matched/behind (+5 more)

### Community 61 - "Program Data Catalog"
Cohesion: 0.18
Nodes (9): day1Of(), byKey, catalog, getTemplate(), RoundLabels, SecondaryKind, TemplateDay, templates (+1 more)

### Community 62 - "Versioning Scheme"
Cohesion: 0.26
Nodes (9): E11 — Chest & Back focus sequence, focusSteps play order, Step-aware resumeIndex, ROUND_2_ORDER pair-swapped C&B round 2, RoundInputs rounds subset prop, E13 — Per-epic versioning & changelog, __APP_VERSION__ on More → Help, CHANGELOG.md (+1 more)

### Community 64 - "Progression Tests"
Cohesion: 0.29
Nodes (6): migrateToCurrent(), sampleFixture(), sampleProgression(), workoutProgression(), candidates, localFile

### Community 65 - "Round Input Entry UI"
Cohesion: 0.33
Nodes (6): fieldAria(), mainLabel(), SECONDARY_LABELS, RoundInputs(), previousValue(), setRoundValue()

### Community 66 - "Sync Envelope README"
Cohesion: 0.29
Nodes (6): E10 cloud sync (opt-in E2E-encrypted, D3 amended), Sync secrets in IndexedDB (non-extractable AES key + auth token, state/syncSecrets.ts), Cloud sync (optional, self-hosted Cloudflare Worker), Encrypted envelope {v, updatedAt, deviceId, deviceName, cipher} (AES-256-GCM), Sync API (GET /v1/meta, GET/PUT/DELETE /v1/state, Bearer auth), Sync Worker README (Cloudflare Worker + KV)

### Community 67 - "Sync Security Design"
Cohesion: 0.36
Nodes (5): E10 — Cloud sync (opt-in, self-hosted, E2E encrypted), attachSync client engine, decideSync pure policy, Self-hosted Cloudflare sync Worker, Sync wire envelope (v1)

### Community 68 - "Round Lifecycle Epic"
Cohesion: 0.33
Nodes (10): E28 — Round lifecycle, ArchivedRound raw-input snapshot, completeRound archive-and-reset, restoreRound (refused while live program exists), roundCompare round-over-round overlay, buildRoundReport end-of-round report, E9 — Fresh-start onboarding, NoProgramCard shared empty state (+2 more)

### Community 69 - "Schema Migrations"
Cohesion: 0.22
Nodes (6): MigrationResult, MIGRATIONS, assertNoUnmappedKeys(), baseDoc(), appStateSchema, SCHEMA_VERSION

### Community 70 - "CI Workflow"
Cohesion: 0.22
Nodes (9): Pull request template (What/Why/How/AC/Validation), CI workflow, CI e2e job (Playwright on built app), CI lighthouse job (lhci, perf/a11y/best-practices >= 90), CI validate job (lint, format:check, typecheck, test:coverage, build), Update smoke snapshots (linux) workflow, E15 realme 16 Pro+ Playwright profile & per-platform baselines, One epic = one branch = one PR (claude/epic-eN-<slug>) (+1 more)

### Community 71 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, immer, lucide-react, react, react-dom, react-router-dom, zod, zustand

### Community 72 - "Deploy & CodeQL"
Cohesion: 0.29
Nodes (7): Dependabot config (npm + github-actions weekly, minor/patch grouped), CodeQL workflow (javascript-typescript, weekly cron), Deploy build job (uploads dist as pages artifact), Deploy job (actions/deploy-pages), Deploy to GitHub Pages workflow, Quality gates (CI validate/e2e/lighthouse, CodeQL, Pages deploy, Dependabot), Worker deploy: dashboard paste (no imports) or wrangler CLI; never deployed by CI

### Community 73 - "Raw-Inputs Rule & Epics"
Cohesion: 0.33
Nodes (6): E14 FFMI target estimator (schema v3), E20 FFMI target feasibility (schema v6), E22 nutrition targets (P90X Nutrition Plan guide + evidence-based layer, schema v7), E24 recomposition-aware targets & low-carb diet style (schema v9), E28 round lifecycle: archive, round report, round-over-round (schema v11), E29 progressive-overload targets (Target: beat N)

### Community 74 - "FFMI Target Estimator"
Cohesion: 0.52
Nodes (5): E14 — FFMI target estimator, Estimate from FFMI panel (Settings), leanMassForFfmi inverse, normalizedFfmi (workbook 6.1 at 1.8 m), weightForLeanMass

### Community 75 - "Play-Mode Epic Family"
Cohesion: 0.33
Nodes (6): E12 focus play timer (schema v2, stepwise migration pipeline), E23 workout media deeplinks (settings.workoutLinks, schema v8), E26 audible play-mode coaching (rest beep, spoken exercises, schema v10), E27 media deeplinks in focus & play mode, E30 voice rep entry in focus mode (Web Speech, hands-free, schema v12), Play-mode workout timelines (E16 Plyo, E17 Kenpo, E18 X Stretch/Cardio X, E19 Yoga)

### Community 76 - "E31 DDD Stories"
Cohesion: 0.40
Nodes (6): E31 - Domain-driven design alignment, U153 ubiquitous language (GLOSSARY, CONTEXT-MAP, Round->ExerciseRound), U154 physical bounded contexts + architecture.test.ts, U155 branded unit value objects (Kg, Meters, BodyFraction), U158 ports (clock, PersistencePort, SyncPort) & typed store events (reset, documentReplaced), src/lib seven bounded contexts with index.ts barrels

### Community 77 - "E32 Migration Safety"
Cohesion: 0.40
Nodes (5): E32 U159 - pre-migration safety backups & snapshot validation, Pre-migration backup key p90x.backup.pre-migration.v{version}, Static schema JSON fixtures v1-v13 (src/test/fixtures/schema), U156 persisted-field renames (schema v13: archivedRounds, completion, reps/assist), Versioned state document (schemaVersion + migrations)

### Community 78 - "Onboarding Paths"
Cohesion: 0.33
Nodes (6): E9 fresh-start onboarding (/start route), U157 application layer & domain invariants (state/actions/*), Program exists iff settings.startDate non-null (materialize(program, startDate, ops)), tools/convert_xlsm.py workbook-to-JSON converter, Three ways in: start a program, import workbook, try sample, Fabricated sample dataset (public/sample-data.json)

### Community 79 - "Sync E2E Spec"
Cohesion: 0.47
Nodes (4): dismissToast(), enableSync(), FakeWorker, startProgram()

### Community 80 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 83 - "Prettier Config"
Cohesion: 0.50
Nodes (3): printWidth, semi, singleQuote

## Knowledge Gaps
- **41 isolated node(s):** `@lhci/cli`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/coverage-v8` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Shared Barrel & Sessions` to `App Shell & Routing`, `Body Derivation Logic`, `Selectors & Round Report`, `Schedule Editing & Ops`, `Charts & Strength Progress`, `Overload & Workout Detail`, `Schema & Units`, `Nutrition Engine`, `Materialize, Status, Adherence`, `Settings Actions`, `Store & Persistence`, `Body-Fat Calculators`, `Quotes`, `Timeline Registry`, `Build Config & Deps`, `Sync Crypto`, `Workout Media Links`, `Playback Engine`, `Sync Config`, `Today Status Bar & ISO Dates`, `Data Import/Export`, `Rounds Actions & Ports`, `Body Log & Archive`, `FFMI Feasibility Logic`, `Sample Data Generator`, `Actions Tests`, `Sync Worker`, `Architecture Boundary Test`, `Program Data Catalog`, `Progression Tests`, `Schema Migrations`, `Program Start Rules`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `@lhci/cli`, `@types/node`, `@types/react` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Workbook Converter Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.06286748077792854 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Playwright E2E Specs` to `Build Config & Deps`, `Sync E2E Spec`, `Voice E2E Spec`, `Play E2E Spec`, `Calculators E2E`, `Dashboard E2E`, `FFMI Feasibility E2E`, `FFMI Target E2E`, `Journeys E2E`, `Lean E2E`, `Nutrition E2E`, `Overload E2E`, `Progress E2E`, `Quotes E2E`, `Reschedule E2E`, `Rounds E2E`, `Schedule E2E`, `Settings E2E`, `Trends E2E`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Body Pages & Metrics` be split into smaller, more focused modules?**
  _Cohesion score 0.10303030303030303 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Body Pages & Metrics` to `App Shell & Routing`, `Nutrition Settings UI`, `Page Layout & Dates`, `Selectors & Round Report`, `Data Import/Export`, `Schedule Editing & Ops`, `Charts & Strength Progress`, `Focus/Play Timer UI`, `Voice Entry`, `Strength Grid`, `Body-Fat Calculators`, `Quotes`, `Sync Page & Secrets`, `Today, Schedule, Start Pages`, `Build Config & Deps`, `Round Comparison`, `Workout Media Links`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `App Shell & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.05683060109289618 - nodes in this community are weakly interconnected._