# beta-album

Drop album audio files here and reload the app. Every audio file becomes a track
in the Album source, ordered by its filename track number.

Supported: `.mp3`, `.ogg`, `.oga`, `.m4a`, `.wav`, `.flac`.

Naming works best with a leading track number, for example:

```
beta-album/
├── 01 - Subwoofer Lullaby.mp3
├── 02 - Death.mp3
└── 03 - Living Mice.mp3
```

## Why this folder is gitignored

Everything in here except this README is ignored by git. Most album audio is
copyrighted and must not be committed to a public repository or a judged
submission. Keeping the files local lets you play them yourself without shipping
them, and the app simply hides the Album source when the folder is empty.

If you want a shareable album, use tracks you have the right to redistribute and
adjust the ignore rule, recording the source and license in the main README.
