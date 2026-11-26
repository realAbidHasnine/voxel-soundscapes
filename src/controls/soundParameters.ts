import type { MusicParameters } from '../music/generateScore'
import { DEFAULT_MUSIC_PARAMETERS } from '../music/generateScore'
import type { TreeParameters } from '../tree/generateTree'
import { DEFAULT_TREE_PARAMETERS } from '../tree/generateTree'

/** Everything the interface can change, kept in display units. */
export interface SoundParameters {
  readonly seed: number
  readonly maxDepth: number
  readonly branching: number
  /** Fan angle in degrees; the tree works in radians. */
  readonly spreadDegrees: number
  readonly tempo: number
}

export const SOUND_LIMITS = {
  maxDepth: { min: 4, max: 9 },
  branching: { min: 2, max: 4 },
  spreadDegrees: { min: 10, max: 90 },
  tempo: { min: 60, max: 80 },
} as const

export const DEFAULT_SOUND_PARAMETERS: SoundParameters = Object.freeze({
  seed: DEFAULT_TREE_PARAMETERS.seed,
  maxDepth: 6,
  branching: 2,
  spreadDegrees: 30,
  tempo: DEFAULT_MUSIC_PARAMETERS.tempo,
})

/** Above this, generating and animating the tree can feel heavy. */
export const LARGE_TREE_BRANCHES = 50_000

export function treeParametersFor(parameters: SoundParameters): TreeParameters {
  return {
    seed: parameters.seed,
    maxDepth: parameters.maxDepth,
    branching: parameters.branching,
    spread: (parameters.spreadDegrees * Math.PI) / 180,
    ratio: DEFAULT_TREE_PARAMETERS.ratio,
  }
}

export function musicParametersFor(parameters: SoundParameters): MusicParameters {
  return {
    tempo: parameters.tempo,
    root: DEFAULT_MUSIC_PARAMETERS.root,
    scale: DEFAULT_MUSIC_PARAMETERS.scale,
  }
}

/** Total branches for a full tree: one root plus every branching level. */
export function branchCount(maxDepth: number, branching: number): number {
  let total = 0
  let level = 1
  for (let depth = 0; depth <= maxDepth; depth++) {
    total += level
    level *= branching
  }
  return total
}

/** A different 32-bit seed, falling back to the next seed if the source repeats. */
export function randomSeed(previous: number, random: () => number = Math.random): number {
  for (let attempt = 0; attempt < 8; attempt++) {
    const seed = Math.floor(random() * 0x1_0000_0000) >>> 0
    if (seed !== previous) return seed
  }
  return (previous + 1) >>> 0
}
