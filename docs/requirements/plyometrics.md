# P90X Plyometrics Workout Requirements

This document outlines the exercises, groupings, sequence, duration, and frequency of the **P90X Plyometrics (Jump Training)** workout parsed from the session transcript.

## General Structure

- **Warm-Up**: ~6 minutes (continuous sequence)
- **Workout Blocks**: 5 distinct blocks, each containing 4 exercises.
  - Each block is performed in **2 rounds** (Round 1 & Round 2 of the same exercises in sequence).
  - Exercises 1-3 in each block are **30 seconds** long.
  - Exercise 4 in each block is **60 seconds** long.
- **Water Breaks**: 30 seconds after completing each 2-round block.
- **Sports Bonus Round**: 1 round of 3 exercises (60 seconds each).
- **Cool Down & Stretch**: ~5 minutes.

---

## Exercise Directory by Sequence

### 1. Warm-Up Phase

Performed once sequentially.

- **March in Place**: 30s
- **Run in Place**: 30s
- **Knees Down, Heels Up (Butt Kicks)**: 30s
- **Tires & Mary Katherine (Mini Version)**: 30s (alternating 15s)
- **Lunges (Alternating)**: 90s
- **Deep Prayer Squats**: 60s (30 repetitions)
- **Standing Quad Stretch**: 60s (30s right, 30s left)
- **Hamstring Stretch (Standing)**: 60s (30s right leg forward, 30s left leg forward)

---

### 2. Block 1 (Rounds 1 & 2)

Complete sequence below twice. After the second round, take a 30s water break.

1. **Jump Squats**: 30s (twice total)
2. **Run Stance Squats**: 30s (twice total - 3 squats, jump on 4th)
3. **Airborne Heisman**: 30s (twice total)
4. **Swing Kicks**: 60s (twice total - alternating legs over chair/stool)

---

### 3. Block 2 (Rounds 1 & 2)

Complete sequence below twice. After the second round, take a 30s water break.

1. **Squat Reach Jump**: 30s (twice total - touch floor, jump up)
2. **Run Stance Squat Switch Pickup**: 30s (twice total - land-squat-pivot 180)
3. **Double Airborne Heisman**: 30s (twice total - double side-shuffles with Heisman hold)
4. **Circle Run**: 60s (twice total - 30s clockwise, 30s counterclockwise; reversed order in round 2)

---

### 4. Block 3 (Rounds 1 & 2)

Complete sequence below twice. After the second round, take a 30s water break.

1. **Jump Knee Tuck**: 30s (twice total - knees to chest)
2. **Mary Katherine (Jump Lunges)**: 30s (twice total)
3. **Leapfrog Squats**: 30s (twice total - 2 forward, 2 back)
4. **Twist Combo**: 60s (twice total - 30s 3-way twist [left-center-right], 30s 180-degree twist)

---

### 5. Block 4 (Rounds 1 & 2)

Complete sequence below twice. After the second round, take a 30s water break.

1. **Rockstar Hops**: 30s (twice total - 15s facing left, 15s facing right; heels-to-butt hops)
2. **Gap Jump**: 30s (twice total - long lateral jumps)
3. **Squat Jacks**: 30s (twice total - hands behind head jacks, drop into low squat)
4. **Military March**: 60s (twice total - high-intensity marching, locking knees and elbows)

---

### 6. Block 5 (Rounds 1 & 2)

Complete sequence below twice. After the second round, take a 30s water break.

1. **Run Squat 180 Jump Switch**: 30s (twice total - pivot jumps)
2. **Lateral Leapfrog Squats**: 30s (twice total - side-to-side squat hops)
3. **Monster Truck Tires**: 30s (twice total - high-knee run 4 steps forward, 4 back)
4. **Hot Foot**: 60s (twice total - 30s left foot hop, 30s right foot hop; hopping in cross pattern)

---

### 7. Sports Bonus Round

Performed once sequentially.

1. **Pitch & Catch**: 60s (30s right-arm pitcher, 30s left-arm pitcher)
2. **Jump Shot**: 60s (30s catch right/shoot left, 30s catch left/shoot right)
3. **Football Hero**: 60s (4 lateral shuffles, 6 high-knee runs)

---

### 8. Cool Down & Stretch Phase

Performed once sequentially.

- **Jump Rope (Low Impact Shake Out)**: 30s
- **Marching Kick**: 30s
- **Forward Bend Stretch**: 90s
- **Calf Stretch**: 60s (alternating knee bends)
- **Spine Stretch (Cat/Cow)**: 60s
- **Standing Quad Stretch**: 60s (30s right, 30s left)

---

## Locked decisions (Pablo, 2026-07-11 — Q13–Q21)

- **Q13 = (b):** authored get-ready gap (~5s) between exercises.
- **Q14:** flatten every internal split (Hot Foot 30/30, Circle Run CW/CCW reversed in R2, Rockstar 15/15, Tires & MK 15/15, Twist Combo 30/30, L/R stretches, Pitch & Catch, Jump Shot) into its own segment — beep at every switch.
- **Q15 = A:** generalize `playback.ts` (per-step durations + skip zero-length rests). One engine; no fork.
- **Q16:** new route `/workouts/:key/play/:programDayId` + red "Play workout" button on the Today completion card and detail page; FocusPage stays strength-only; extract shared wake-lock/beep/mmss hooks.
- **Q17:** end-of-sequence completion mark exposed as an optional in-player setting (activate yes/no).
- **Q18:** no persisted knobs — durations authored; pause/+10s/skip covers the rest.
- **Q19:** generic mechanism, Plyo-only data in E16; Kenpo X / Cardio X / X Stretch / Yoga become data-only adds in later epics.
- **Q20:** versioning convention becomes `{App Version}.{LastEpicDeployed}.{LastUserStoryDeployed}` (e.g. `1.E16.U105`).
- **Q21:** (a) water break after block 5 too, before the bonus round; no extra gaps bonus→cooldown or warm-up→block 1 beyond the standard get-ready. (b) listed durations canonical over the "~6/~5 min" headers. (c) log whether each jump was done or not. (d) Circle Run round-2 labels authored reversed (CCW then CW). (e) Lunges 90s = one segment with "alternating" text, no mid-cue.
