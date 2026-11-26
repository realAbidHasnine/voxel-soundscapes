# Response — step 4: Tone.js playback

**Prompt:** see `prompts/prompt_8.txt`

**Tool:** Devin / GPT-6 Astra Medium Thinking (finished and committed later with Command Code)

## What was done

- Wired `generateScore` into Tone.js playback (`createAudioGraph`, `SoundscapePlayer`, `useSoundscape`).
- Added Play / Pause / Resume / Stop, volume, and progress in the UI.
- Added browser playback tests under `tests/browser/`.

## Notes

- `prompt_8.txt` was committed in `c786ac5` with the playback code, but no
  dedicated response file was saved at the time. This file backfills that
  response for the required prompt chain.
- Playback starts only after a user action, pause freezes the audio clock, and
  stop or unmount releases the session's voices and context.

## Verification

- Playback controls and lifecycle covered by `tests/browser/playback.spec.ts`.
