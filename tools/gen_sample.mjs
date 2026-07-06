// Generate the fabricated demo dataset (US-014). Fully deterministic — values
// derive from exercise/round indices, not randomness. No real person's data.
// Usage: node tools/gen_sample.mjs   → writes public/sample-data.json
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(path.join(root, 'src/data/catalog.json'), 'utf-8'))
const templates = JSON.parse(readFileSync(path.join(root, 'src/data/templates.json'), 'utf-8'))

const workoutByKey = new Map(catalog.workouts.map((w) => [w.key, w]))
const classic = templates.classic

// Sample persona: start Monday 2026-01-05, one skipped day, ~2 weeks logged.
const START = '2026-01-05'
const SKIP_DATE = '2026-01-14'
const CREATED = '2026-01-20T09:00:00'

function entriesFor(workoutKey, sessionIndex) {
  const workout = workoutByKey.get(workoutKey)
  const entries = {}
  workout.exercises.forEach((ex, i) => {
    const rounds = []
    for (let r = 0; r < ex.rounds; r++) {
      const base = 8 + ((i * 3) % 10) + sessionIndex // grows week over week
      if (ex.secondary === 'weight') {
        rounds.push({ main: base + 2 - r, secondary: 10 + ((i * 2) % 6) })
      } else if (ex.secondary === 'knee' || ex.secondary === 'chair') {
        rounds.push({ main: base - r * 2, secondary: r === 0 ? 0 : 2 })
      } else if (ex.secondary === 'extra') {
        rounds.push({ main: base, secondary: base - 2 })
      } else {
        rounds.push({
          main: workoutKey === 'ab-ripper-x' ? 15 + ((i + sessionIndex) % 10) : base + 4 - r,
          secondary: null,
        })
      }
    }
    entries[ex.id] = { rounds }
  })
  return entries
}

// Log the first two program weeks (day ids are template slots, so the skip
// does not change which slots are logged — exactly like the Excel).
const strengthPlan = [
  ['chest-back', 'd001', '1', 0],
  ['shoulders-arms', 'd003', '1', 0],
  ['legs-back', 'd005', '1', 0],
  ['chest-back', 'd008', '2 sample note', 1],
  ['shoulders-arms', 'd010', '2', 1],
  ['legs-back', 'd012', '2', 1],
]
const cardioPlan = [
  ['plyometrics', 'd002', 'yes', 'Sample: kept up with the video'],
  ['yoga-x', 'd004', 'yes', null],
  ['kenpo-x', 'd006', 'yes', null],
  ['plyometrics', 'd009', 'yes', 'Sample: 80% intensity'],
  ['yoga-x', 'd011', 'no', 'Sample: skipped, sore'],
  ['kenpo-x', 'd013', 'yes', null],
]
const arxDays = ['d001', 'd003', 'd005', 'd008', 'd010']

const workoutLogs = {}
function push(key, session) {
  ;(workoutLogs[key] ??= { sessions: [] }).sessions.push(session)
}
for (const [key, dayId, annotation, idx] of strengthPlan) {
  push(key, {
    programDayId: dayId,
    ...(annotation.match(/[a-z]/i) ? { annotation } : {}),
    entries: entriesFor(key, idx),
    completed: true,
    loggedAt: CREATED,
  })
}
for (const [key, dayId, status, notes] of cardioPlan) {
  push(key, { programDayId: dayId, status, ...(notes ? { notes } : {}), loggedAt: CREATED })
}
arxDays.forEach((dayId, i) => {
  push('ab-ripper-x', {
    programDayId: dayId,
    entries: entriesFor('ab-ripper-x', i),
    completed: true,
    loggedAt: CREATED,
  })
})

const bodyLog = Array.from({ length: 14 }, (_, i) => {
  const day = 6 + i // Jan 6..19
  return {
    date: `2026-01-${String(day).padStart(2, '0')}`,
    weight: Math.round((82 - i * 0.09) * 10) / 10,
    bodyFat: Math.round((0.22 - i * 0.0006) * 1000) / 1000,
    water: 0.55,
    bone: 0.04,
    zoneMinutes: null,
  }
})

const state = {
  schemaVersion: 1,
  settings: {
    program: 'classic',
    startDate: START,
    units: 'metric',
    gender: 'male',
    age: 40,
    height: 1.8,
    startWeight: 82,
    startBodyFat: 0.22,
    limits: { weight: 90, bodyFat: 0.25, bmi: 28 },
    targets: { leanMassIncrease: 4, bodyFat: 0.15 },
    scoring: { penaltyDivisor: 2, penaltyOn: true, chairFactor: 2, rwDivisor: 10 },
  },
  scheduleOps: [{ id: 'sample-skip-1', kind: 'skip', date: SKIP_DATE, createdAt: CREATED }],
  workoutLogs,
  bodyLog,
  quotes: {
    disabledIds: [],
    custom: [{ id: 'sample-custom-1', text: 'Sample data: bring your own fire.' }],
  },
  notes: 'This is the fabricated sample dataset. Import your own file to replace it.',
}

// sanity: template slots referenced must exist
const validIds = new Set(classic.map((d) => `d${String(d.day).padStart(3, '0')}`))
for (const log of Object.values(workoutLogs))
  for (const s of log.sessions)
    if (!validIds.has(s.programDayId)) throw new Error(`bad day id ${s.programDayId}`)

const out = path.join(root, 'public', 'sample-data.json')
writeFileSync(out, JSON.stringify(state, null, 2) + '\n')
console.log('wrote', out)
