# Epic E36 — Generation Next video-faithful logging

> **Status:** delivered · **Stories:** US-171 → US-173
> **Ships as:** package **1.36.171**…**1.36.173**, displayed **`1.E36.U171`**…`U173` · **Schema:** unchanged (v14)
> **One-liner:** Generation Next strength days log every move the video does —
> bodyweight moves included — and focus mode walks the rounds in the video's order.

---

## 1. Problem

E33 logged only the Dumbbell Tracker's moves, in tracker order, and focus mode
showed one card per exercise with all of its rounds. Following along with a video,
the athlete does every move of a block once, then again — so the app asked for
all three rounds of one move before the next move had even started. Bodyweight
moves (push-ups, pull-ups, jump squats, burpees…) could not be logged at all.

## 2. Goals

1. Every block and finisher move of the seven strength workouts is loggable, in
   video order (decision **D10**).
2. Focus mode plays one card per round in the order the video runs them.
3. Core Circuit is built from its video (it was tracker-only in E33).

## 3. Non-goals

- P90X Classic's focus order (only Chest & Back interleaves, unchanged since E11).
- Warm-ups and cool-downs — performed with the video, not logged.
- A Play timeline for strength days (E34 non-goal stands: focus mode times steps).

## 4. Decisions (owner, 2026-10-26)

| Topic | Decision |
|---|---|
| Scope | Generation Next only |
| Bodyweight moves | Reps + modified reps (`secondary: 'mod'`, scored like Classic knee/chair rows: reps + modified / chairFactor); holds log seconds |
| Finisher rounds | Follow the video: EMOM finishers 3 rounds; Push / Pull ladders keep 5 rungs |
| Odd formats | Full Body Power accumulator: one lap = one round (cap 5); Full Body Strength buy-in / cash-out: one "AMRAP (rounds)" row with two rounds |

## 5. Design

`tools/gen_gennext.py` gains a `VIDEO` source — per workout, blocks of
`(block, rounds, circuits[, bookend])` transcribed from
[`docs/requirements/gennext-workouts.md`](../requirements/gennext-workouts.md).
It emits catalog rows in video order and a `focusOrder` list of
`[exercise id, round]` pairs: each circuit plays round by round; Full Body Power's
Block 1 is three clusters played one after another; a bookend row's round 1 opens
its block and round 2 closes it. `verify()` checks every (exercise, round) is played
exactly once, rounds ≤ 5, and that every Dumbbell Tracker move is still logged in
its block as R×W — tracker moves keep their names, so ids already in users' logs are
unchanged. `focusSteps` uses `focusOrder` when present. No schema change: entries
are keyed by exercise id; rows dropped from a finisher (rounds 4–5) stay stored.

## 6. Stories

- **US-171 — Bodyweight moves + video round counts (M, P0):** `VIDEO` source, `'mod'`
  secondary kind (label "modified reps", voice words "modified"/"mod"), "(sec)" holds,
  "(rounds)" AMRAP row, finisher rounds per the video.
- **US-172 — Focus mode in video order (S, P0):** generated `focusOrder`, one card
  per round; Full Body Power clusters; buy-in / cash-out bookends.
- **US-173 — Core Circuit from video, E2E & release (S, P1):** Core Circuit
  structure from its video (oracle §14), `e2e/gennext.spec.ts` focus-order journey,
  `1.36.173`.

## 7. QA

`programData.test.ts` pins catalog shape and video round counts;
`focusSteps.test.ts` pins round-major order, clusters, bookends and full coverage;
`scoring.test.ts` pins `'mod'` scoring; `voiceEntry.test.ts` pins "modified reps";
the generator's `verify()` pins the tracker cross-check.
