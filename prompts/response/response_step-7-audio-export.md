# Response — step 7: audio export

**Prompt:** see `prompts/prompt_14.txt`

**Tool:** Command Code / Claude

## Decision

The project notes asked for `Tone.Recorder` producing `.webm`. You chose a WAV
rendered offline instead, so the file is lossless, repeatable, and produced
without recording in real time.

## What was done

- Added a Download button that renders the current soundscape and saves it as a
  16-bit PCM `.wav` named after the seed.
- Rendered through the same audio graph as playback, so the file matches the
  sound you hear.
- Added unit tests for the WAV encoder and browser tests that verify the
  downloaded file's header and that it contains real audio.

## Notes

- I first said the render would take a few seconds. It does not: a 62-second
  piece measured about 47 seconds, with the reverb roughly doubling the cost.
  The interface now says this instead of implying it is instant.
- Rendering uses a separate offline context, so nothing is played aloud.

## Verification

- `npm test` — 80 unit tests passed.
- `npm run test:browser` — 12 browser tests passed, including a real download.
- `npm run build` — type check and production build passed.
