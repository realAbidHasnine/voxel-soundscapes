# Response — audio buzz and mobile playback

**Prompt:** see `prompts/prompt_20.txt`

**Tool:** Command Code / Claude

## What was actually wrong

I measured the rendered audio instead of guessing.

- Peak level was **0.06 (-24 dBFS)** with an RMS near 0.013. The mix was far
  quieter than intended, so it sounded thin and buzzy rather than musical.
- The drone sat at **MIDI 24 = 32.7 Hz**, below what phone and laptop speakers
  can reproduce. That near-inaudible tone only produced intermodulation rattle.
- The analyser was wired inline before `destination`. iOS Safari silences an
  output graph whose destination is reached only through a plain `AnalyserNode`,
  which is the likely cause of "no audio on mobile".

## What was changed

- Drone moved to MIDI 36 (C2, 65 Hz) so it is audible on small speakers.
- Added a 40 Hz high-pass to remove sub-bass that only causes rattle.
- Added 5x makeup gain before the limiter, and moved the limiter to -1.5 dB as a
  final safety net.
- Rewired both analysers (generated and album) as dead-end taps so audio reaches
  the speakers directly.

## Measured result

- Peak: 0.06 → 0.27, RMS 0.013 → 0.048, roughly 15 dB louder
- Clipped samples: 0; near-ceiling samples: 0
- Energy below 60 Hz reduced, while the 60–250 Hz body stayed intact

## Verification

- `npm test` — 129 unit tests passed, including a new test that the drone stays
  above 50 Hz for every root and scale.
- `npm run test:browser` — 25 browser tests passed.
- `npm run build` — type check and production build passed.

## Caveat

The mobile fix is reasoned from the known iOS Safari analyser behaviour, not
verified on a real iOS device, since the browser tests use Chromium. Playback
progress advanced correctly under iPhone emulation both before and after, so it
does not reproduce there.
