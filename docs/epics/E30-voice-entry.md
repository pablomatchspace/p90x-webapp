# Epic E30 — Voice rep entry in focus mode

> **Status:** in progress · **Stories:** US-150 → US-152
> **Ships as:** package **1.30.152**, displayed **`1.E30.U150`**…`U152` (final `1.E30.U152`) · **Schema:** unchanged (v11)
> **One-liner:** Focus mode grows a push-to-talk mic: say **"twenty-two"** (or
> "22 and 8") and the numbers land in the current card's rep fields — hands
> stay on the bar. Web Speech recognition, feature-detected, nothing persisted.

---

## 1. Problem

Focus mode was built for sweaty thumbs (44 px targets, one-tap ghost copy),
but mid-set even a thumb is busy: you finish a round of pull-ups, drop off the
bar, and the number is gone by the time your hands are dry enough to type.
E26 already made the app *speak* (voice cues via `speechSynthesis`); the
natural inverse — the app *listening* — is the one interaction that works
while chalked up.

## 2. Goals

1. **Speak a number, log a rep count** — a push-to-talk button on the focus
   card turns one utterance into entries via the existing `setRoundValue`
   pipeline (ghosts, drop verdicts, targets, autosave all just work).
2. **Multiple values in one breath** — "twenty-two and eight" fills reps then
   knee reps; values land in the card's fields in display order, anchored at
   the first empty field so a half-logged card continues where typing left off.
3. **Hands-free stepping** — "next" / "previous" moves between cards, so a
   whole strength session is loggable without touching the screen.
4. **Progressive enhancement** — no `SpeechRecognition` (Firefox, older
   WebViews) ⇒ the button simply isn't rendered; recognition errors (denied
   mic, no speech) degrade to a polite inline message, never a crash.

## 3. Non-goals

- **No persistence, no schema change.** Push-to-talk is a per-press opt-in;
  there is nothing to remember (v11 untouched). No audio ever leaves the
  device beyond what the browser's own speech service does — the button is
  user-initiated, per W3C spec the browser shows its own recording indicator.
- Wake words / continuous listening — battery, privacy and false-positive
  cost; press-per-utterance is the deliberate design.
- Voice control outside focus mode (grid view, navigation, settings).
- Custom vocabulary or exercise-name targeting ("push-ups twenty-two") —
  positional filling covers the real flow; revisit on demand.

## 4. Design

`src/lib/voiceEntry.ts` (pure, rule 2 — parsing only, no state):

- `parseVoiceTranscript(transcript)` →
  `{ kind: 'command', command: 'next' | 'previous' }` when the whole utterance
  is a step command, `{ kind: 'values', values: number[] }` when it contains
  numbers, else `null`. Handles digit tokens ("22", "22.5"), number words
  zero–nine-hundred-ninety-nine ("twenty-two", "a hundred and five"),
  "point five" and "<n> and a half"; non-numeric words separate values, so
  "22 reps 8 knee" → `[22, 8]`.
- `voiceSlots(step)` → the card's `{ round, field }` pairs in display order
  (per shown round: main, then secondary when the exercise has one).
- `assignVoiceValues(values, slots, filled)` → `{ slot, value }[]`: values
  fill consecutive slots starting at the first empty one (all filled ⇒ start
  over from the first); overflow values are dropped.

`src/features/workouts/VoiceEntryButton.tsx` (US-151): feature-detects
`SpeechRecognition` and renders nothing without it. One tap starts a single
non-continuous recognition (`lang` from the browser), a second tap cancels.
Results run through the parser: values → `setRoundValue` per assignment,
commands → the same handlers as the Prev/Next buttons. An `aria-live` line
echoes what was heard ("Heard "22, 8" → reps 22 · knee reps 8") or the
failure ("Didn't catch a number — try again", "Microphone unavailable").

## 5. Stories

### US-150 — Pure voice-transcript engine (M, P0)

**AC:** [ ] digits, decimals and number words 0–999 parse, incl. "and a
half"/"point five" · [ ] whole-utterance "next"/"previous"/"back" parse as
commands · [ ] non-numeric filler separates values · [ ] slot order matches
the card's visible field order · [ ] assignment anchors at the first empty
slot and drops overflow · [ ] null/empty transcripts parse to null.

### US-151 — Push-to-talk mic on the focus card (M, P0)

**AC:** [ ] button renders only when `SpeechRecognition` exists ·
[ ] spoken values land via `setRoundValue` (score, target chip and ghosts
react live) · [ ] "next"/"previous" step cards within bounds · [ ] `aria-live`
feedback echoes the heard transcript or the error · [ ] recognition errors
(not-allowed, no-speech) surface as text, never break entry · [ ] listening
state is visually and programmatically (`aria-pressed`) distinct.

### US-152 — E2E, baselines & release (S, P1)

**AC:** [ ] e2e with a stubbed `SpeechRecognition` (init-script): speak "22"
→ field fills → "next" advances the card · [ ] unsupported-browser e2e:
deleting the constructors before boot hides the mic button entirely ·
[ ] linux visual baselines regenerated (focus shots gain the mic row) ·
[ ] version/CHANGELOG/docs.

## 6. QA

Unit: word/digit/decimal/mixed parsing, hundreds with "and", "and a half",
command detection, garbage transcripts, slot order for secondary kinds and
multi-round cards, anchor-at-first-empty + wrap + overflow. E2E as above.
Edge rows: R×W (weight secondary), Strip-Set Curls (4 rounds), single-round
exercises, ARX.

## 7. Out of scope / follow-ups

Spoken confirmation of what was logged (E26 `speak()` tie-in); wake-word
listening; grid-view mic; locale number words beyond English.
