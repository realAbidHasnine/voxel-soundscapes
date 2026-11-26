# Response — how the album manifest runs on deploy

**Prompt:** see `prompts/prompt_23.txt`

**Tool:** Command Code / Claude

## The answer

You do not need to run it separately on Vercel. `npm run build` now runs
`npm run album:manifest` first, so the deployed manifest always matches the
audio files committed in `public/album/`.

The full loop is:

1. Drop audio into `public/album/`.
2. `git add public/album && git commit && git push`.
3. Vercel builds: regenerates `manifest.json`, then builds the site.
4. The new tracks appear in the picker.

Run `npm run album:manifest` locally only if you want the change visible in
`npm run dev` before committing.

## A bug found while answering

The script rewrote `manifest.json` from scratch, which would have erased any
`title`, `license`, or `credit` added by hand on the next build. Fixed:

- Existing entries are preserved, so metadata survives regeneration.
- Entries whose audio file was deleted are dropped, so no dead links ship.
- It logs what was added and removed.

## Verification

- Regenerated with a hand-written `license: CC0` entry and confirmed it survived.
- Deleted a track and confirmed the build removed its entry.
- Built and served the site with `vite preview`, then confirmed the picker shows
  the track title, the CC0 badge, and its license tooltip, and that it plays.
- `npm test` — 136 unit tests passed.
- `npm run test:browser` — 25 browser tests passed.
