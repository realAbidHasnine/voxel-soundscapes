import { useEffect, useMemo, useState } from 'react'
import { ALBUM_TRACKS } from './albumLibrary'
import { parseAlbumManifest, type ManifestTrack } from './albumManifest'
import { sortTracks, type AlbumTrack } from './albumTracks'

/**
 * Local `beta-album/` files (development) plus the committed manifest that ships
 * to Vercel. Both are optional, so the Album source hides itself when neither
 * exists.
 */
export function useAlbumTracks() {
  const [shipped, setShipped] = useState<ManifestTrack[]>([])

  useEffect(() => {
    let cancelled = false
    const base = import.meta.env.BASE_URL || '/'
    const url = `${base}album/manifest.json`
    fetch(url, { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) {
          setShipped(parseAlbumManifest(payload, `${base}album/`))
        }
      })
      .catch(() => {
        // No manifest deployed is a normal state, not an error.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo<readonly AlbumTrack[]>(() => {
    const seen = new Set(ALBUM_TRACKS.map((track) => track.id))
    return sortTracks([
      ...ALBUM_TRACKS,
      ...shipped.filter((track) => !seen.has(track.id)),
    ])
  }, [shipped])
}
