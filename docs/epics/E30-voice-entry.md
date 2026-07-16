# Epic E30 — Voice rep entry in focus mode

> **Status:** delivered · **Stories:** US-150 → US-152
> **Ships as:** package **1.30.152**, displayed **`1.E30.U150`**…`U152` (final `1.E30.U152`) · **Schema:** **v11 → v12** (`player.voiceHandsFree`)
> **One-liner:** Focus mode grows a mic: say **"reps twenty-two, knee eight"**
> and the numbers land in the named fields — hands stay on the bar. Web Speech
> recognition (pinned en-US), feature-detected, push-to-talk by default with an
> opt-in hands-free mode.

---

## 1. Problem

Focus mode was built for sweaty thumbs (44 px targets, one-tap ghost copy),
but mid-set even a thumb is busy: you finish a round of pull-ups, drop off the
bar, and the number is gone by the time your hands are dry enough to type.
E26 already made the app *speak* (voice cues via `speechSynthesis`); the
natural inverse — the app *listening* — is the one interaction that works
while chalked up.

## 2. Goals

1. **Speak a number, log a rep count** — a mic on the focus card turns an
   utterance into entries via the existing `setRoundValue` pipeline (ghosts,
   drop verdicts, targets, autosave all just work).
2. **Field words route values** — "reps 22, knee 8" (or trailing: "22 reps,
   8 knee") targets the named columns; bare numbers fill the card's fields
   positionally, anchored at the first empty one; "round 2 …" scopes values
   on multi-round cards.
3. **Hands-free session** — "next" / "previous" / "finish workout" work by
   voice, and an opt-in, persisted **hands-free** mode keeps recognition
   running (auto-restarting) so a whole strength session is loggable without
   touching the screen. Push-to-talk stays the default.
4. **Progressive enhancement** — no `SpeechRecognition` (Firefox, older
   WebViews) ⇒ the mic simply isn't rendered; recognition errors (denied mic,
   no speech) degrade to a polite inline message, never a crash.

## 3. Non-goals

- **No audio persistence, no transcripts stored.** Only the parsed numbers
  enter state via `setRoundValue`; the new v12 field persists a single boolean
  preference. Recognition is user-initiated (hands-free arms only from an
  explicit tap — never on page load) and the browser shows its own recording
  indicator.
- Wake words — hands-free means auto-restart after each utterance while
  armed, not hotword detection.
- Voice control outside focus mode (grid view, navigation, settings).
- Exercise-**name** targeting ("push-ups twenty-two") — field words + the
  current card cover the real flow; revisit on demand.
- Localised number words — recognition is pinned **en-US** (Q: owner call,
  2026-07-16); digits work regardless.

## 4. Design

`src/lib/voiceEntry.ts` (pure, rule 2 — parsing only, no state):

- `parseVoiceTranscript(transcript)` →
  `{ kind: 'command', command: 'next' | 'previous' | 'finish' }` when the
  whole utterance is a command ("next", "previous"/"back", "finish"/"finish
  workout"/"done"), `{ kind: 'values', values: VoiceValue[] }` when it
  contains numbers, else `null`. A `VoiceValue` is a number plus optional
  `field` (from spoken words — main: rep/reps/second(s); secondary:
  knee(s)/chair(s)/weight(s)/pound(s)/kilo(s)/kg/lb(s)/side) and optional
  0-based `round` (from "round N", persisting until re-spoken). Field words
  bind to the nearest number — prefix or immediately trailing — and "knee
  reps"-style compounds stay secondary. Numbers parse as digits ("22",
  "22.5") or words zero–999 ("twenty-two", "a hundred and five"), with
  "point five" / "and a half" fractions; filler words separate values.
- `voiceSlots(step)` → the card's `{ round, field }` pairs in display order
  (per shown round: main, then secondary when the exercise has one).
- `assignVoiceValues(values, slots, filled)` → `{ slot, value }[]`: each
  value takes the first slot matching its tags, preferring empty fields
  (bare numbers continue where entry left off; a fully logged card starts
  over so re-speaking corrects); one slot per value per utterance; values
  with no matching slot are dropped.

`src/features/workouts/VoiceEntryButton.tsx` (US-151): feature-detects
`SpeechRecognition` and renders nothing without it. `lang` pinned `en-US`.
Two modes:

- **Push-to-talk (default):** one tap starts a single non-continuous
  recognition, a second tap cancels.
- **Hands-free (opt-in, persisted `player.voiceHandsFree`, schema v12):**
  while armed, recognition restarts after every result/end until disarmed or
  the screen unmounts. Arming always requires a tap.

Results run through the parser: values → `setRoundValue` per assignment;
`next`/`previous` → the same handlers as the buttons (within bounds);
`finish` → the Finish action. An `aria-live` line echoes what was heard
("Heard "reps 22, knee 8"") or the failure ("Didn't catch a number — try
again", "Microphone unavailable").

## 5. Stories

### US-150 — Pure voice-transcript engine (M, P0)

**AC:** [x] digits, decimals and number words 0–999 parse, incl. "and a
half"/"point five" · [x] whole-utterance "next"/"previous"/"back"/
"finish"/"finish workout"/"done" parse as commands · [x] field words tag the
nearest number, prefix or trailing, incl. "knee reps" compounds · [x]
"round N" scopes following values · [x] non-numeric filler separates values ·
[x] slot order matches the card's visible field order · [x] assignment
prefers empty matching slots, never doubles up a slot per utterance, drops
unplaceable values · [x] null/empty/garbage transcripts parse to null
(inherited object-property names included).

### US-151 — Mic on the focus card + hands-free mode (M, P0)

**AC:** [x] button renders only when `SpeechRecognition` exists · [x] spoken
values land via `setRoundValue` (score, target chip and ghosts react live) ·
[x] "next"/"previous" step cards within bounds; "finish workout" completes
the session · [x] hands-free toggle persists as `player.voiceHandsFree`
(schema v12 + migration, default off) and auto-restarts recognition while
armed · [x] arming always requires a tap — nothing listens on load ·
[x] `aria-live` feedback echoes the heard transcript or the error ·
[x] recognition errors (not-allowed, no-speech) surface as text, never break
entry · [x] listening state is visually and programmatically
(`aria-pressed`) distinct.

### US-152 — E2E, baselines & release (S, P1)

**AC:** [x] e2e with a stubbed `SpeechRecognition` (init-script): speak
"reps 22" → field fills → "next" advances → "finish workout" completes ·
[x] unsupported-browser e2e: stubbing out the constructors before boot hides
the mic entirely · [x] linux visual baselines regenerated (focus shots gain
the mic row) · [x] version/CHANGELOG/docs.

## 6. QA

Unit: word/digit/decimal/mixed parsing, hundreds with "and", "and a half",
command detection, field-word prefix/trailing/compound binding, round
scoping, garbage transcripts, slot order for secondary kinds and multi-round
cards, prefer-empty + overwrite-on-repeat + drop-unplaceable assignment.
E2E as above. Edge rows: R×W (weight secondary), Strip-Set Curls (4 rounds),
single-round exercises, ARX.

## 7. Out of scope / follow-ups

Spoken confirmation of what was logged (E26 `speak()` tie-in); wake-word
listening; grid-view mic; locale number words beyond English.
