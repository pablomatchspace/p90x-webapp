# Epic E26 — Audible play-mode coaching (distinct rest beep & spoken exercises)

> **Status:** delivered · **Stories:** US-140 → US-141 · **PR:** #42 (shipped with E25 + E27)
> **Ships as:** part of package **1.26.141** (final PR version 1.27.142, displayed **`1.E27.U142`**) · **Schema:** **v9 → v10** (`player.voiceCues`)
> **One-liner:** Rest phases now **sound** different from work phases, and play
> mode / focus-mode playback **speak the workout aloud** via the Web Speech
> API — governed by a persisted, default-on `player.voiceCues` preference
> toggled right on the play and focus screens.

---

## 1. Design

- **Two beep tones** (`beep(kind)` in `src/features/workouts/timerUtils.ts`,
  U140): a work/next-step switch keeps the brisk double 880 Hz chirp; a rest
  start plays a lower falling 660→440 Hz two-tone. You can tell rest from
  work without looking at the screen.
- **Spoken announcements** (`speak()` in `timerUtils.ts`, U141), Web Speech
  API (`speechSynthesis`):
  - the opening exercise at Start;
  - an up-next announcement when a get-ready/rest begins, worded to match
    each screen's own heading — "Get ready. Up next: _exercise_" in play
    mode, "Rest. Up next: _exercise_" in focus mode;
  - the next exercise's name when its work slot starts;
  - a completion line at the end.
- **Persisted preference (schema v10):** `player.voiceCues`, default **on**,
  migration `9:` backfills. Toggled next to Auto-mark on the play screen
  and — for focus-only strength workouts that never reach play mode — on the
  focus screen too.
- **Graceful degradation:** `speak()` no-ops where `speechSynthesis` is
  unavailable; beeps and vibration are unchanged and independent of the
  voice-cue setting.

## 2. Stories

### US-140 — distinct rest beep (S, P0)

`beep(kind: 'work' | 'rest')`; rest starts play the falling two-tone,
everything else keeps the existing chirp.

**AC:** [x] rest audibly distinct from work/next-step · [x] no change where
audio is unavailable.

### US-141 — spoken exercise announcements + schema v10 (M, P0)

`speak()`, the four announcement points across `PlayPage` and `FocusPage`
playback, `player.voiceCues` + migration, the two toggles.

**AC:** [x] announcements match each screen's heading wording · [x] v1–v9
documents migrate to v10 with `voiceCues: true` · [x] toggle available on
both the play and the focus screen · [x] `speak()` no-ops without
`speechSynthesis`.

## 3. Out of scope

Voice selection, language or rate settings; announcing rep counts or timer
values; any audio during non-playback logging.
