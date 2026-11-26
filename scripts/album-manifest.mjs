import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Rebuild public/album/manifest.json from the audio files in that folder.
 * Only files you have the right to publish belong here.
 */
const folder = 'public/album'
const audio = /\.(mp3|ogg|oga|m4a|wav|flac)$/i

const files = readdirSync(folder)
  .filter((name) => audio.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const manifest = {
  tracks: files.map((file) => ({ file })),
}

writeFileSync(join(folder, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${folder}/manifest.json with ${files.length} track(s)`)
for (const file of files) console.log(`  ${file}`)
