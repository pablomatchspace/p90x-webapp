# P90X Generation Next — workout oracle (E33)

The source of truth for `tools/gen_gennext.py` → `src/data/gennext.json` (catalog +
90-day template) and for E34's Play timelines. Facts are **paraphrased** from BODi's
own material — no transcript quotes, frames or PDF copies live in this repo.

**Evidence tags.** Every timestamp (`mm:ss`, about ±15 s) is *video-audio* evidence
from the workout video (speech-to-text, then hand-checked). `[tracker ✓]` marks a
move cross-checked against the **Dumbbell Tracker PDF** (*tracker-PDF*);
`[NOT in tracker — bodyweight]` marks a move the tracker does not log. Calendar
facts are *calendar-PDF*, checked against the page images (*video-frame* checks
were used only to confirm on-screen text: the countdown timer and safety captions —
the videos show no exercise-name overlays).

**Source audit (2026-10-25/26).** Five video files were misnamed and have been
renamed on disk to match their content: *Active Mobility* ↔ *Myofascial Release*
were swapped; *Pull Strength* / *Full Body Strength* / *Full Body Power* were
rotated; *Sample Workout (Preview)* is the pull-up-bar setup clip. *Sample Workout
(Full Workout)* is a free taster, not a program workout — so **Core Circuit has no
video** and is defined by the tracker alone.

## Pillars

From the Get Started guide: **MOT** — Metabolic Overload Training (fast-paced
strength, minimal rest); **NPT** — Neuro-Performance Training (coordination,
speed, athleticism); **ART** — Active Recovery Training (mobility, recovery).
The videos never name a workout's pillar; assignments below follow those
definitions (Cardio Boxing → NPT is the least certain — it is also conditioning).

## Calendar (calendar-PDF, 3 phases)

| Wk | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| 1 | Push Strength | Plyometrix | Upper Body | Active Mobility | Lower Body | Cardio Boxing | Myofascial Release |
| 2 | Pull Strength | Cardio Boxing | Lower Body | Active Mobility | Upper Body | Plyometrix | Myofascial Release |
| 3 | Push Strength | Plyometrix | Upper Body | Active Mobility | Lower Body | Cardio Boxing | Myofascial Release |
| 4 | Speed and Agility | Active Mobility | Core Circuit | Active Flexibility | Cardio Boxing | Core Circuit | Myofascial Release |
| 5 | Full Body Strength | Accel/Decel | Pull Strength | Active Flexibility | Full Body Power | Speed and Agility | Myofascial Release |
| 6 | Full Body Power | Speed and Agility | Push Strength | Active Flexibility | Full Body Strength | Accel/Decel | Myofascial Release |
| 7 | Full Body Strength | Accel/Decel | Pull Strength | Active Flexibility | Full Body Power | Speed and Agility | Myofascial Release |
| 8 | Active Flexibility | Core Circuit | Cardio Boxing | Active Mobility | Core Circuit | Speed and Agility | Myofascial Release |
| 9 | Upper Body | Plyometrix | Push Strength | Active Flexibility | Lower Body | Cardio Boxing | Myofascial Release |
| 10 | Full Body Strength | Accel/Decel | Pull Strength | Active Mobility | Full Body Power | Speed and Agility | Myofascial Release |
| 11 | Lower Body | Cardio Boxing | Pull Strength | Active Flexibility | Upper Body | Plyometrix | Myofascial Release |
| 12 | Full Body Power | Speed and Agility | Push Strength | Active Mobility | Full Body Strength | Accel/Decel | Myofascial Release |
| 13 | Active Flexibility | Core Circuit | Cardio Boxing | Active Mobility | Core Circuit | Speed and Agility | *(blank)* |

- Week 6 Wednesday is **Push Strength** — the PDF text layer misplaces "Myofascial
  Release" beside it; the page image is unambiguous.
- Week 13 has six days → **90 days**. Recovery weeks: **4, 8, 13**. All 90 days
  are required (Myofascial Release counts like any workout; once a week per the
  video).
- Equipment: dumbbells (light / medium / heavy), adjustable bench, foam roller;
  optional pull-up bar, pull-up assist band, mat.

## Dumbbell Tracker (tracker-PDF) — what the app logs

| Workout | Block 1 | Block 2 | Finisher | Finisher rounds |
|---|---|---|---|---|
| Upper Body | Tempo Bench Press; Strict Arnie Press; Chest Fly; Skull Crusher | Narrow Supported Row; Prone Fly; Supinated Biceps Curl | Hammer Curls; Lateral Raises | 3 |
| Lower Body | Dual Front Squat; Bulgarian Split Squat (Right Side); Bulgarian Split Squat (Left Side) | Romanian Deadlift (RDL); Lateral Bench Step Downs (Right); Lateral Bench Step Downs (Left) | Alt Lateral Lunges; Suitcase Deadlift | 3 |
| Push Strength | Goblet Squat; Alternating Step Ups; Wide Stance Rotational Push | Sumo Squats; Incline Bench press; Curtsey Lunges; Push Press | Squat Thruster | **5** |
| Pull Strength | Dumbbell Clean; Hip Thrust on Bench; Upright Row | RDL; SA Row Right; SA Row Left; Pull Over | Skier Swing; Bent Over Reverse Flys | **5** |
| Core Circuit | Russian Twist; Tall Kneeling Alt Halo; Plank Pull Through | Half Kneeling Woodchop R/L; Butterfly Sit Up | — (none) | — |
| Full Body Strength | Squat Thruster; Chest Press to Leg Raise; 2 RDL to 2 Bent Over Row; Devil's Press | Heel Elevated Squat; Frontal to Lateral Raise | Renegade Row; Ground to Overhead | **5** |
| Full Body Power | Glute Swings R; Glute Swings L; Clean to Press R; Clean to Press L; SA Devil's Press R; SA Devil's Press L | Single Leg Squat to Bench | Heromaker | **5** |

Blocks 1 and 2 have 3 rounds. Each logged round is reps × weight (decision D9).

## 1. Push Strength

> Push Strength (41.3 min) — strength; heavy + medium dumbbells, bench (flat, then 45°). Pillar: MOT.

- Warm-up 00:20–03:45 (30 s each): squat-to-plank walkout, squat rotation reach, push-up hand-release, shoulder/toe tap,
  reverse lunge w/ rotation, cossack.
- Block 1: 4 moves × 3 rounds, 45 s on / 15 s off (stated 03:45).
  1. Goblet Squat (1 heavy DB) — r1 05:00, r2 08:50, r3 12:40  [tracker ✓]
  2. Narrow-to-Wide Push-Up (bodyweight; mod knees) — r1 05:55, r2 09:55, r3 13:58  [NOT in tracker — bodyweight]
  3. Alternating Step-Ups (heavy pair, bench) — r1 06:55, r2 10:55, r3 14:55  [tracker ✓]
  4. Wide-Stance Rotational Push (1 medium DB) — r1 07:47, r2 11:47, r3 15:45 (ends ~16:40)  [tracker ✓]
- Block 2 (bench 45° set 17:05): 4 moves × 3 rounds, 45/15.
  1. Sumo Squat (pair) — r1 18:20, r2 22:20, r3 26:20  [✓]
  2. Incline Bench Press (3 s down / 1 s up) — r1 19:15, r2 23:20, r3 27:20  [✓]
  3. Curtsy Lunge — r1 20:17, r2 24:15, r3 28:15  [✓]
  4. Push Press — r1 21:05, r2 25:05, r3 29:05 (ends ~30:15)  [✓]
- Finisher "multiples of two" (stated 30:27): 6-min AMRAP ladder — Squat Thruster ×N, Diamond Push-Up ×N, Bench Dip ×N,
  N = 2, 4, 6, 8, 10, … (start 31:40, end 37:45). Tracker: Squat Thruster × 5 weight rounds ⇒ rounds = ladder rungs.
  Diamond push-ups + bench dips bodyweight, not in tracker.
- Cool-down 38:05–41:12.

## 2. Pull Strength

> Pull Strength (43.9 min) — strength; three dumbbell sets plus one single heavy DB (40 lb shown), pull-up bar, bench (flat; 45° in finisher). Pillar: MOT (inferred from format). Basis: 45/15 strength blocks plus ladder game; closing narration calls it a classic strength workout.

- Warm-up 00:00–03:55 (30 s each): inchworm, plank scap retractions, superman, quadruped thread/opener R/L, crab reach, good morning.
- Block 1: 4 moves × 3 rounds, 45 s on / 15 s off (stated 03:55).
  1. Pull-Up, overhand (mods: assist strap + box; no bar = bent-over row) — r1 05:55, r2 09:45, r3 14:05  [NOT in tracker — bodyweight]
  2. Dumbbell Clean (heavy pair, high hang, quarter-squat catch) — r1 06:55, r2 11:05, r3 15:00  [tracker ✓]
  3. Hip Thrust on Bench (DBs on hips; mod one heavy DB) — r1 08:00, r2 11:55, r3 15:50  [tracker ✓]
  4. Upright Row — r1 09:00, r2 12:55, r3 16:50 (ends ~17:45)  [tracker ✓]
- Block 2: 4 moves × 3 rounds, 45/15 (explained 18:03).
  1. Romanian Deadlift (heavy pair) — r1 19:45, r2 23:40, r3 27:35  [tracker ✓ "RDL"]
  2. Single-Arm Row — Right (one heavy DB; left hand + knee on bench, right arm works) — r1 20:40, r2 24:40, r3 28:55  [tracker ✓ "SA Row Right"]
  3. Single-Arm Row — Left — r1 21:40, r2 25:55, r3 29:50  [tracker ✓ "SA Row Left"]
  4. Pull-Over (one heavy DB, triangle grip, on bench) — r1 22:50, r2 26:50, r3 30:45 (ends ~31:30)  [tracker ✓ "Pull Over"]
- Finisher: "multiples of two" ladder, 6-min cap (stated 31:41). Each rung: Chin-Ups ×N (underhand; assist; no bar = narrow row on 45° bench), Skier Swing ×N (medium–heavy pair), Chest-Supported Reverse Fly ×N (face down on 45° bench, neutral grip, 15 lb); N = 2, 4, 6, 8, 10 …; goal = double figures. Rung starts: 2 at 33:45, 4 at 34:30, 6 at 35:20, 8 at 36:10, 10 at 38:40; cap ~40:00. Demo team reached the 10 rung = 5 rungs.
  [Skier Swing tracker ✓; reverse fly tracker ✓ — name differs: tracker says "Bent Over Reverse Flys"; narration also calls them bent-over flies but demo is chest-supported on bench; chin-ups NOT in tracker — bodyweight]
- Cool-down 40:15–43:50: wrist/forearm + chest-opener stretches, child's-pose thread-the-needle L/R, cat-cow, sphinx, plank to pedaling down-dog, hang and roll up.

## 3. Upper Body

> Upper Body (46.5 min) — strength; moderate–heavy dumbbell pairs (heavy 30 lb, medium 25 lb, light 15 lb shown), bench (flat, then 45°, flat for finisher), pull-up bar (assist strap + box). Pillar: MOT (inferred from format). Basis: 45/15 strength blocks plus a metabolic EMOM, same shape as Push Strength.

- Warm-up 00:00–03:40: arm circles, chest swings, walkout + shoulder taps, pike toe touches, prone I-Y-W, hand-release push-up to side plank, lateral beast.
- Block 1 (push, flat bench): 4 moves × 3 rounds, 45 s on / 15 s off (stated 03:40). Round 3 = "X round".
  1. Tempo Bench Press (heavy pair, 3 s lowering) — r1 05:35, r2 09:30, r3 13:25  [tracker ✓ "Tempo Bench Press"]
  2. Arnie Press (heavy pair, seated at end of bench, rotate out and up) — r1 06:30, r2 10:20, r3 14:20  [tracker ✓ "Strict Arnie Press"]
  3. Chest Fly (medium pair, flat bench) — r1 07:15, r2 11:10, r3 15:05  [tracker ✓]
  4. Skull Crusher (flat bench) — r1 08:35, r2 12:30, r3 16:30 (ends ~17:20)  [tracker ✓]
- Block 2 (pull, bench to 45°, set 17:20): 4 moves × 3 rounds, 45/15 (stated 19:00).
  1. Wide-Grip Pull-Up (mods: assist strap + box; no bar = Pull-Over with one heavy DB on bench) — r1 19:25, r2 23:15, r3 27:30  [NOT in tracker — bodyweight]
  2. Chest-Supported Row (heavy pair, face down on 45° bench, elbows tight) — r1 20:30, r2 24:25, r3 28:30  [tracker ✓ "Narrow Supported Row"]
  3. Prone Fly (light/medium pair, same position) — r1 21:20, r2 25:10, r3 29:20  [tracker ✓]
  4. Supinated Biceps Curl (standing) — r1 22:15, r2 26:10, r3 30:05 (ends ~31:15)  [tracker ✓]
- Finisher: EMOM 9 min = 3 challenges × 3 rounds; each minute 50 s to hit the reps, 10 s transition (stated 31:20).
  A. 12 Push-Ups (mod knees) + 12 Hammer Curls (medium) — 33:55, 37:05, 39:45  [push-ups NOT in tracker — bodyweight; Hammer Curls tracker ✓]
  B. 12 Bench Dips + 12 Lateral Raises (15 lb) — 34:55, 37:55, 40:50  [dips NOT in tracker — bodyweight; Lateral Raises tracker ✓]
  C. Burpee Pull-Ups 6 / 8 / 10 by level (beginner / intermediate / advanced); no bar = burpees 12 / 14 / 16 — 35:50, 38:50, 42:05; last minute runs the full 60 s, plank if done early  [NOT in tracker — bodyweight]
  Narration advises adding reps next time (e.g. 12 to 14).
- Cool-down 42:55–46:30: overhead side reach, cross-body arm, scorpion, child's pose lat walk L/R, cat-cow.

## 4. Lower Body

> Lower Body (46.3 min) — strength; three dumbbell pairs (20/25/30 lb shown), bench. Pillar: MOT (inferred from format). Basis: 45/15 strength blocks with plyo "sprinkles" plus an EMOM.

- Warm-up 00:00–03:15: world's greatest stretch L/R, squat + forward lunge with overhead reach, good morning, reverse lunge with rotation, alternating side lunge.
- Block 1: 4 moves × 3 rounds, 45 s on / 15 s off (stated 03:15).
  1. Dual Front-Rack Squat (two DBs; mod one DB goblet) — r1 04:58, r2 08:50, r3 12:45  [tracker ✓ "Dual Front Squat"]
  2. Bulgarian Split Squat, first side (rear foot on bench; right leg front/working per cue at 14:07; mod one DB) — r1 05:50, r2 09:55, r3 14:00  [tracker ✓ "(Right Side)"]
  3. Bulgarian Split Squat, second side (left leg working, cue 11:01) — r1 07:05, r2 11:00, r3 14:55  [tracker ✓ "(Left Side)"]
  4. Jump Squat variation (choice of 180 squat jump / plain squat jump / pop squat) — r1 08:05, r2 11:55, r3 15:50 (ends ~16:45)  [NOT in tracker — bodyweight]
- Block 2 (posterior): 4 moves × 3 rounds, 45/15 (explained 17:11).
  1. Romanian Deadlift (heavy pair) — r1 18:55, r2 22:50, r3 26:55  [tracker ✓ "Romanian Deadlift (RDL)"]
  2. Lateral Bench Step-Down, first side (stand side-on on bench; right leg floats, left leg works; lighter pair) — r1 19:50, r2 23:45, r3 27:55  [tracker ✓ name; (AMBIGUOUS: tracker lists "Right" first; video first side = right leg floats / left leg works, so unclear whether tracker "Right" means floating or working leg)]
  3. Lateral Bench Step-Down, second side (left leg floats, right leg works) — r1 20:55, r2 24:58, r3 28:58  [tracker ✓ "(Left)" — see ambiguity above]
  4. Skater to Broad Jump (skate R, skate L, broad jump, backpedal) — r1 21:55, r2 25:55, r3 29:50 (ends ~30:35)  [NOT in tracker — bodyweight]
- Finisher: EMOM 9 min = 3 challenges × 3 rounds, 50 s to hit reps, 10 s transition; final minute runs full 60 s (stated 30:45). Rep targets are by level.
  A. Alternating Lateral Lunges (medium pair) 8 / 10 / 12 — 32:50, 35:55, 39:00  [tracker ✓ "Alt Lateral Lunges"]
  B. Suitcase Deadlift (heavier pair) 14 / 16 / 18 — 33:50, 36:45, 39:55  [tracker ✓]
  C. Gorilla Burpees (2 jump lunges + 1 burpee = 1 rep; mod stepped lunges) 8 / 10 / 12 — 34:45, 37:40, 40:50 (ends ~41:55)  [NOT in tracker — bodyweight]
- Cool-down 42:15–46:15: belly/heart breathing, standing quad R/L, pigeon R/L, supine figure-four R/L, pedaling down-dog, roll up.

## 5. Full Body Strength

> Full Body Strength (46.4 min) — strength; dumbbells (medium pair 25 lb, heavier 30 lb, light 15 lb), pull-up bar, bench. Pillar: MOT (inferred from format). Basis: 45/15 strength blocks plus buy-in/cash-out AMRAP.

- Warm-up 00:00–03:40, layered mobility flow (~30 s per added move): high plank to down dog, + up dog, + loaded beast, + world's greatest stretch R/L (60 s free flow).
- Block 1 (lower move paired with upper move): 4 moves × 3 rounds, 45 s on / 15 s off (stated 03:40).
  1. Squat Thruster (medium pair; mod one DB) — r1 05:35, r2 09:30, r3 13:25  [tracker ✓]
  2. Chest Press to Leg Raise (flat bench; mod knees bent / tabletop hold) — r1 06:25, r2 10:40, r3 14:45  [tracker ✓]
  3. 2 RDL + 2 Bent-Over Row (repeat) — r1 07:30, r2 11:40, r3 15:40  [tracker ✓ "2 RDL to 2 Bent Over Row"]
  4. Devil's Press (pair; mod high-plank step) — r1 08:40, r2 12:30, r3 16:40 (ends ~17:15)  [tracker ✓]
- Block 2 (tempo theme): 4 moves × 3 rounds, 45/15 (explained 17:15).
  1. Negative Pull-Up (jump up, ~5 s lowering; no bar = pull-over with heavy DB) — r1 19:45, r2 23:40, r3 27:55  [NOT in tracker — bodyweight]
  2. Tempo Push-Up (3 s or 5 s lowering; mod knees) — r1 20:35, r2 24:55, r3 28:55  [NOT in tracker — bodyweight]
  3. Heel-Elevated Squat (heels on medium DBs or bench edge, holding heavies) — r1 21:55, r2 25:45, r3 29:45  [tracker ✓ "Heel Elevated Squat"]
  4. Frontal to Lateral Raise, alternating one lateral / one frontal (15 lb; r3 adds pause at top) — r1 22:50, r2 26:45, r3 30:50 (ends ~31:50)  [tracker ✓ "Frontal to Lateral Raise" — spoken name matches; demo starts with the lateral]
- Finisher: buy-in / cash-out (stated 31:57).
  Buy-in 90 s bodyweight AMRAP: 5 Squats (prayer hands) + 5 Hand-Release Push-Ups + 5 Froggers; log rounds — 34:15–35:45.
  Then 3 weighted moves × 30 s, 3 rounds, no recovery (one moderate pair):
  1. Renegade Row — r1 35:45, r2 37:10, r3 38:45  [tracker ✓]
  2. Ground to Overhead — r1 36:10, r2 37:40, r3 39:15  [tracker ✓]
  3. X Sit-Up (from tuck "cherry bomb" to X) — r1 36:45, r2 38:15, r3 39:50  [NOT in tracker — bodyweight]
  Cash-out = same 90 s AMRAP as buy-in, 40:10–41:45; aim to match buy-in rounds (demo did 3).  [squat / hand-release push-up / frogger NOT in tracker — bodyweight]
- Cool-down 41:45–46:20: belly/heart breathing, deep squat with elbows rocking, seated one-leg-bent hamstring R/L, side-lying quad R/L, knee hug, supine twist with arm "rainbow" R/L, rock to stand.

## 6. Full Body Power

> Full Body Power (48.3 min) — strength; one heavy single DB (25–30 lb shown) + moderate and heavy pairs, light DB for single-leg squat, pull-up bar, bench. Pillar: MOT (inferred from format). Basis: power/strength clusters plus EMOM; narration calls it one of the harder workouts and distinct from the other programs.

- Warm-up 00:00–03:40: plank cross-body toe touch, world's greatest stretch R/L, overhead squat, good morning, reverse lunge with rotation, cossack.
- Block 1 = 3 "clusters" (stated 03:40): each cluster = 30 s right + 30 s left + 30 s core, no rest between, then ~30 s recovery; 3 rounds of each cluster before moving to the next.
  Cluster 1:
  1. Glute Swing — Right (one DB, swing through the legs) — r1 06:25, r2 08:15, r3 10:20  [tracker ✓ "Glute Swings R"]
  2. Glute Swing — Left — r1 06:55, r2 08:50, r3 10:55  [tracker ✓ "Glute Swings L"]
  3. Hollow Hold (mod hands forward) — r1 07:25, r2 09:25, r3 11:15 (ends ~11:50)  [NOT in tracker — bodyweight]
  Cluster 2:
  4. Clean to Press — Right (one heavy DB, high hang) — r1 12:30, r2 14:25, r3 16:25  [tracker ✓]
  5. Clean to Press — Left — r1 12:55, r2 14:55, r3 16:55  [tracker ✓]
  6. Low Plank Reach — r1 13:20, r2 15:25, r3 17:25 (ends ~17:55)  [NOT in tracker — bodyweight]
  Cluster 3:
  7. Single-Arm Devil's Press — Right (mod sprawl / kick-out to high plank) — r1 18:30, r2 20:25, r3 22:25  [tracker ✓ "SA Devil's Press R"]
  8. Single-Arm Devil's Press — Left — r1 18:55, r2 20:55, r3 22:55  [tracker ✓ "SA Devil's Press L"]
  9. Unilateral V-Sit (hand to opposite foot, alternating) — r1 19:25, r2 21:30, r3 23:25 (ends ~23:55)  [NOT in tracker — bodyweight]
- Block 2: 10-min strength accumulator (stated 24:08). 3 moves, start at 5 reps, +1 rep each lap: Chin-Ups (underhand; assist; no bar = supinated bent-over row) → Decline Push-Up (feet on bench; mod regular push-up) → Single-Leg Squat to Bench (goblet, light DB; N each leg). Start 25:45, end ~36:00; demo team reached 10 (laps 5 to 10 = 6 laps).
  [Single Leg Squat to Bench tracker ✓; chin-ups + decline push-ups NOT in tracker — bodyweight]
- Finisher: EMOM 6 min = 2 alternating minutes × 3 rounds (stated 36:00).
  A. Heromaker (push-up, renegade row each side, jump feet in, squat thruster = 1 rep): 4 / 5 / 6 reps by level (beginner / intermediate / advanced), stop at 50 s — 37:50, 39:55, 41:40  [tracker ✓ "Heromaker"]
  B. Box Jumps onto bench, 45 s for time, 15 s rest (mod step-ups) — 38:40, 40:50, 42:55 (ends ~43:50)  [NOT in tracker — bodyweight]
- Cool-down 43:55–48:20: bench pigeon R/L, half-kneeling hip flexor + side reach R/L, side-lying adductor rock, puppy stretch, wide-leg forward fold.

## 7. Plyometrix

> Plyometrix (40.8 min) — completion-style (bodyweight; bench as box). Pillar: NPT

- Warm-up 00:30–03:24: ~30 s per move: squat to tiptoe reach 00:46; lateral lunges 01:06; air jump rope 01:44;
  single-leg hip bridge R (hop from halfway) 02:12; single-leg hip bridge L (+bounce) 02:49.
- Block 1 "bilateral": 4 moves × 3 rounds, 30 s on / 30 s off (stated 03:25). Round 3 = "X round".
  1. Squat Jump (mod: calf raise) — r1 04:52, r2 08:27, r3 12:27
  2. Box Jump onto bench (mod: step-up) — r1 05:22, r2 09:26, r3 13:29
  3. Broad Jump 180 (mod: duck waddle + turn) — r1 06:27, r2 10:27, r3 14:27
  4. 4 Criss-Cross + 2 Tuck Jumps (mod: rocket jump) — r1 07:26, r2 11:49, r3 15:28 (ends ~16:24)
- Block 2 "unilateral": 4 intervals × 3 rounds, 30 s on / 30 s off (stated 16:44).
  1. Jump Lunge (mod: reverse lunge) — r1 17:57, r2 21:32, r3 25:46
  2. Bulgarian Plyo — Right (rear foot on bench; mod: Bulgarian split squat, no jump) — r1 18:35, r2 22:34, r3 26:36
  3. Bulgarian Plyo — Left — r1 19:48, r2 23:30, r3 27:35
  4. Single-Leg Bound in a Box (fwd/side/back, switch legs) — r1 20:42, r2 24:33, r3 28:37 (ends ~29:35)
- Finisher: 4 moves × 60 s, 1 round ("one and done"), ~30 s between (stated 29:37).
  1. Burpee Ski Jumps (L/R alternating) — 31:11
  2. 4 Mountain Climbers + 2 Heel Kicks — 32:45
  3. Broad Jump to Bear Crawl back — 34:12
  4. 4 Jump Lunges + 4 Power Jacks — 35:45 (ends 36:45)
- Cool-down 36:51–40:34: standing side lean, quad stretch, butterfly, figure-four glute, seated twist L/R.

## 8. Speed and Agility

> Speed and Agility (39.1 min) — completion-style (bodyweight + bench). Pillar: NPT. Narration groups it
> with Accel/Decel and Plyometrix as one category (38:46).

- Warm-up 00:36–03:45: squat trio (overhead / zombie / suitcase squat) 00:36; shin grab / cossack L 01:10, R 01:40;
  lateral high knees R/L 02:10; pop squat 02:43; fast feet 03:15.
- Block 1: 4 moves × 3 rounds, 40 s on / 20 s off (stated 03:45).
  1. Fast Feet reaction drill (L/R/up/down; down = high plank) — r1 04:55, r2 09:17, r3 13:06
  2. Lateral Shuffle & Touch (r3 adds turn/kick-out) — r1 06:00, r2 09:51, r3 13:40
  3. Sprinter's Lunge (hop/knee drive) — 20 s Right + 20 s Left in one interval — r1 07:06, r2 10:59, r3 15:16
  4. Ice Skaters — r1 08:12, r2 12:01, r3 15:47 (ends ~16:52)
- Block 2 (bench): 4 moves × 3 rounds, 40 s on / 20 s off (stated 16:52).
  1. Bench Toe Touches (mod: tap under bench) — r1 19:00, r2 22:48, r3 27:06
  2. Bench Reaction Drill (around bench L/R on cue) — r1 20:04, r2 23:54, r3 28:08
  3. Bench Hop-Overs (hands on bench; mod: back-end hops) — r1 21:08, r2 25:01, r3 28:46
  4. Plyo Push-Ups on bench (mod: regular push-ups) — r1 22:11, r2 26:03, r3 29:58 (ends ~30:32)
- Finisher: Tabata — 20 s on / 10 s off × 8 intervals = 2 moves alternating × 4 (stated 30:59).
  A. Squat Jump to Lateral Lunge — 32:05, 33:07, 34:08, 35:20(approx)
  B. Squat-position hand-release / in-out (down the middle; "squat jump-out") — 32:36, 33:38, 34:46, 35:34
  (B naming AMBIGUOUS from audio — verify on frames ~32:36.)
- Cool-down 36:04–38:46: standing figure-four (chair) L/R, quad stretch, rounded-back/chest opener, forward fold.


## 9. Accel/Decel

> Accel/Decel (40.7 min) — completion; bench + bodyweight. Pillar: NPT (inferred from format). Basis: athletic acceleration/deceleration drills; earlier Speed and Agility narration groups Accel/Decel with Plyometrix and Speed and Agility as one category.

- Warm-up 00:00–02:35: world's greatest stretch L then R, high plank to wide-leg toe touch, beast kick-through.
- Block 1 (accelerate/decelerate): 4 moves × 3 rounds, 40 s on / 20 s off (stated 02:35).
  1. Ladder Feet (in-in-out-out on imaginary ladder; later travel fwd/back) — r1 04:05, r2 08:10, r3 12:15
  2. Heisman (3 quick steps across + knee drive, stick) — r1 05:15, r2 09:25, r3 13:20
  3. 4 Single-Leg Pogos + stick, switch legs (double-leg option) — r1 06:20, r2 10:20, r3 14:20
  4. 4 Squat Jacks to Surrender (hands on temple, kneel down and step back up) — r1 07:15, r2 11:15, r3 15:05 (ends ~15:55)
- Block 2 ("control the stop", bench): 4 moves × 3 rounds, 40/20 (explained 15:55).
  1. Dead Stop off Bench (step/leap off flat part, stick a quiet landing; mod step forward from floor) — r1 17:20, r2 21:30, r3 25:45
  2. Forward Lunge to Knee Drive (knee taps hand) — Right — r1 18:30, r2 22:40, r3 26:40
  3. Forward Lunge to Knee Drive — Left — r1 19:40, r2 23:35, r3 27:35
  4. Traveling Beast (fast forward, slow back, flat back) — r1 20:30, r2 24:35, r3 28:50 (ends ~29:15)
- Finisher: "10-8-6-4-2" descending ladder, 5-min cap; plank if finished early (stated 29:42). Each rung, 4 moves × N: Double Hop to Lunge Split (turn each rep), Crab Walk (fast out, slow back), Squat Switchblade, Box Jump onto bench. Start 31:40, end ~36:45; demo team completed the 2 rung at the buzzer. Narration: the ending rung is the score to beat next time.
- Cool-down 36:50–40:40: bench pigeon R/L, half-kneeling hip flexor with side reach R/L, lying/reclined quad stretch, wide straddle, shoulder rolls, self-hug.
- No tracker (completion workout).

## 10. Cardio Boxing

> Cardio Boxing (43.0 min) — completion; bodyweight, no equipment, needs floor space. Pillar: MOT (inferred from format). Basis: the rounds are cardio conditioning, but the workout also teaches footwork and punch skill; audio names no pillar.

- Technique warm-up 00:00–07:05: stance setup; footwork fwd/back 00:50, + left/right 01:15; slips 01:50; rolls 02:25; stance reset 02:50; six punches ~30 s each — jab 03:20, cross 04:00, lead hook 04:30, back hook 05:00, lead uppercut 05:30, back uppercut 05:55; all six combined 06:20.
- Cardio block (non-stop, ~25–30 s each, 07:05–12:10): high knees 07:05, jumping jacks 07:40, lateral shuffle 08:00, heel kicks 08:45, pop squat 09:05, push-ups 09:40, mountain climbers 10:05, low plank 10:35, military plank (up-downs) 11:05, plank jacks 11:35.
- Main block: 5 rounds × 3 min, ~1 min "corner" between rounds (stated 12:10). Each round = 45 s combo, 15 s rest, 45 s cardio move, 15 s rest, 60 s combo + cardio blended.
  1. Jab–Cross–Lead Hook / Squat Jump 180 (mod pop squat) — combo 12:55, cardio 13:55, blend 14:50 (2 jumps per combo)
  2. Cross–Lead Uppercut–Cross / Narrow-to-Wide Push-Up (jump or step) — 17:05, 18:05, 19:15
  3. Jab–Jab–Cross–Roll–Back Hook / Double Taps (imaginary skipping rope; mod single tap) — 21:00, 22:00, 23:00 (4 taps per combo)
  4. Jab–Cross–Slip–Cross–Hook / Plank Jump In-Out (mod step) — 25:15, 26:10, 27:05 (4 in-outs per combo)
  5. Hook–Hook–Uppercut–Uppercut / Burpee Tuck Jump (mod no jump) — 29:15, 30:10, 31:05 (ends ~32:20)
- Finisher: 6 min = 6 × 60 s, each 20 s punching (active recovery) + 40 s cardio move (stated 32:30): 1-2 punches then Squat Jump 180 (33:20 / 34:05); hooks then narrow-to-wide push-ups (34:50 / 35:00); uppercuts then double taps (35:45 / 35:55); all-six/free punches then plank in-out (36:35 / 36:55); freestyle punching then burpee tuck jump (37:40 / 38:00); ends ~38:50.
- Cool-down 39:25–43:00: chest opener (hands behind back), standing quad R/L, supine hamstring R/L, figure-four glute R/L, thread-the-needle, cat-cow.
- No tracker (completion workout).

## 11. Active Mobility

> Active Mobility — completion-style; bodyweight, mat optional. ART.

- Test (6 moves × 6 reps) 00:53: overhead squat · 3-way lunge (fwd/side/reverse) R/L 01:21 · good morning 02:00 ·
  push-up 02:30 · superman angels (W→I) 02:53 · Russian twist reach 03:20.
- Flow (~30 s per move, sides): supine — bridge 04:20, single-leg bridge R/L 04:50/05:10, windshield wipers 05:49,
  tabletop spinal twist 06:34, rainbow (open book) L/R 06:55/07:35, dead bug 07:55; side-lying — hip circles + leg sweep
  R 08:46 / L 09:45; prone — superman 10:52, swimmers 11:32, scorpion 12:16; child's pose thread-the-needle 12:59;
  quadruped — cat-cow 13:42, bird-dog sweeps R/L 14:22/14:45, adductor rock R/L 15:03/15:50, wrist stretches 16:26;
  seated — 90/90 reach R/L 17:08/18:10; kneeling camel 18:30; toe/foot stretch 19:56; half-kneeling — hip flexor→hamstring
  R 20:36, runner's lunge 21:21, lizard + quad reach 22:01; left side 22:43–24:47; deep squat rock 24:47; forward fold
  w/ T-spine reach 25:34; free flow 26:30; shoulder rolls + arm stretches R/L 27:00–28:40.
- Retest (same 6 × 6) 28:40–33:00.

## 12. Active Flexibility

> Active Flexibility (39.8 min). Foam roller as prop; static end-range stretches 30–40 s each. ART.

Sequence (~30–40 s holds, sides): standing roller overhead side reach R/L 00:28–02:00 · overhead shoulder stretch w/ roller
behind back (both grips) 02:04–03:30 · wide-stance twist reach L/R 03:30–05:00 · plank on roller 05:00 · plank↔down-dog
06:12 (beast→down-dog option 06:40) · RIGHT: runner's lunge rock 07:16, world's greatest stretch hold 08:17, kneeling quad
09:17, hamstring (half-split) 09:50, triangle 10:19 · plank reset 11:20 · LEFT: lunge rock 12:20, WGS 12:50, quad 13:30,
hamstring 14:28, triangle 15:00 · plank 15:50 · child's pose on roller 16:39 · puppy pose 17:20 · thread-the-needle w/
roller R/L 17:50/18:44 · cat-cow 19:48 · prone cobra w/ roller 20:30 · scorpion-style chest opener R/L 21:30/22:30 ·
neck stretch (roller under neck) R/L 23:03/24:06 · upper-back extension over roller (2 heights) 24:40/25:40 · supported
hip-flexor (roller under sacrum) R/L 26:16/27:50 · butterfly 28:33 · 90/90 + abduction/adduction lifts R 29:36 / L 31:41 ·
seated hamstring R/L 34:00 · straddle-roller lean-back 35:48 · foot dorsiflexion on roller 37:01 · toe-tuck sit 38:16
(ends ~39:30). Narration: once a week in program; 2–3×/week optional.

## 13. Myofascial Release

> Myofascial Release — completion-style; foam roller + small ball. ~60 s/move, 1 pass.

Foot ball-roll R 00:56 · L 01:50 · Calf R 02:58 · Hamstring R 03:57 · Glute R 05:12 · IT band R 06:13 · Calf L 07:20 ·
Hamstring L 08:28 · Glute L 09:21 · IT band L 10:30 · Quad R 11:30 · Adductor R 12:33 · Quad L 13:37 · Adductor L 14:44 ·
Lower back 15:29 · Upper back 16:32 · Spinal extension over roller 17:40 · Lat L 18:14 · Lat R 19:30 · Child's pose roll 20:43 ·
Puppy pose forearm roll 21:15 · Arm R (wrist→shoulder) 22:03 · Arm L 22:54 (ends ~24:05)

## 14. Core Circuit

> Core Circuit — strength (dumbbell); **tracker-PDF only** (no video). Pillar: MOT.
> No Play timeline (E34) unless a video turns up.

- Block 1 (3 rounds): Russian Twist; Tall Kneeling Alt Halo; Plank Pull Through.
- Block 2 (3 rounds): Half Kneeling Woodchop R/L; Butterfly Sit Up.
- No finisher on the tracker; work/rest timing unknown.

## 15. Bonus 5-minute workouts ("fivers")

Optional post-workout add-ons, attachable to any day; logged done / not done and
never counted toward adherence.

### Bonus 5-Min Abs (5.2 min) — 1 medium dumbbell (bodyweight option). 8 moves × 30 s, non-stop, 1 round (stated 00:31).
1 Low Plank hold 00:46 · 2 Russian Twist (DB) 01:19 · 3 Side Plank R (on right elbow) 01:50 · 4 Butterfly Sit-Up (DB) 02:16 ·
5 Side Plank L 02:50 · 6 Jackknife (DB) 03:19 · 7 Hollow Hold 03:52 · 8 Plank Pull-Through (DB) 04:19 (ends ~04:58)
### Bonus 5-Min Arms (6.0 min) — mod–heavy dumbbells + bench. 4 moves × 40 s, 20 s transition, 1 round (stated 00:26).
1 Skull Crusher (flat bench) 02:01 · 2 Iso-Hold Alternating Biceps Curl (hold at 90°) 03:02 · 3 Bench Dip (no DB) 04:02 ·
4 Cross-Body Hammer Curl 05:01 (ends ~05:45)
### Bonus 5-Min Classic Push-Pull (5.8 min) — pull-up bar. Ladder game: 2 moves (Pull-Up + Push-Up).
Ascend 1+1, 2+2, … for 2 min (01:19–03:22), then descend from reached number for 2 min (03:22–05:22);
if back down before time, hold plank of choice. Mods: chin-ups, pull-up assist.
### Bonus 5-Min Glutes (5.4 min) — medium–heavy dumbbells + bench. 4 intervals × ~40 s, 20 s recover, 1 round.
1 RDL 01:23 · 2 Single-Leg Hip Thrust on bench (DB on working leg) — Left 02:25 · 3 — Right 03:21 · 4 Skier Swing 04:22 (ends ~05:05)
(Narration says "four big bang movements … appear in Lower Body and Pull Strength".)
### Bonus 5-Min Shoulders ("Boulder Shoulders", 5.9 min) — heavy + medium dumbbells, bench at 45°. 4 moves × 40 s, 20 s recover.
1 Arnie Press (seated, heavy) 01:53 · 2 Lateral-to-Frontal Raise (medium) 02:56 · 3 Upright Row (heavy) 03:57 · 4 Prone Fly (incline bench, medium) 04:55 (ends ~05:41)

## Video vs tracker — differences (app follows the tracker)

- **Upper Body**: B1 4/4 match, same order. B2: video has Wide-Grip Pull-Up as move 1 (not in tracker); the other 3 match in order. Finisher: 3 rounds = tracker 3 ✓; video also has Push-Ups, Bench Dips, Burpee Pull-Ups (not in tracker).
- **Lower Body**: B1: video has a 4th move, Jump Squat variation (not in tracker); first 3 match in order. B2: video has a 4th move, Skater to Broad Jump (not in tracker); first 3 match in order. Step-down Right/Left labelling ambiguous (video side 1 = right leg floats, left leg works). Finisher: 3 rounds = tracker 3 ✓; Gorilla Burpees not in tracker.
- **Pull Strength**: B1: video starts with Pull-Up (not in tracker); other 3 match in order. B2 4/4 match, same order. Finisher: tracker 5 rounds vs video open-ended ladder (2, 4, 6, 8, 10 … in 6 min; demo reached 5 rungs); Chin-Ups not in tracker; reverse fly done chest-supported vs tracker "Bent Over Reverse Flys".
- **Full Body Strength**: B1 4/4 match, same order. B2: video has Negative Pull-Up + Tempo Push-Up as moves 1–2 (not in tracker); Heel Elevated Squat + Frontal to Lateral Raise match as moves 3–4. Finisher: **tracker 5 rounds vs video 3 rounds** of Renegade Row / Ground to Overhead; video adds X Sit-Up plus a bodyweight buy-in/cash-out AMRAP (squat, hand-release push-up, frogger), none in tracker.
- **Full Body Power**: B1 = 3 clusters; tracker's 6 R/L moves match in order; cluster core moves (Hollow Hold, Low Plank Reach, Unilateral V-Sit) not in tracker. B2 is a 10-min +1-rep accumulator (5 to ~10 reps), not fixed rounds; Chin-Ups + Decline Push-Up not in tracker. Finisher: **tracker 5 rounds vs video 3 EMOM rounds** of Heromaker; Box Jumps not in tracker.
- **Cardio Boxing / Accel-Decel**: no tracker; nothing to compare.

**App rule (E33):** the catalog logs exactly the tracker's exercises and round
counts; bodyweight moves and finisher formats (ladders, EMOMs, accumulators) are
performed with the video and logged only as part of the workout. The open
questions below are listed in the E33 PR for the owner to confirm.

## Open questions

1. Full Body Strength and Full Body Power finishers: tracker shows 5 rounds, the
   videos run 3. The app keeps 5 (unused rounds simply stay empty).
2. Lower Body step-downs: does tracker "(Right)" mean the working or the floating leg?
   The app keeps the tracker's order.
3. Should the tracker-absent bodyweight moves (pull-ups, push-ups…) get rep logging?
