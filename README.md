# Recursive Soundscapes

A relaxing, browser-based musical experience built around a recursive fractal
tree. The project uses Vite, React, TypeScript, Tailwind CSS, Tone.js, and
eventually an HTML5 canvas visualization. No backend is needed.

## Run locally

Use Node.js 22.12+ (Node 22.18 was used for initial setup), or a version compatible
with the `engines` field in `package.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Checks and production build

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`build` includes type checking and produces the static site in `dist/`.
`preview` serves that build locally.

For browser playback tests, install Chromium once, then run:

```sh
npx playwright install chromium
npm run test:browser
```

The browser tests start Vite automatically (or reuse a running local server).
They check playback controls, pause/resume, startup cancellation, cleanup,
error recovery, and a full offline render through the real Web Audio graph.
An existing Chromium executable can be selected with the
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variable.

## Current scope

The deterministic recursive tree and score generators now drive Tone.js playback.
The screen provides Play/Pause/Resume, Stop, volume, elapsed time, and playback
progress. The initial composition uses seed 1, C major pentatonic, and 70 BPM;
press Play to hear it. Canvas rendering, parameter controls, ambient loops, and
audio export are future work.

- `src/App.tsx`: accessible playback screen.
- `src/styles.css`: Tailwind import and global styles.
- `src/tree/generateTree.ts`: seeded tree generation, parent links, spatial bounds,
  and depth levels sorted left to right.
- `src/music/generateScore.ts`: timed melody notes, chord pads, drone, and branch cues.
- `src/random/mulberry32.ts`: the shared deterministic random generator.
- `src/audio/createAudioGraph.ts`: synth voices, stereo routing, effects, and score scheduling.
- `src/audio/SoundscapePlayer.ts`: playback lifecycle and session cleanup.
- `src/audio/useSoundscape.ts`: React integration.
- `vite.config.ts`: React and Tailwind Vite plugins.
- `public/`: future static ambient loops; document sources and licenses when added.

The tree generator accepts `seed`, `maxDepth`, `branching`, `spread` (radians),
and `ratio` (branch length multiplier). It uses a unit trunk at the origin with
negative Y pointing upward, independent of canvas size. Invalid values throw a
`RangeError`; supported depth and branching limits allow up to 349,525 nodes.
The complete tree is generated synchronously; rendering and scheduling that many
branches will need separate performance work when the UI is connected.

`generateScore(tree, options)` accepts a generated tree and optional `tempo`
(60–80 BPM), `root` (pitch class 0–11, where C is 0), and `scale`
(`majorPentatonic` or `minorPentatonic`). The default is C major pentatonic at
70 BPM. It produces plain data without starting audio.

Each level occupies two bars of 4/4 with 16 eighth-note slots. Dense levels
average six melody notes, while every branch retains a visual cue; sounding
branches use their note's exact humanized time. Melody notes stay in the chosen
scale within MIDI 36–96, using standard octave numbering (C2 = 36).
All event times, durations, and fade lengths are expressed in seconds.

Major harmony follows Imaj9–vi9–IVmaj9–V6/9; minor uses
i9–VImaj9–iv9–v7(add11). Both transpose with the root. A tonic drone spans
the score, and a final tonic chord and drone fade fill a four-bar tail.
Scores are deterministic for the same tree and musical parameters; changing
tempo preserves note choices and keeps humanization within ±15 ms.

Playback starts only after a user action. Pads, FM Rhodes-style notes, triangle
chimes with a quiet octave overtone, and a sine drone feed low-pass filtering,
ping-pong delay, reverb, and a -3 dB limiter. Each melody voice retains its own
pan and depth-based reverb send. The final fade sits after the effects so the
entire soundscape reaches silence together.

Each playback session owns an audio context. Pause gently gates the output and
suspends that context, preserving sustained notes and effect tails for Resume.
Stop, completion, and component unmount dispose the session's voices, schedules,
and context. Volume changes are smoothed independently of the closing fade.

Next: listen and refine the musical balance, then add the synchronized canvas
visualization.

See [Project steps](PROJECT_STEPS.md) for the numbered steps referenced in the prompt log.

## AI usage

See [AI_Policy.md](AI_Policy.md) for the required prompt and response logging
convention. User task prompts are stored verbatim in `prompts/prompt_N.txt`.
The commit adding each prompt records the response and associated changes.
The first two discussion prompts were logged retrospectively during setup.

```sh
git log --reverse --format="%h %s" -- prompts/
git log --format="%B" -1 -- prompts/prompt_3.txt
```
