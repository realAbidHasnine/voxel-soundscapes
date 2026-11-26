import { parseTrackName, type AlbumTrack } from './albumTracks'

/** A track from the committed manifest, plus its license details. */
export interface ManifestTrack extends AlbumTrack {
  readonly license?: string
  readonly credit?: string
}

function isSafeFileName(file: string): boolean {
  if (file.length === 0 || file.length > 200) return false
  // Reject path traversal and absolute paths outright; the manifest is a static
  // file that could be edited, so it is not trusted.
  if (file.includes('/') || file.includes('\\') || file.includes('..')) return false
  return /\.(mp3|ogg|oga|m4a|wav|flac)$/i.test(file)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Parse a committed album manifest from `public/album/manifest.json`, which is
 * what ships to Vercel. Entries with unsafe file names are skipped.
 */
export function parseAlbumManifest(payload: unknown, baseUrl = '/album/'): ManifestTrack[] {
  if (typeof payload !== 'object' || payload === null) return []
  const tracks = (payload as { tracks?: unknown }).tracks
  if (!Array.isArray(tracks)) return []

  const seen = new Set<string>()
  const parsed: ManifestTrack[] = []
  for (const entry of tracks) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const file = readString(record.file)
    if (!file || !isSafeFileName(file) || seen.has(file)) continue
    seen.add(file)

    const { title: derivedTitle, trackNumber } = parseTrackName(file)
    parsed.push({
      id: `${baseUrl}${file}`,
      title: readString(record.title) ?? derivedTitle,
      url: `${baseUrl}${encodeURIComponent(file)}`,
      trackNumber,
      license: readString(record.license),
      credit: readString(record.credit),
    })
  }
  return parsed
}
