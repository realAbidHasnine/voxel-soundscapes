import { describe, expect, it } from 'vitest'
import { generateTree } from '../tree/generateTree'
import { depthAtSeconds, generateScore } from './generateScore'
import type { MusicParameters } from './generateScore'

describe('depthAtSeconds', () => {
  const score = generateScore(generateTree({ maxDepth: 4 }), { tempo: 60 })
  const levelSeconds = score.tailStartSeconds / (score.chords.length - 1)

  it('reports the level that is currently playing', () => {
    expect(depthAtSeconds(score, 0)).toBe(0)
    expect(depthAtSeconds(score, levelSeconds * 0.5)).toBe(0)
    expect(depthAtSeconds(score, levelSeconds)).toBe(1)
    for (let depth = 0; depth < score.chords.length - 1; depth++) {
      expect(depthAtSeconds(score, depth * levelSeconds + levelSeconds * 0.99)).toBe(depth)
    }
  })

  it('returns null outside the levels', () => {
    expect(depthAtSeconds(score, -1)).toBeNull()
    expect(depthAtSeconds(score, score.tailStartSeconds)).toBeNull()
    expect(depthAtSeconds(score, score.durationSeconds)).toBeNull()
    // A root-only tree still has one level.
    expect(depthAtSeconds(generateScore(generateTree({ maxDepth: 0 })), 0)).toBe(0)
  })

  it('matches the depth of the branch cues at that moment', () => {
    const tree = generateTree({ maxDepth: 3 })
    const treeScore = generateScore(tree, { tempo: 70 })
    for (const cue of treeScore.cues) {
      const reported = depthAtSeconds(treeScore, cue.timeSeconds)
      // Cues at a level boundary belong to the level that just started.
      expect(reported === cue.depth || reported === cue.depth - 1).toBe(true)
    }
  })
})

describe('generateScore', () => {
  it('replays the same score without mutating the tree or depending on other calls', () => {
    const tree = generateTree({ seed: 123, maxDepth: 4, branching: 3 })
    const original = structuredClone(tree)
    const options = { tempo: 65, root: 2 }
    const score = generateScore(tree, options)
    generateScore(generateTree({ seed: 4321 }))
    expect(generateScore(tree, options)).toEqual(score)
    expect(tree).toEqual(original)
    expect(options).toEqual({ tempo: 65, root: 2 })
    expect(generateScore(generateTree({ seed: 124 })).notes).not.toEqual(score.notes)
  })

  it('assigns every branch to its eighth-note slot, even when it is silent', () => {
    const tree = generateTree({ branching: 3, maxDepth: 5 })
    const score = generateScore(tree, { tempo: 60 })
    const cues = new Map(score.cues.map((cue) => [cue.nodeId, cue]))
    const notes = new Map(score.notes.map((note) => [note.nodeId, note]))
    expect(cues.size).toBe(tree.nodes.length)
    expect(score.notes.length).toBeLessThan(score.cues.length)
    for (const [depth, level] of tree.levels.entries()) {
      for (const [index, node] of level.entries()) {
        const cue = cues.get(node.id)!
        const slot = Math.floor(index * 16 / level.length)
        const gridTime = depth * 8 + slot * 0.5
        expect(cue.depth).toBe(depth)
        expect(cue.slot).toBe(slot)
        expect(cue.timeSeconds).toBeGreaterThanOrEqual(depth * 8)
        if (notes.has(node.id)) {
          expect(Math.abs(cue.timeSeconds - gridTime)).toBeLessThanOrEqual(0.015000001)
          expect(notes.get(node.id)?.timeSeconds).toBe(cue.timeSeconds)
        } else {
          expect(cue.timeSeconds).toBe(gridTime)
        }
      }
    }
    expect(score.notes.filter((note) => note.depth < 2)).toHaveLength(4)
    for (const events of [score.notes, score.cues]) {
      expect(events.every((event, index) => index === 0 || event.timeSeconds >= events[index - 1].timeSeconds)).toBe(true)
    }
  })

  it('keeps dense levels near six notes on average, rather than voicing every branch', () => {
    let count = 0
    for (let seed = 0; seed < 64; seed++) {
      const score = generateScore(generateTree({ seed, branching: 3, maxDepth: 5 }))
      count += score.notes.filter((note) => note.depth === 5).length
    }
    expect(count / 64).toBeGreaterThan(4.5)
    expect(count / 64).toBeLessThan(7.5)
  })

  it('maps angle extrema to the first and last pentatonic degrees', () => {
    const tree = generateTree({ maxDepth: 1 })
    const notes = generateScore(tree).notes.filter((note) => note.depth === 1)
    const byAngle = [...notes].sort((a, b) => tree.nodes[a.nodeId].angle - tree.nodes[b.nodeId].angle)
    expect(byAngle.map((note) => note.midi)).toEqual([36, 45])
  })

  it.each(['majorPentatonic', 'minorPentatonic'] as const)(
    'keeps %s notes in key and in MIDI range without consecutive repeats',
    (scale) => {
      const degrees = scale === 'majorPentatonic' ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]
      const tree = generateTree({ maxDepth: 9, branching: 2 })
      for (let root = 0; root < 12; root++) {
        const score = generateScore(tree, { root, scale })
        for (const [index, note] of score.notes.entries()) {
          expect(note.midi).toBeGreaterThanOrEqual(36)
          expect(note.midi).toBeLessThanOrEqual(96)
          expect(degrees).toContain((note.midi - root + 12) % 12)
          if (index > 0) expect(note.midi).not.toBe(score.notes[index - 1].midi)
        }
      }
    },
  )

  it('maps branch length, depth, and horizontal position to expression', () => {
    const tree = generateTree({ maxDepth: 9, branching: 2 })
    const score = generateScore(tree, { tempo: 60 })
    const instruments = new Set<string>()
    for (const note of score.notes) {
      const node = tree.nodes[note.nodeId]
      expect(note.durationSeconds).toBe(Math.max(0.25, node.length * 4))
      expect(Math.abs(note.velocity - Math.max(0.15, 0.7 - node.depth * 0.06))).toBeLessThanOrEqual(0.05)
      expect(note.reverbSend).toBeCloseTo(0.25 + node.depth * 0.07)
      const x = (node.x - tree.bounds.minX) / (tree.bounds.maxX - tree.bounds.minX)
      expect(note.pan).toBeCloseTo((x - 0.5) * 1.6 * tree.parameters.spread / (Math.PI / 2))
      expect(note.instrument).toBe(node.depth < 2 ? 'pad' : node.depth < 5 ? 'rhodes' : 'chime')
      instruments.add(note.instrument)
    }
    expect(instruments).toEqual(new Set(['pad', 'rhodes', 'chime']))
  })

  it('centers zero-spread and root-only trees without nonfinite values', () => {
    for (const tree of [generateTree({ spread: 0 }), generateTree({ maxDepth: 0 })]) {
      const score = generateScore(tree)
      expect(score.notes.every((note) => note.pan === 0)).toBe(true)
      expect(score.notes.every((note) => Number.isFinite(note.midi) && Number.isFinite(note.timeSeconds))).toBe(true)
    }
  })

  it('schedules the specified C major chords and a four-bar tonic fade', () => {
    const score = generateScore(generateTree({ maxDepth: 4 }), { tempo: 60 })
    expect(score.chords.map((chord) => chord.timeSeconds)).toEqual([0, 8, 16, 24, 32, 40])
    expect(score.chords.slice(0, 4).map((chord) => chord.midi.map((midi) => midi % 12))).toEqual([
      [0, 4, 7, 11, 2], [9, 0, 4, 7, 11], [5, 9, 0, 4, 7], [7, 11, 2, 4, 9],
    ])
    expect(score.chords.slice(0, -1).every((chord) => chord.durationSeconds === 8 && chord.fadeOutSeconds === 0)).toBe(true)
    expect(score.chords.at(-1)).toEqual({
      timeSeconds: 40, durationSeconds: 16, midi: [48, 52, 55, 59, 62], fadeOutSeconds: 16,
    })
    expect(score.durationSeconds).toBe(56)
    expect(score.drone).toEqual({ timeSeconds: 0, durationSeconds: 56, midi: 24, fadeOutSeconds: 16 })
    expect(score.notes.every((note) => note.timeSeconds + note.durationSeconds <= score.durationSeconds)).toBe(true)
  })

  it('transposes chords and drone and resolves minor scores to their minor tonic', () => {
    const tree = generateTree({ maxDepth: 0 })
    const c = generateScore(tree)
    const d = generateScore(tree, { root: 2 })
    expect(d.chords[0].midi).toEqual(c.chords[0].midi.map((midi) => midi + 2))
    expect(d.drone.midi).toBe(c.drone.midi + 2)
    const minor = generateScore(tree, { root: 9, scale: 'minorPentatonic' })
    expect(minor.chords.at(-1)?.midi.map((midi) => midi % 12)).toEqual([9, 0, 4, 7, 11])
    expect(minor.drone.midi).toBe(33)
    expect(minor.durationSeconds).toBeCloseTo(24 * 60 / 70)
  })

  it('changes tempo without changing musical choices or scaling the 15ms humanization', () => {
    const tree = generateTree()
    const slow = generateScore(tree, { tempo: 60 })
    const fast = generateScore(tree, { tempo: 80 })
    expect(fast.durationSeconds).toBe(slow.durationSeconds * 0.75)
    const fastNotes = new Map(fast.notes.map((note) => [note.nodeId, note]))
    for (const note of slow.notes) {
      const other = fastNotes.get(note.nodeId)!
      expect(other.midi).toBe(note.midi)
      expect(other.velocity).toBe(note.velocity)
      expect(other.durationSeconds).toBeCloseTo(note.durationSeconds * 0.75)
      const beat = note.depth * 8 + note.slot * 0.5
      expect(other.timeSeconds - beat * 0.75).toBeCloseTo(note.timeSeconds - beat)
    }
  })

  it.each([
    { tempo: 59 }, { tempo: 81 }, { tempo: NaN }, { tempo: Infinity },
    { root: -1 }, { root: 12 }, { root: 0.5 }, { root: NaN },
    { scale: 'lydian' }, { scale: 'toString' },
  ])('rejects invalid musical parameters: %j', (parameters) => {
    expect(() => generateScore(generateTree({ maxDepth: 0 }), parameters as Partial<MusicParameters>)).toThrow(RangeError)
  })

  it('scores the maximum tree while preserving a cue for every branch', () => {
    const tree = generateTree({ maxDepth: 9, branching: 4 })
    const score = generateScore(tree)
    expect(score.cues).toHaveLength(349525)
    expect(new Set(score.cues.map((cue) => cue.nodeId)).size).toBe(tree.nodes.length)
    expect(score.chords).toHaveLength(11)
    expect(score.durationSeconds).toBeCloseTo(96 * 60 / 70)
    expect(score.notes.length).toBeLessThan(150)
  })
})
