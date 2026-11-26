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

The deterministic recursive tree and score generators drive Tone.js playback and a
synchronized canvas. The screen shows the tree beside the controls; each branch
blooms as its level plays. Controls provide Play/Pause/Resume, Stop, volume,
elapsed time, and playback progress, plus a Shape panel for max depth, branching,
spread, and tempo with a Regrow button for a new seed. Three presets — Forest
Canopy, Midnight Rain, and Cherry Blossom — change the scale, tempo, tree shape,
and color palette together. Zen mode hides the interface so only the tree remains.
A level counter shows which depth is playing. Download renders the current
soundscape to a 16-bit PCM `.wav`, and Share copies a link that restores the
exact same soundscape. A frequency graph and a `grow()` trace sit under the tree;
the trace lights the lines that are "executing" as the music plays.

If any audio files are present in `beta-album/`, an Album source can play them
instead of the generated score, and the trace follows the spectrum.

- `src/App.tsx`: accessible playback screen with the tree beside the controls.
- `src/controls/soundParameters.ts`: display units to generator parameters, limits, and seed rotation.
- `src/controls/ParameterControls.tsx`: the Shape sliders and Regrow button.
- `src/controls/presets.ts`: the three presets and their palettes.
- `src/controls/PresetPicker.tsx`: preset buttons with the active state.
- `src/controls/shareLink.ts`: encode and safely decode the settings in the URL.
- `src/visuals/treePalette.ts`: palette shape and the default Forest colors.
- `src/audio/albumTracks.ts`: track naming and ordering for the album folder.
- `src/audio/albumLibrary.ts`: discovers `beta-album/` audio files.
- `src/audio/AlbumPlayer.ts`: album playback with its own analyser.
- `src/audio/useAlbum.ts`: React integration for album playback.
- `src/controls/AlbumPicker.tsx`: the album track list.
- `src/visuals/frequencyBars.ts`: FFT bars and band energy maths.
- `src/visuals/FrequencyGraph.tsx`: live spectrum canvas.
- `src/visuals/generatorSource.ts`: the `grow()` source and which lines are active.
- `src/visuals/FunctionTrace.tsx`: the lighting code window.
- `src/export/encodeWav.ts`: 16-bit PCM WAV encoding and export file names.
- `src/export/renderScore.ts`: offline render of the score through the playback graph.
- `src/export/useExport.ts`: render-to-download lifecycle for the UI.
- `src/styles.css`: Tailwind import and global styles.
- `src/tree/generateTree.ts`: seeded tree generation, parent links, spatial bounds,
  and depth levels sorted left to right.
- `src/music/generateScore.ts`: timed melody notes, chord pads, drone, and branch cues.
- `src/random/mulberry32.ts`: the shared deterministic random generator.
- `src/audio/createAudioGraph.ts`: synth voices, stereo routing, effects, and score scheduling.
- `src/audio/SoundscapePlayer.ts`: playback lifecycle and session cleanup.
- `src/audio/useSoundscape.ts`: React integration.
- `src/visuals/treeGeometry.ts`: tree and score flattened into typed arrays for drawing.
- `src/visuals/drawTreeFrame.ts`: canvas renderer that blooms branches by audio time.
- `src/visuals/TreeCanvas.tsx`: device-pixel-ratio canvas synced to the audio clock.
- `vite.config.ts`: React and Tailwind Vite plugins.
- `public/`: static assets only; currently empty.

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
ping-pong delay, reverb, and a limiter. Each melody voice retains its own
pan and depth-based reverb send. The final fade sits after the effects so the
entire soundscape reaches silence together.

The master chain is ordered deliberately: a 40 Hz high-pass removes sub-bass that
phone and laptop speakers cannot reproduce (it only adds rattle), a 5x makeup
gain lifts the mix, and a limiter at -1.5 dB is the last safety net. Measured
peaks sit near 0.27 with no clipping, roughly 15 dB above the earlier mix.

The analyser that feeds the frequency graph taps the master as a dead-end sink
rather than sitting inline before the destination, because iOS Safari silences a
graph whose output reaches the speakers only through a plain `AnalyserNode`.

Each playback session owns an audio context. Pause gently gates the output and
suspends that context, preserving sustained notes and effect tails for Resume.
Stop, completion, and component unmount dispose the session's voices, schedules,
and context. Volume changes are smoothed independently of the closing fade.

The canvas animates from the audio clock rather than React state, so a branch
stays in step with its note. Before playback it shows a faint silhouette of the
whole tree; each frame then draws only the levels that have bloomed, grouped by
depth and fade step so a frame stays a few dozen strokes. Trees larger than
24,000 branches are sampled evenly for drawing, and drawing stops at the first
cue that has not yet played because cue times are already sorted.

Shape changes are debounced by about a fifth of a second before they regenerate.
The largest supported tree takes roughly 300 ms to build, and the panel notes the
branch count so that cost is visible before it happens. Volume lives outside the
player session, so it survives a regrow.

Download re-renders the score offline through the same graph as playback, so the
file matches what you hear. It is not faster than real time with this effects
chain: a 62-second piece measured about 47 seconds at 44.1 kHz in Chromium, with
the reverb roughly doubling the cost. The button stays disabled with a status
message until the file is ready.

Each preset supplies both its musical settings and a color palette, which is
applied through CSS custom properties so labels, sliders, progress, and the tree
all shift together. Selecting a preset replaces the shape sliders with that
preset's values.

The address bar always describes the soundscape on screen, so copying it shares
exactly what you hear. Links are validated on load: unknown presets, non-numeric
values, and out-of-range numbers fall back to defaults or clamp to the nearest
limit rather than failing. The renderer draws from the preset palette, and the
level counter is derived from the score's own timing.

The interface is keyboard reachable with a skip link, labelled controls, and live
status regions. Zen mode hides the panel with `hidden`, so focus cannot land
inside it, and Escape restores the full view.

One item from the brief is deliberately not built: ambient wind and rain layers.
They would need licensed recordings committed to `public/`, so the soundscape is
generated entirely from the tree instead. There is no ambient-mix slider. The
optional album folder covers the "play a record over the visual" idea without
shipping any audio.

## Album mode

Drop audio files into `beta-album/` (gitignored) and reload. The Album source
appears in the controls; each file becomes a track ordered by its filename track
number. Files are served through Vite's asset pipeline, so no manifest is needed.

The album player runs its own Web Audio graph with an analyser on the master
path. Pausing suspends the context, which freezes both the clock and the
spectrum. While a track plays the tree blooms across the track's length, the
frequency graph reads the real spectrum, and the trace lights lines from the
bass, mid, and treble peaks instead of the recursion depth.

Album audio is copyrighted in most cases, so it stays out of git and out of the
build of a fresh clone; with an empty folder the Album source simply does not
appear.

## Album on a deployed site

`beta-album/` is local only, so a deployment needs tracks that live in the repo.
Put those in `public/album/` instead and regenerate the manifest:

```sh
npm run album:manifest
```

That scans `public/album/` and writes `manifest.json`, which the app fetches at
runtime. Each entry may carry `title`, `license`, and `credit`; the license is
shown in the picker. File names containing `/`, `\`, or `..` are rejected, since
the manifest is a static file that is not trusted.

Only publish audio you have the right to redistribute. The Minecraft soundtrack
is copyrighted and must not be added here.

## Deploying to Vercel

`vercel.json` sets the Vite framework, the build command, and the `dist` output
with an SPA rewrite. Either connect the repository in the Vercel dashboard or run
`vercel` with the CLI; no extra environment variables are needed.

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
