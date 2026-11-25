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
npm run typecheck
npm run build
npm run preview
```

`build` includes type checking and produces the static site in `dist/`.
`preview` serves that build locally.

## Current scope

The application scaffold and a responsive placeholder screen are ready.
Tone.js is installed; playback, recursion, canvas rendering, controls, and
audio export are future work. Audio initialization must happen after an explicit
user interaction.

- `src/App.tsx`: application entry screen.
- `src/styles.css`: Tailwind import and global styles.
- `vite.config.ts`: React and Tailwind Vite plugins.
- `public/`: future static ambient loops; document sources and licenses when added.

Next: generate a deterministic seeded fractal tree and a musical event list,
then build and tune playback before adding the visualization.

## AI usage

See [AI_Policy.md](AI_Policy.md) for the required prompt and response logging
convention. User task prompts are stored verbatim in `prompts/prompt_N.txt`.
The commit adding each prompt records the response and associated changes.
The first two discussion prompts were logged retrospectively during setup.

```sh
git log --reverse --format="%h %s" -- prompts/
git log --format="%B" -1 -- prompts/prompt_3.txt
```
