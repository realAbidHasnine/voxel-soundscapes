import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import {
  decodeShareLink,
  encodeShareLink,
  readShareLink,
} from './shareLink'
import { DEFAULT_SOUND_PARAMETERS, SOUND_LIMITS, type SoundParameters } from './soundParameters'

const state = (overrides: Partial<SoundParameters> = {}, presetId: 'forest' | 'midnight' | 'blossom' = 'forest') => ({
  presetId,
  parameters: { ...DEFAULT_SOUND_PARAMETERS, ...overrides },
})

describe('shareLink', () => {
  it('round-trips every preset exactly', () => {
    for (const preset of PRESETS) {
      const link = encodeShareLink({ presetId: preset.id, parameters: preset.parameters })
      expect(decodeShareLink(link)).toEqual({ presetId: preset.id, parameters: preset.parameters })
      expect(decodeShareLink(`?${link}`)).toEqual({ presetId: preset.id, parameters: preset.parameters })
    }
  })

  it('round-trips edited parameters that no preset defines', () => {
    const custom = state({ seed: 4_000_000_000, maxDepth: 8, branching: 4, spreadDegrees: 55, tempo: 63 })
    expect(decodeShareLink(encodeShareLink(custom))).toEqual(custom)
  })

  it('produces one stable string for the same song', () => {
    const a = encodeShareLink(state({ seed: 9, tempo: 61 }))
    const b = encodeShareLink(state({ seed: 9, tempo: 61 }))
    expect(a).toBe(b)
    expect(a.startsWith('?')).toBe(false)
  })

  it('returns defaults for an empty or missing query', () => {
    for (const search of ['', '?', '?p=forest']) {
      const decoded = decodeShareLink(search)
      expect(decoded.presetId).toBe('forest')
      expect(decoded.parameters).toEqual(PRESETS[0].parameters)
    }
  })

  it('clamps out-of-range numbers instead of throwing', () => {
    const decoded = decodeShareLink('?p=forest&s=1&d=99&b=0&a=1000&t=999&r=99')
    expect(decoded.parameters.maxDepth).toBe(SOUND_LIMITS.maxDepth.max)
    expect(decoded.parameters.branching).toBe(SOUND_LIMITS.branching.min)
    expect(decoded.parameters.spreadDegrees).toBe(SOUND_LIMITS.spreadDegrees.max)
    expect(decoded.parameters.tempo).toBe(SOUND_LIMITS.tempo.max)
    expect(decoded.parameters.root).toBe(11)
  })

  it('rejects negative numbers and falls back to the preset values', () => {
    const decoded = decodeShareLink('?p=forest&s=1&d=-5&b=-1&a=-90&t=-1&r=-3')
    // The minus sign makes these malformed, not merely out of range.
    expect(decoded.parameters.maxDepth).toBe(PRESETS[0].parameters.maxDepth)
    expect(decoded.parameters.branching).toBe(PRESETS[0].parameters.branching)
    expect(decoded.parameters.spreadDegrees).toBe(PRESETS[0].parameters.spreadDegrees)
    expect(decoded.parameters.tempo).toBe(PRESETS[0].parameters.tempo)
    expect(decoded.parameters.root).toBe(PRESETS[0].parameters.root)
  })

  it('clamps out-of-range positive numbers to the nearest limit', () => {
    const decoded = decodeShareLink('?p=forest&s=1&d=0&b=0&a=0&t=1&r=0')
    expect(decoded.parameters.maxDepth).toBe(SOUND_LIMITS.maxDepth.min)
    expect(decoded.parameters.branching).toBe(SOUND_LIMITS.branching.min)
    expect(decoded.parameters.spreadDegrees).toBe(SOUND_LIMITS.spreadDegrees.min)
    expect(decoded.parameters.tempo).toBe(SOUND_LIMITS.tempo.min)
    expect(decoded.parameters.root).toBe(0)
  })

  it('ignores values that are not numbers', () => {
    for (const junk of ['abc', 'NaN', 'Infinity', '1e999', '0x10', '  ', '%00', 'null']) {
      const decoded = decodeShareLink(`?s=${encodeURIComponent(junk)}&d=${encodeURIComponent(junk)}`)
      expect(decoded.parameters.seed).toBe(PRESETS[0].parameters.seed)
      expect(decoded.parameters.maxDepth).toBe(PRESETS[0].parameters.maxDepth)
    }
  })

  it('ignores fractional numbers where integers are required', () => {
    const decoded = decodeShareLink('?p=forest&s=1.5&d=6.5&t=70.2')
    expect(decoded.parameters.seed).toBe(PRESETS[0].parameters.seed)
    expect(decoded.parameters.maxDepth).toBe(PRESETS[0].parameters.maxDepth)
    expect(decoded.parameters.tempo).toBe(PRESETS[0].parameters.tempo)
  })

  it('rejects an unknown preset and unknown scale by falling back', () => {
    const decoded = decodeShareLink('?p=evil&m=x')
    expect(decoded.presetId).toBe('forest')
    expect(decoded.parameters.scale).toBe('majorPentatonic')
  })

  it('reads the scale code unambiguously', () => {
    const minor = decodeShareLink('?p=midnight&s=7&d=7&b=2&a=22&t=60&r=9&m=m')
    expect(minor.parameters.scale).toBe('minorPentatonic')
    expect(minor.parameters.root).toBe(9)
  })

  it('treats a seed above 32 bits as missing', () => {
    expect(decodeShareLink('?p=forest&s=4294967296').parameters.seed).toBe(PRESETS[0].parameters.seed)
    expect(decodeShareLink('?p=forest&s=4294967295').parameters.seed).toBe(4294967295)
  })

  it('does not let extra query keys interfere', () => {
    const decoded = decodeShareLink('?utm_source=x&p=blossom&s=21&d=6&b=3&a=38&t=66&r=2&m=M')
    expect(decoded.presetId).toBe('blossom')
    expect(decoded.parameters.branching).toBe(3)
  })

  it('reads a share link from a location object, ignoring an empty one', () => {
    expect(readShareLink({ search: '' })).toBeNull()
    expect(readShareLink({ search: '?' })).toBeNull()
    expect(readShareLink({ search: '?p=midnight&s=7&d=7&b=2&a=22&t=60&r=9&m=m' }))
      .toEqual({ presetId: 'midnight', parameters: PRESETS[1].parameters })
  })
})
