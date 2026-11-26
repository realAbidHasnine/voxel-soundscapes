import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Rebuild public/album/manifest.json from the audio files in that folder.
 * Only files you have the right to publish belong here.
 *
 * Existing entries are preserved so hand-written `title`, `license`, and
 * `credit` survive regeneration. Entries for files that no longer exist are
 * dropped, since the app would fail to load them.
 */
const folder = 'public/album'
const manifestPath = join(folder, 'manifest.json')
const audio = /\.(mp3|ogg|oga|m4a|wav|flac)$/i

function readExisting() {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const tracks = Array.isArray(parsed?.tracks) ? parsed.tracks : []
    const byFile = new Map()
    for (const entry of tracks) {
      if (entry && typeof entry === 'object' && typeof entry.file === 'string') {
        byFile.set(entry.file, entry)
      }
    }
    return byFile
  } catch {
    // A missing or malformed manifest is not fatal; start from scratch.
    return new Map()
  }
}

const existing = readExisting()
const files = readdirSync(folder)
  .filter((name) => audio.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const tracks = files.map((file) => existing.get(file) ?? { file })
const added = files.filter((file) => !existing.has(file))
const removed = [...existing.keys()].filter((file) => !files.includes(file))

writeFileSync(manifestPath, `${JSON.stringify({ tracks }, null, 2)}\n`)
console.log(`wrote ${folder}/manifest.json with ${files.length} track(s)`)
for (const file of files) console.log(`  ${file}`)
if (added.length > 0) console.log(`added: ${added.join(', ')}`)
if (removed.length > 0) console.log(`removed (file missing): ${removed.join(', ')}`)
