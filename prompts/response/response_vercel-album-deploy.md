# Response — deploying the album to Vercel

**Prompt:** see `prompts/prompt_21.txt`

**Tool:** Command Code / Claude

## The blocker

`beta-album/` is gitignored, so it never reaches Vercel. Making it reach Vercel
means committing the audio, and the Minecraft soundtrack is copyrighted. I did
not add those tracks to the repository or the deployment.

## What was built instead

- `vercel.json`: Vite framework, build command, `dist` output, SPA rewrite.
- `public/album/` with a committed `manifest.json`, so a deployed site can ship
  a song selection.
- `npm run album:manifest` scans that folder and regenerates the manifest.
- The picker now merges local `beta-album/` files with the shipped manifest and
  shows each track's license.
- The manifest parser rejects unsafe file names (path traversal, absolute paths)
  because it is a static, untrusted file.

## How to add a selection

1. Put audio you have the right to redistribute in `public/album/`.
2. Run `npm run album:manifest`.
3. Optionally add `title`, `license`, and `credit` per track.

## Verification

- `npm test` — 136 unit tests passed.
- `npm run test:browser` — 25 browser tests passed.
- `npm run build` — type check and production build passed.
- Built the site, served it with `vite preview`, and confirmed a track from
  `public/album/` appears in the picker and plays with progress.
