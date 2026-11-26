import { describe, expect, it } from 'vitest'
import { activeLineIds, GENERATOR_SOURCE, type TraceSignal } from './generatorSource'

const signal = (overrides: Partial<TraceSignal> = {}): TraceSignal => ({
  playing: true,
  depth: 0,
  maxDepth: 6,
  bass: 0,
  mid: 0,
  treble: 0,
  ...overrides,
})

describe('generatorSource', () => {
  it('lists the recursion with stable unique ids', () => {
    const ids = GENERATOR_SOURCE.map((line) => line.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('emit')
    expect(ids).toContain('leaf')
    expect(ids).toContain('loop')
    expect(ids).toContain('recurse')
    expect(GENERATOR_SOURCE.every((line) => line.text.length > 0)).toBe(true)
  })

  it('lights nothing while playback is stopped', () => {
    for (const depth of [null, 0, 6]) {
      expect(activeLineIds(signal({ playing: false, depth })).size).toBe(0)
    }
  })

  it('follows the recursion depth for the generated soundscape', () => {
    const mid = activeLineIds(signal({ depth: 2, maxDepth: 6 }))
    expect(mid).toEqual(new Set(['signature', 'emit', 'loop', 'recurse']))

    const leaf = activeLineIds(signal({ depth: 6, maxDepth: 6 }))
    expect(leaf.has('leaf')).toBe(true)
    expect(leaf.has('loop')).toBe(false)
    expect(leaf.has('recurse')).toBe(false)
  })

  it('lights the jitter line when the treble is loud', () => {
    expect(activeLineIds(signal({ depth: 1, treble: 0.8 })).has('jitter')).toBe(true)
    expect(activeLineIds(signal({ depth: 1, treble: 0.1 })).has('jitter')).toBe(false)
  })

  it('drives the trace from the spectrum for album playback', () => {
    const quiet = activeLineIds(signal({ depth: null, bass: 0.1, mid: 0.1, treble: 0.1 }))
    expect(quiet).toEqual(new Set(['signature', 'emit']))

    const loud = activeLineIds(signal({ depth: null, bass: 0.9, mid: 0.9, treble: 0.9 }))
    expect(loud).toEqual(new Set(['signature', 'emit', 'recurse', 'loop', 'jitter']))
  })

  it('never reports a line id that is not in the source', () => {
    const ids = new Set(GENERATOR_SOURCE.map((line) => line.id))
    const cases: TraceSignal[] = [
      signal({ depth: null, bass: 1, mid: 1, treble: 1 }),
      signal({ depth: 0, maxDepth: 0 }),
      signal({ depth: 3, maxDepth: 6, treble: 1 }),
      signal({ playing: false }),
    ]
    for (const item of cases) {
      for (const id of activeLineIds(item)) expect(ids.has(id)).toBe(true)
    }
  })
})
