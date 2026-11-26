import { describe, expect, it } from 'vitest'
import { generateScore } from '../music/generateScore'
import { generateTree } from '../tree/generateTree'
import {
  DEFAULT_PRESET,
  PRESETS,
  presetById,
  type PresetId,
} from './presets'
import {
  LARGE_TREE_BRANCHES,
  SOUND_LIMITS,
  branchCount,
  musicParametersFor,
  scaleLabel,
  treeParametersFor,
} from './soundParameters'

describe('presets', () => {
  it('ships the three documented presets with distinct sounds', () => {
    expect(PRESETS.map((preset) => preset.name)).toEqual([
      'Forest Canopy', 'Midnight Rain', 'Cherry Blossom',
    ])
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length)
    expect(new Set(PRESETS.map((preset) => preset.parameters.root)).size).toBe(PRESETS.length)
  })

  it('matches the musical settings described in the brief', () => {
    expect(scaleLabel(presetById('forest').parameters)).toBe('C major')
    expect(scaleLabel(presetById('midnight').parameters)).toBe('A minor')
    expect(scaleLabel(presetById('blossom').parameters)).toBe('D major')
  })

  it('keeps every preset inside the supported limits and fast to build', () => {
    for (const preset of PRESETS) {
      for (const [key, limits] of Object.entries(SOUND_LIMITS)) {
        const value = preset.parameters[key as keyof typeof SOUND_LIMITS]
        expect(value).toBeGreaterThanOrEqual(limits.min)
        expect(value).toBeLessThanOrEqual(limits.max)
      }
      const branches = branchCount(preset.parameters.maxDepth, preset.parameters.branching)
      expect(branches).toBeLessThanOrEqual(LARGE_TREE_BRANCHES)
    }
  })

  it('generates a playable tree and score from every preset', () => {
    for (const preset of PRESETS) {
      const tree = generateTree(treeParametersFor(preset.parameters))
      const score = generateScore(tree, musicParametersFor(preset.parameters))
      expect(tree.nodes.length).toBe(
        branchCount(preset.parameters.maxDepth, preset.parameters.branching),
      )
      expect(score.notes.length).toBeGreaterThan(0)
      expect(score.durationSeconds).toBeGreaterThan(0)
      expect(score.chords.length).toBe(tree.levels.length + 1)
    }
  })

  it('gives each preset its own readable palette', () => {
    for (const preset of PRESETS) {
      expect(preset.palette.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(preset.palette.background).toMatch(/^#[0-9a-f]{6}$/i)
      expect(preset.palette.glow).toMatch(/^#[0-9a-f]{6}$/i)
      expect(preset.palette.saturation).toBeGreaterThan(0)
      expect(preset.palette.saturation).toBeLessThanOrEqual(100)
      for (const lightness of [preset.palette.lightnessStart, preset.palette.lightnessEnd]) {
        expect(lightness).toBeGreaterThan(0)
        expect(lightness).toBeLessThanOrEqual(100)
      }
    }
    expect(new Set(PRESETS.map((preset) => preset.palette.background)).size).toBe(PRESETS.length)
  })

  it('falls back to the default preset for an unknown id', () => {
    expect(presetById('nope' as PresetId)).toBe(DEFAULT_PRESET)
    expect(DEFAULT_PRESET.id).toBe('forest')
  })

  it('is deterministic: the same preset always produces the same score', () => {
    for (const preset of PRESETS) {
      const build = () => {
        const tree = generateTree(treeParametersFor(preset.parameters))
        return generateScore(tree, musicParametersFor(preset.parameters))
      }
      expect(build()).toEqual(build())
    }
  })
})
