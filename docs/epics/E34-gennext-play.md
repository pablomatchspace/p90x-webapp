# Epic E34 — P90X Generation Next Focus Play

> **Status:** delivered · **Stories:** US-167 → US-170
> **Ships as:** package **1.34.167**…**1.34.170**, displayed **`1.E34.U167`**…`U170` · **Schema:** unchanged (v14)
> **One-liner:** Every Generation Next completion workout and 5-minute bonus gets
> a guided **Play workout** timeline — warm-up, blocks × rounds with work/rest,
> finisher and cool-down — authored from the E33 oracle.

---

## 1. Problem

E33 made Generation Next schedulable and loggable, but its cardio, athletic and
recovery days only offer done / not done. Classic's completion workouts (E16–E19)
already play as guided interval timelines.

## 2. Goals

1. A Play timeline for each Generation Next **completion** workout — Plyometrix,
   Speed and Agility, Accel/Decel, Cardio Boxing (NPT), Active Mobility, Active
   Flexibility, Myofascial Release (ART) — and each **bonus** fiver.
2. Timelines come from [`docs/requirements/gennext-workouts.md`](../requirements/gennext-workouts.md)
   and are pinned by golden tests (structure, timing, video-length bounds).

## 3. Non-goals

- **Strength (MOT) workouts** — they log reps × weight in focus mode, which already
  times each step (E12); no separate Play timeline (AUTO-DECISION: avoids two
  competing guided modes on the same card).
- **Core Circuit** — no video, so no timeline.
- Video sync: timelines are approximate (warm-up / cool-down moves at ~30 s;
  open-ended finisher games become one capped segment).

## 4. Design

`src/lib/workouts/timelines/gennext/` — `build.ts` expands compact specs
(`block(section, moves, rounds, work, rest)`, `flow`, `reps`) into `PlaySegment[]`;
`npt.ts`, `art.ts`, `bonus.ts` hold the specs; all register in `timelines/index.ts`.
Rests are `break` segments. `loggedExerciseIds` = the block / finisher moves (warm-up
and cool-down excluded), like E16.

## 5. Stories

- **US-167 — NPT timelines (M, P0):** Plyometrix (30/30 × 3 rounds, 60 s finisher),
  Speed and Agility (40/20, Tabata 20/10 × 8), Accel/Decel (40/20, 5-min ladder),
  Cardio Boxing (5 × 3-min rounds + finisher).
- **US-168 — ART timelines (S, P0):** Active Mobility (6×6 test/retest + flow),
  Active Flexibility (~40 s holds), Myofascial Release (23 × 60 s).
- **US-169 — Bonus timelines (S, P1):** the five fivers.
- **US-170 — E2E & release (S, P1):** Play from a Generation Next day and from a
  bonus card on desktop + realme; `1.34.170`.

## 6. QA

`gennext.test.ts`: every timeline registered, unique ids, logged ids exist, timed
total between half and all of the video length; format pins per workout.
