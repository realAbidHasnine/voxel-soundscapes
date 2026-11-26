import { describe, expect, it } from 'vitest'
import { generateScore } from '../music/generateScore'
import { generateTree } from '../tree/generateTree'
import {
  DEFAULT_SOUND_PARAMETERS,
  LARGE_TREE_BRANCHES,
  SOUND_LIMITS,
  branchCount,
  musicParametersFor,
  NOTE_NAMES,
  randomSeed,
  scaleLabel,
  treeParametersFor,
  type SoundParameters,
} from './soundParameters'

describe('soundParameters', () => {
  it('maps display units onto generator parameters', () => {
    const parameters: SoundParameters = {
      seed: 42, maxDepth: 7, branching: 3, spreadDegrees: 45, tempo: 65,
      root: 2, scale: 'minorPentatonic',
    }
    expect(treeParametersFor(parameters)).toEqual({
      seed: 42, maxDepth: 7, branching: 3, spread: Math.PI / 4, ratio: 0.7,
    })
    expect(musicParametersFor(parameters)).toEqual({
      tempo: 65, root: 2, scale: 'minorPentatonic',
    })
  })

  it('labels the scale from the root and mode', () => {
    expect(scaleLabel({ root: 0, scale: 'majorPentatonic' })).toBe('C major')
    expect(scaleLabel({ root: 9, scale: 'minorPentatonic' })).toBe('A minor')
    expect(scaleLabel({ root: 2, scale: 'majorPentatonic' })).toBe('D major')
    for (let root = 0; root < 12; root++) {
      expect(NOTE_NAMES[root]).toBeTruthy()
    }
  })

  it('produces parameters the generators accept at every limit', () => {
    const corners: SoundParameters[] = []
    for (const maxDepth of [SOUND_LIMITS.maxDepth.min, SOUND_LIMITS.maxDepth.max]) {
      for (const branching of [SOUND_LIMITS.branching.min, SOUND_LIMITS.branching.max]) {
        for (const spreadDegrees of [SOUND_LIMITS.spreadDegrees.min, SOUND_LIMITS.spreadDegrees.max]) {
          for (const tempo of [SOUND_LIMITS.tempo.min, SOUND_LIMITS.tempo.max]) {
            corners.push({
              seed: 7, maxDepth, branching, spreadDegrees, tempo,
              root: 0, scale: 'majorPentatonic',
            })
          }
        }
      }
    }
    for (const parameters of corners) {
      const tree = generateTree(treeParametersFor(parameters))
      const score = generateScore(tree, musicParametersFor(parameters))
      expect(tree.nodes.length).toBe(branchCount(parameters.maxDepth, parameters.branching))
      expect(score.durationSeconds).toBeGreaterThan(0)
    }
  })

  it('counts every branch in a full tree', () => {
    expect(branchCount(0, 2)).toBe(1)
    expect(branchCount(1, 2)).toBe(3)
    expect(branchCount(2, 3)).toBe(13)
    expect(branchCount(9, 4)).toBe(349525)
    expect(branchCount(6, 2)).toBe(127)
  })

  it('flags only configurations above the heavy threshold', () => {
    expect(branchCount(6, 2)).toBeLessThanOrEqual(LARGE_TREE_BRANCHES)
    expect(branchCount(9, 4)).toBeGreaterThan(LARGE_TREE_BRANCHES)
  })

  it('keeps the defaults inside their own limits and small enough to be instant', () => {
    for (const [key, limits] of Object.entries(SOUND_LIMITS)) {
      const value = DEFAULT_SOUND_PARAMETERS[key as keyof typeof SOUND_LIMITS]
      expect(value).toBeGreaterThanOrEqual(limits.min)
      expect(value).toBeLessThanOrEqual(limits.max)
    }
    expect(branchCount(DEFAULT_SOUND_PARAMETERS.maxDepth, DEFAULT_SOUND_PARAMETERS.branching))
      .toBeLessThan(LARGE_TREE_BRANCHES)
  })

  it('returns a different unsigned 32-bit seed', () => {
    for (const random of [() => 0, () => 0.5, () => 0.999999, () => 0.25]) {
      const seed = randomSeed(123, random)
      expect(seed).not.toBe(123)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0xffff_ffff)
    }
  })

  it('never repeats the previous seed even if the source does', () => {
    expect(randomSeed(5, () => 5 / 0x1_0000_0000)).toBe(6)
    expect(randomSeed(0xffff_ffff, () => (0xffff_ffff + 1) / 0x1_0000_0000)).toBe(0)
  })
})
