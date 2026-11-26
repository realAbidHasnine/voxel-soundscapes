# album (committed)

Files here are **committed and published** when the site is deployed. Only put
audio here that you have the right to redistribute, for example CC0 or CC-BY
tracks. Note the source and license in `manifest.json`.

This is separate from `beta-album/` at the repository root, which is gitignored
and stays local for your own listening.

## Add a track

1. Copy the audio file into this folder.
2. Run `npm run album:manifest` to regenerate `manifest.json`.
3. Optionally add `title`, `license`, and `credit` for each entry:

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
