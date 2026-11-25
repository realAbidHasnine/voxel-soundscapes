# Project Context: Recursive Soundscapes (Hub's Quest, Epoch 1)

Give this file to your CLI agent at the start of every session.

## Challenge
Turn a recursive function into a relaxing, interactive musical experience. The user configures recursion parameters; the app simulates the recursion, visualizes it, turns it into music, plays it, and lets the user download it.

## Mandatory Deliverables (from the brief)
1. A recursive algorithm with configurable parameters
2. An interactive simulation or visualization
3. Procedural music generated from the recursive process
4. A UI with parameter controls and audio playback
5. Working audio export
6. A polished, accessible, relaxing experience
7. **AI rule:** the repo must contain the prompt chain and the agent's response to each prompt, or the project may be disqualified. See AI_USAGE.md.

## Judging
| Criterion | Weight |
|---|---|
| Relaxation & UX | 35% |
| Musical quality | 25% |
| Creative use of recursion | 15% |
| Visual design | 10% |
| Interaction & usability | 10% |
| Technical execution | 5% |

## Decisions
- **Algorithm:** a recursive fractal tree that grows breadth-first, one level at a time.
- **Stack:** Vite + React + Tailwind + Tone.js + HTML5 canvas. Fully client-side, with **no backend** (not required). Ambient loops are static files in `public/` (sourced from Pixabay or itch.io, with licenses noted).
- **Export:** `Tone.Recorder` producing .webm (required). Optionally, `Tone.Offline` rendering to .wav.

## Build Order
1. Recursion and event list
2. Audio (make it sound good before styling anything)
3. Canvas visualization synced to the audio
4. Controls and export
5. Polish: presets, zen mode, accessibility

## Recursion (deterministic)
```js
const rng = mulberry32(seed); // same seed => same song
function* grow(x, y, ang, len, depth, maxDepth, B, spread, ratio) {
  yield { x, y, ang, len, depth };
  if (depth >= maxDepth) return;
  for (let i = 0; i < B; i++) {
    const t = B === 1 ? 0 : i / (B - 1) - 0.5;
    const a = ang + t * 2 * spread + (rng() - 0.5) * 0.2;
    const l = len * ratio * (0.9 + rng() * 0.2);
    yield* grow(x + Math.cos(ang) * len, y + Math.sin(ang) * len, a, l, depth + 1, maxDepth, B, spread, ratio);
  }
}
```
Group the nodes by `depth` and sort each level by `x`, so each level plays as a left-to-right sweep.

## Timing
- 60–80 BPM. Each level lasts 2 bars (`levelStart = depth * 2m`).
- 16 eighth-note slots per level. Node `i` of `n` gets slot `floor(i * 16 / n)`.
- A node plays a note if `rng() < min(1, 6 / n)`. Silent nodes still draw.
- Humanize timing by ±15 ms and velocity by ±0.05.
- Total length = `(maxDepth + 1) * 2` bars + a 4-bar tail (the final Cmaj9 fades out).

## Pitch
```js
const SCALE = [0, 2, 4, 7, 9];                    // major pentatonic
const deg = clamp(floor(normAngle * 5), 0, 4);   // angle normalized within its level
const oct = clamp(2 + floor(depth / 2), 2, 6);
let midi = root + 12 * oct + SCALE[deg];
if (midi === prevMidi) midi = nextScaleNote(midi);
```
- Clamp to MIDI 36–96.
- Minor pentatonic is `[0,3,5,7,10]`. Lydian `[0,2,4,6,7,9,11]` is optional; allow the #4 only over the I and V chords.

## Other Mappings
| Value | Element | Formula |
|---|---|---|
| `x` | pan | `(x / W - 0.5) * 1.6` |
| `len` | duration | `max(0.25, len / rootLen * 4)` beats |
| `depth` | velocity | `max(0.15, 0.7 - depth * 0.06)` |
| `depth` | reverb send | `0.25 + depth * 0.07` |
| spread | stereo width | multiply pan by `spread / maxSpread` |

## Harmony
- At each level start, a pad plays `CHORDS[depth % 4]` for 2 bars:
  - Cmaj9: C E G B D
  - Am9: A C E G B
  - Fmaj9: F A C E G
  - G6/9: G B D E A
- A low C drone plays throughout.
- Pentatonic notes fit all four chords.

## Timbres (Tone.js)
- **Pad (depth 0–1):** `PolySynth(Synth, {oscillator:'fatsine', envelope:{attack:2, release:6}})` at -18 dB
- **Rhodes (depth 2–4):** `FMSynth({harmonicity:3, modulationIndex:2, envelope:{attack:0.01, decay:1.5, sustain:0.1, release:3}})`
- **Chime (depth 5+):** `Synth({oscillator:'triangle', envelope:{attack:0.005, decay:2, sustain:0, release:4}})`, plus a quiet sine an octave up

## FX Chain
synths → `Filter(lowpass 5000)` → `PingPongDelay('8n.', 0.3, wet 0.2)` → `Reverb(decay 8, wet 0.45)` → `Limiter(-3)` → master.
Ambient loops get their own gain and a low send to the same reverb.

## Sync
- Schedule notes with `Tone.Transport.schedule`.
- Draw visuals with `Tone.Draw.schedule(() => bloom(node), time)`.
- Leaves fall, and each landing plays a quiet pluck. Branches sway with the wind ambient layer.

## UI
- **Sliders:** Max Depth (4–9), Branching (2–4), Spread angle, Tempo (60–80), Ambient mix, Master volume
- **Buttons:** Play/Pause, Regrow (new seed), Download
- **Presets:**
  - Forest Canopy: C major pentatonic, green palette, wind
  - Midnight Rain: A minor pentatonic, blue palette, rain
  - Cherry Blossom: D pentatonic, pink palette
- **Zen mode:** hides the UI.
- **Extras:** a "depth N" counter, and the seed and params encoded in the URL so songs can be shared.
- **Style:** glassmorphism controls over a full-screen dark canvas.
- **Accessibility:** keyboard-accessible labelled controls, no autoplay before the user clicks, nothing harsh.
