export interface AlbumTrack {
  readonly id: string
  /** Title with any leading track number removed. */
  readonly title: string
  readonly url: string
  readonly trackNumber: number | null
}

const TRACK_PATTERN = /^\s*(\d{1,3})\s*(?:[-._)]\s*|\s+)(.+)$/

/** "07 - Subwoofer Lullaby.mp3" becomes track 7, "Subwoofer Lullaby". */
export function parseTrackName(fileName: string): { title: string; trackNumber: number | null } {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '').trim()
  const match = withoutExtension.match(TRACK_PATTERN)
  if (match) {
    return { trackNumber: Number(match[1]), title: match[2].trim() }
  }
  return { trackNumber: null, title: withoutExtension }
}

/** Album order first, then title, then path so the list is stable. */
export function sortTracks(tracks: readonly AlbumTrack[]): AlbumTrack[] {
  return [...tracks].sort((a, b) => {
    const order = (a.trackNumber ?? Number.MAX_SAFE_INTEGER)
      - (b.trackNumber ?? Number.MAX_SAFE_INTEGER)
    if (order !== 0) return order
    const byTitle = a.title.localeCompare(b.title)
    return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id)
  })
}
