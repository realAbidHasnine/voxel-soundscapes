# Response — adding an ambient song library

**Prompt:** see `prompts/prompt_17.txt`

**Tool:** Command Code / Claude

## Licensing first

The Minecraft soundtrack (C418, Volume Alpha/Beta) is copyrighted. It cannot be
committed to a public repo or shipped in a judged submission. Two safe routes:

1. Use CC0 / CC-BY ambient tracks and record the license, as `PROJECT_CONTEXT.md`
   already plans for `public/`.
2. Synthesize the ambient layer instead: `Tone.Noise` through a low-pass filter
   with a slow LFO for wind, mixed low. No files, no license, stays procedural.

If the tracks are only for local listening, keep them out of git and note how to
supply them.

## Technical steps for any static loop

1. Put the files in `public/ambient/` so Vite serves them at `/ambient/*.mp3`
   without bundling.
2. Load them with the session's context, not the global one:
   `new Tone.Player({ context, url, loop: true })` and `await player.load(url)`.
3. In `createAudioGraph`, route the player through its own `Gain` for the ambient
   mix, with a low send into the existing reverb, then to the limiter.
4. Start it in `schedule()` at time 0 and stop it in `dispose()`.
5. Add an Ambient mix slider to `ParameterControls` and a matching value in
   `SoundParameters`.
6. Include it in the export: `renderScoreToWav` builds a fresh offline context, so
   the buffer must be loaded beforehand and passed to a `Tone.Player` created with
   that context.

## Notes

- Each track is several MB; a library of them will dominate the repo size.
- The brief judges procedural music. A pre-recorded song library reads as a
  backing track rather than generation, so a short ambient bed is safer than a
  full soundtrack.

## Verification

- No code changed; nothing to test.
