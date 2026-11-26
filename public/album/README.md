# album (committed)

Files here are **committed and published** when the site is deployed. Only put
audio here that you have the right to redistribute, for example CC0 or CC-BY
tracks. Note the source and license in `manifest.json`.

This is separate from `beta-album/` at the repository root, which is gitignored
and stays local for your own listening.

## Add a track

1. Copy the audio file into this folder.
2. Commit it, along with an updated `manifest.json`.

The manifest is regenerated automatically by `npm run build`, so a Vercel deploy
always matches the files in this folder. Run `npm run album:manifest` yourself if
you want to see the change immediately in `npm run dev`. Existing `title`,
`license`, and `credit` values are preserved across regeneration, and entries
whose file was deleted are dropped.

To annotate a track, add its details to `manifest.json` after the first run:

```json
{
  "tracks": [
    {
      "file": "01 - Rain on Glass.mp3",
      "title": "Rain on Glass",
      "license": "CC0",
      "credit": "Free Music Archive"
    }
  ]
}
```

The app shows the license next to each track in the picker. If this folder has no
audio, the Album source stays hidden and the generated soundscape is the only
option.

## Where to find free tracks

- Free Music Archive (filter by CC0 / CC-BY)
- Pixabay Music
- itch.io ambient packs

Record the exact license from the source page; "free" usually still requires
attribution.
