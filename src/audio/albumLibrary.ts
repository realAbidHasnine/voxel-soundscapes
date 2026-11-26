import { parseTrackName, sortTracks, type AlbumTrack } from './albumTracks'

/**
 * Every audio file dropped into `beta-album/` becomes a track. The folder is
 * gitignored, so a fresh clone simply has no tracks and the album mode hides
 * itself. Vite returns file URLs, not contents, so this stays cheap.
 */
const modules = import.meta.glob('/beta-album/*.{mp3,ogg,oga,m4a,wav,flac}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const ALBUM_TRACKS: readonly AlbumTrack[] = sortTracks(
  Object.entries(modules).map(([path, url]) => {
    const fileName = path.split('/').pop() ?? path
    const { title, trackNumber } = parseTrackName(fileName)
    return { id: path, title, url, trackNumber }
  }),
)
