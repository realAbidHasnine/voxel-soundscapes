import { describe, expect, it } from 'vitest'
import { parseAlbumManifest } from './albumManifest'

describe('parseAlbumManifest', () => {
  it('parses committed tracks with derived titles', () => {
    const tracks = parseAlbumManifest({
      tracks: [{ file: '01 - Rain on Glass.mp3' }, { file: '02 Snow.wav' }],
    })
    expect(tracks.map((track) => track.title)).toEqual(['Rain on Glass', 'Snow'])
    expect(tracks.map((track) => track.trackNumber)).toEqual([1, 2])
    expect(tracks[0].url).toBe('/album/01%20-%20Rain%20on%20Glass.mp3')
  })

  it('prefers an explicit title and keeps license details', () => {
    const [track] = parseAlbumManifest({
      tracks: [{ file: 'x.mp3', title: 'Custom', license: 'CC0', credit: 'FMA' }],
    })
    expect(track.title).toBe('Custom')
    expect(track.license).toBe('CC0')
    expect(track.credit).toBe('FMA')
  })

  it('rejects path traversal and absolute paths', () => {
    const tracks = parseAlbumManifest({
      tracks: [
        { file: '../secret.mp3' },
        { file: 'a/../../b.mp3' },
        { file: '/etc/passwd.mp3' },
        { file: 'C:\\windows\\x.mp3' },
        { file: 'nested/song.mp3' },
      ],
    })
    expect(tracks).toEqual([])
  })

  it('ignores entries that are not audio files', () => {
    const tracks = parseAlbumManifest({
      tracks: [{ file: 'notes.txt' }, { file: 'image.png' }, { file: 'song.mp3' }],
    })
    expect(tracks.map((track) => track.title)).toEqual(['song'])
  })

  it('skips duplicates and malformed entries', () => {
    const tracks = parseAlbumManifest({
      tracks: [
        { file: 'a.mp3' },
        { file: 'a.mp3' },
        { file: 42 },
        { title: 'no file' },
        null,
        'nope',
        { file: '   ' },
      ],
    })
    expect(tracks).toHaveLength(1)
    expect(tracks[0].title).toBe('a')
  })

  it('returns nothing for malformed payloads', () => {
    for (const payload of [null, undefined, 'text', 42, [], {}, { tracks: 'no' }, { tracks: [1, 2] }]) {
      expect(parseAlbumManifest(payload)).toEqual([])
    }
  })

  it('honours a custom base url', () => {
    const [track] = parseAlbumManifest({ tracks: [{ file: 'a b.mp3' }] }, '/app/album/')
    expect(track.url).toBe('/app/album/a%20b.mp3')
    expect(track.id).toBe('/app/album/a b.mp3')
  })
})
