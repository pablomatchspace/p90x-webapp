# FFMI scale and factorial TDEE — sources and validation (E40)

The oracle for E40. Where this differs from the P90Xcel workbook the deviation is intentional
and listed in §4. Evidence tiers as in `ffmi-feasibility.md` (A = consensus / large cohort,
B = practitioner or secondary-source figure). **Not medical or dietetic advice.**

## 1. FFMI

### 1.1 Normalization — kept (owner decision, E40 Q1)

`FFMI = lean / h² + 6.1 × (1.8 − h)` — Kouri et al. 1995 (*Clin J Sport Med* 5:223–228), reference
height **1.80 m**. The normalization only adds a per-height constant, so moving the reference to
1.65 m would subtract `6.1 × 0.15 ≈ 0.92` from every value and invalidate every band and ceiling
below, none of which has been published for a 1.65 m reference. Rejected; the number users track
and the E14/E20 targets stay on one scale. (Some sources print 6.3 instead of 6.1; the workbook
and E14 Q10 use 6.1.)

### 1.2 Reference scale (replaces the workbook categories)

Bands on the normalized scale, lower edge inclusive:

| Edge | Band that starts here | Anchor | Tier |
|---|---|---|---|
| — | Low | — | — |
| 17 | Below average | ESPEN 2015 consensus (Cederholm et al., *Clin Nutr*): low FFMI is < 17 in men (< 15 in women) | A |
| 19 | Above average | Adult male median ≈ 19: Schutz, Kyle & Pichard 2002 (n = 5 635, BIA vs DXA) median 18.9 for men 18–34; NHANES III BIA ≈ 19.2 | A / B |
| 21 | Athletic | ≈ 90th percentile of adult men: NHANES III 90th pct ≈ 21.4; Italian DXA 20–80 y IQR ≈ 18.7–21.0 | B |
| 25 | Above the usual natural range | Kouri 1995: drug-free lifters reached 25.0; steroid users exceeded it. Caveat: a 2023 study of collegiate football players exceeded 25 — it is a typical limit, not proof of enhancement, hence the neutral wording | A− |

Limits that the UI states: anchors come from **men**; Schutz's female median is 15.4, about 3.5 below
men's, so for women the scale additionally marks the app's existing **23.9** natural ceiling
(`FFMI_CEILING.female`, ffmi-feasibility §3) and claims nothing more. Population tables use *raw*
FFMI; at 1.80 m raw = normalized, elsewhere the offset is about 0.06 per cm (≈ 0.3 for ±5 cm).

Verification status: ESPEN, Kouri and Schutz were checked against abstracts/summaries; the
NHANES III percentile figures and the Italian DXA quartiles come from secondary sources
(ffmipro.com, ScienceDirect abstract) and should be re-checked against the primary tables when
they can be reached.

## 2. TDEE — factorial model (owner decision, E40 Q4)

```
BMR   = Katch–McArdle                           lean mass known   (owner decision, E40 B02)
      = Mifflin–St Jeor                         otherwise
TDEE  = BMR × 1.4  +  average exercise energy
```

* **Katch–McArdle** `370 + 21.6 × lean` — keyed off lean mass, which the app already tracks (owner
  decision at B02; the original E40 release used the mean of Katch–McArdle and Cunningham). It is the
  lower of the two lean-mass equations. **Cunningham** `500 + 22 × lean` (Cunningham 1980) is shown as a
  cross-check: in athletes it had the smallest bias in a 50-athlete comparison (−165 kcal vs −22 mean for others) and was among the equations whose mean did not
  differ from measured RMR in the 2023 meta-analysis (29 studies, 1 430 participants), so for a trained
  user it reads about 150 kcal higher and Katch–McArdle may under-state BMR slightly. Individual error is
  ±200–300 kcal (limits of agreement) either way, hence the range in §2.3. Mifflin–St Jeor is the
  no-body-fat fallback and the second cross-check.
* **Daily-life factor 1.4** (range 1.3–1.5): the lower edge of the FAO/WHO/UNU 2004 "sedentary or light
  activity lifestyle" band (PAL 1.40–1.69), which already contains digestion. Exercise is added
  separately, so the old 1.55 "moderately active" multiplier — which bundled lifestyle *and* a typical
  3–5 workouts/week — is gone. Tier B.
* **Exercise energy** = Σ over the program template of `(MET − 1) × kg × hours`, divided by the template
  length (rest days = 0). Net METs: the resting 1 MET is already inside BMR × factor. Uses the active
  suite's own schedule (Classic, Lean, Generation Next), current weight.

### 2.1 MET assignments (2024 Adult Compendium of Physical Activities, pacompendium.com)

| Class | MET | Compendium entry | Used for |
|---|---|---|---|
| Strength | 6.0 | 02050 resistance training, vigorous effort | all P90X strength days, GN strength |
| Circuit | 5.8 | resistance circuit with reciprocal supersets | Core Synergistics, GN Core Circuit |
| Calisthenics | 7.5 | 02020 calisthenics (push-ups, jumping jacks, burpees…), vigorous | Plyometrics, GN Plyometrix / Speed & Agility / Accel-Decel |
| Video cardio | 6.0 | video cardio-resistance workout, vigorous | Cardio X, Ab Ripper X, GN Cardio Boxing |
| Martial arts | 5.3 | 15425 martial arts, slower pace / practice drills | Kenpo X (lower bound; "moderate pace" combat is 10.3) |
| Power yoga | 4.0 | 02160 Yoga, Power | Yoga X |
| Stretching / mobility | 2.3 | Hatha yoga (nearest confirmed stretching entry) | X Stretch, GN Mobility / Flexibility / Myofascial |

These were confirmed from search snippets of the 2024 compendium; the PDF itself was unreachable from
the build sandbox. The class→workout mapping is a judgement (Tier B/C) — the Compendium has no entries
for these branded programs. Session lengths: Generation Next from the video runtimes in
`gennext-workouts.md`; Plyometrics from its authored play timeline (47 min); the other P90X discs are
**nominal rounded lengths** (Tier C) — the authored timelines omit untimed segments and cannot be summed.

### 2.2 Result on the sample persona (80.8 kg, 21.2 % BF, Classic)

BMR 1 745 (Katch–McArdle; Cunningham 1 901 as cross-check); × 1.4 = 2 443; + 354 kcal/day of workouts
(≈ 2 478/week) = **2 797 kcal**, likely 2 521–3 074. The old flat × 1.55 on Katch–McArdle gave 2 705.
Cross-check: the P90X booklet formula (RMR 10 kcal/lb × 1.2 + 600) gives ≈ 2 737 for the same body — the
factorial model lands about 2 % above it. A flat × 1.55 of a lean-mass BMR was therefore not an
over-estimate for six scheduled sessions a week.

### 2.3 Uncertainty band

`±` the root-sum-square of three independent errors: BMR error (8 % ≈ 1 SD) × baseline, the daily-life
range (1.4 → 1.5), and 25 % of exercise energy (Compendium values are group means). ≈ ±9–10 %.
This is an estimate to adjust from the weight trend (E21), not a measurement. Known limits: compensation
(people tend to move less outside workouts when training hard) is not modelled; no intake logging
exists to calibrate against.

## 3. What changed in the app

* `lib/body/ffmiScale.ts` — bands, scale position, start/current summary.
* `lib/nutrition/energy.ts` — equations, workout table, exercise average, TDEE + range.
* Surfaces: Body page FFMI card (full), dashboard FFMI card (compact), Today/Settings nutrition (TDEE
  breakdown and range).

## 4. Deviations from the workbook (rule 1)

* FFMI **category names/bands** (SCHEDULE!K) replaced by §1.2. The FFMI *value* is unchanged and still
  pinned by the golden-master row in `body.test.ts`.
* The workbook has no TDEE; E22's × 1.55 was an engineering choice, superseded here.
