# Epic E38 — Audio & voice reliability

> **Status:** delivered · **Stories:** US-175
> **Ships as:** package **1.38.175**, displayed **`1.E38.U175`** · **Schema:** unchanged (v14)
> **One-liner:** play/focus beeps and spoken cues now actually sound (unlocked from the
> Start tap, scheduled on the audio clock), never talk over each other, stop when you stop,
> and the hands-free mic no longer loops, mishears the app, or double-starts.

---

## 1. Problem (investigation, 2026-10-26)

Audio & voice "was not working as intended". Root causes found in `timerUtils.ts`,
`PlayPage`, `FocusPage` and `VoiceEntryButton`:

| # | Defect | Effect |
|---|---|---|
| 1 | `beep()` built a **new AudioContext on every cue**, from a timer callback | Created *suspended* outside a tap on iOS/Safari and after reload on Chrome → silent cues |
| 2 | Beep gain 0.15, fixed | Inaudible over gym noise |
| 3 | `speak()` called `cancel()` then `speak()` in the same tick | Chrome drops the utterance → intermittent missing announcements |
| 4 | Speech started together with the beep, no `lang`, utterance not retained | Name talked over the chirp; device-locale voice mangled English names; GC'd utterances |
| 5 | Stop / leaving the screen / switching Voice cues off did not cancel speech | Cue kept talking after the workout was stopped |
| 6 | Cues were fired from page timers | Screen off → timers frozen → no cues at all |
| 7 | Hands-free re-armed instantly on *every* end, incl. `network` / `audio-capture` errors | Tight restart loop (mic chime, battery) with no message |
| 8 | A stale recognizer's late `onend`/`onresult` mutated shared state | Double-started recognizers after quick off/on |
| 9 | Mic stayed open while the app spoke | The app could hear its own cue |

## 2. Decisions (owner)

| Topic | Decision |
|---|---|
| Beep vs voice | Beep first, then the name (voice waits out the beep's length) |
| New settings | None — beep gain raised to 0.35, no volume/rate sliders, no schema change |
| Mic vs spoken cues | Mic sits out while the app speaks, then re-arms |
| Screen off | Included: all upcoming beeps are pre-scheduled on the Web Audio clock |

## 3. Design

- `src/features/workouts/audio.ts` (replaces the audio half of `timerUtils.ts`):
  one shared `AudioContext`; `unlockAudio()` from Start/Resume/rest-timer Start;
  `beep()`; `scheduleCues()` / `cancelCues()` / `cueScheduledAt()`; `speak(text, afterMs)`,
  `stopSpeech()`, `onSpeaking()` / `isSpeaking()` (with a watchdog if the engine never reports `end`).
- `futureCues(state, opts, now)` in `src/lib/workouts/playback.ts`: pure replay of
  `tickPlayback` that lists every upcoming boundary. Play and Focus schedule that list on
  every playback state change; a tick-driven event only beeps when no scheduled cue covers it.
- `VoiceEntryButton`: stale-instance guard, 300 ms hands-free re-arm, fatal errors stop the
  loop with a message, mic aborted during speech and re-armed afterwards.

## 4. Limits

- **Spoken cues cannot be pre-scheduled** — with the screen off the beeps keep sounding but
  the voice does not. The screen wake lock still keeps the screen on while playing.
- iOS routes Web Audio through the ringer channel: the silent switch mutes beeps.
- Not verifiable in CI on real devices; covered by unit tests with fake Web Audio/Speech and a
  Chromium e2e that spies on the real AudioContext.

## 5. Stories

### US-175 — audio & voice reliability (M, P0)

**AC:** [x] one shared, tap-unlocked AudioContext · [x] louder beep · [x] beeps pre-scheduled on
the audio clock, replaced on pause/extend/skip, cancelled on stop · [x] speech follows the beep,
English voice, no cancel-then-speak drop · [x] Stop/unmount/cues-off silences speech ·
[x] hands-free: no tight loop, fatal errors stop with a message, stale events ignored ·
[x] mic muted while the app speaks.
