import { describe, expect, it } from 'vitest'
import { parseTrackName, sortTracks, type AlbumTrack } from './albumTracks'

const track = (id: string, title: string, trackNumber: number | null): AlbumTrack => ({
  id, title, trackNumber, url: `/beta-album/${id}`,
})

describe('parseTrackName', () => {
  it('strips a leading track number and common separators', () => {
    expect(parseTrackName('01 - Subwoofer Lullaby.mp3')).toEqual({ trackNumber: 1, title: 'Subwoofer Lullaby' })
    expect(parseTrackName('07. Death.flac')).toEqual({ trackNumber: 7, title: 'Death' })
    expect(parseTrackName('12_Living Mice.ogg')).toEqual({ trackNumber: 12, title: 'Living Mice' })
    expect(parseTrackName('03 - Minecraft.m4a')).toEqual({ trackNumber: 3, title: 'Minecraft' })
    expect(parseTrackName('5 Subwoofer.mp3')).toEqual({ trackNumber: 5, title: 'Subwoofer' })
  })

  it('keeps names without a number intact', () => {
    expect(parseTrackName('Subwoofer Lullaby.mp3')).toEqual({ trackNumber: null, title: 'Subwoofer Lullaby' })
    expect(parseTrackName('a.b.c.wav')).toEqual({ trackNumber: null, title: 'a.b.c' })
  })

  it('does not mistake a year or long number for a track number', () => {
    expect(parseTrackName('2011 - Something.mp3')).toEqual({ trackNumber: null, title: '2011 - Something' })
    expect(parseTrackName('1234 - Too Long.mp3')).toEqual({ trackNumber: null, title: '1234 - Too Long' })
  })

  it('trims whitespace and handles an empty name', () => {
    expect(parseTrackName('  02 -  Haggstrom .mp3')).toEqual({ trackNumber: 2, title: 'Haggstrom' })
    expect(parseTrackName('.mp3')).toEqual({ trackNumber: null, title: '' })
  })
})

describe('sortTracks', () => {
  it('orders by track number, then title, then path', () => {
    const sorted = sortTracks([
      track('c', 'Zeta', 2),
      track('a', 'Alpha', 1),
      track('b', 'Beta', null),
      track('d', 'Alpha', 2),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'd', 'c', 'b'])
  })

  it('does not mutate the input', () => {
    const input = [track('b', 'B', 2), track('a', 'A', 1)]
    const copy = [...input]
    sortTracks(input)
    expect(input).toEqual(copy)
  })

  it('keeps one entry per file', () => {
    const sorted = sortTracks([track('x', 'Same', 1), track('y', 'Same', 1)])
    expect(sorted).toHaveLength(2)
    expect(sorted[0].id).toBe('x')
  })
})
