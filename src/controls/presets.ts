import type { TreePalette } from '../visuals/treePalette'
import { FOREST_PALETTE } from '../visuals/treePalette'
import type { SoundParameters } from './soundParameters'

export type PresetId = 'forest' | 'midnight' | 'blossom'

export interface Preset {
  readonly id: PresetId
  readonly name: string
  readonly description: string
  readonly parameters: SoundParameters
  readonly palette: TreePalette
}

/** C major pentatonic, greens, calm and open. */
const FOREST: Preset = {
  id: 'forest',
  name: 'Forest Canopy',
  description: 'C major, open and green',
  parameters: { seed: 1, maxDepth: 6, branching: 2, spreadDegrees: 30, tempo: 70, root: 0, scale: 'majorPentatonic' },
  palette: FOREST_PALETTE,
}

/** A minor pentatonic, cool blues, slower and lower. */
const MIDNIGHT: Preset = {
  id: 'midnight',
  name: 'Midnight Rain',
  description: 'A minor, cool and slow',
  parameters: { seed: 7, maxDepth: 7, branching: 2, spreadDegrees: 22, tempo: 60, root: 9, scale: 'minorPentatonic' },
  palette: {
    hueStart: 218,
    hueEnd: 190,
    saturation: 48,
    lightnessStart: 40,
    lightnessEnd: 70,
    glow: '#1b2a44',
    background: '#0c1220',
    accent: '#a5c8f0',
    panel: '#111c30e0',
  },
}

/** D major pentatonic, warm pinks, more branching. */
const BLOSSOM: Preset = {
  id: 'blossom',
  name: 'Cherry Blossom',
  description: 'D major, warm and full',
  parameters: { seed: 21, maxDepth: 6, branching: 3, spreadDegrees: 38, tempo: 66, root: 2, scale: 'majorPentatonic' },
  palette: {
    hueStart: 348,
    hueEnd: 328,
    saturation: 58,
    lightnessStart: 46,
    lightnessEnd: 76,
    glow: '#43202e',
    background: '#1d1016',
    accent: '#fbcfe8',
    panel: '#2a1520e0',
  },
}

export const PRESETS: readonly Preset[] = [FOREST, MIDNIGHT, BLOSSOM]

export const DEFAULT_PRESET = FOREST

export function presetById(id: PresetId): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET
}
