import { presetById, type PresetId } from './presets'
import {
  DEFAULT_SOUND_PARAMETERS,
  SOUND_LIMITS,
  type SoundParameters,
} from './soundParameters'

/**
 * Short keys keep shared links readable. Everything is optional so old or
 * hand-edited links still load: unknown or invalid values fall back to defaults.
 */
const KEYS = {
  preset: 'p',
  seed: 's',
  maxDepth: 'd',
  branching: 'b',
  spreadDegrees: 'a',
  tempo: 't',
  root: 'r',
  scale: 'm',
} as const

const SCALE_CODES = { majorPentatonic: 'M', minorPentatonic: 'm' } as const

export interface SharedState {
  readonly presetId: PresetId
  readonly parameters: SoundParameters
}

/** Parse strict non-negative decimal digits; anything else is rejected. */
function parseCount(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

function readInteger(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = parseCount(params.get(key))
  if (value === null) return fallback
  // Clamp rather than reject, so a slightly out-of-range link still opens.
  return Math.min(max, Math.max(min, value))
}

/** Parse a query string (with or without a leading "?") into app state. */
export function decodeShareLink(search: string): SharedState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawPreset = params.get(KEYS.preset)
  const preset = rawPreset === 'forest' || rawPreset === 'midnight' || rawPreset === 'blossom'
    ? presetById(rawPreset)
    : null

  const scaleCode = params.get(KEYS.scale)
  const scale = scaleCode === SCALE_CODES.minorPentatonic
    ? 'minorPentatonic'
    : scaleCode === SCALE_CODES.majorPentatonic ? 'majorPentatonic' : null

  const seedValue = parseCount(params.get(KEYS.seed))
  const seed = seedValue !== null && seedValue <= 0xffff_ffff ? seedValue : null

  // A known preset supplies its own values as the baseline; otherwise use defaults.
  const baseline = preset?.parameters ?? DEFAULT_SOUND_PARAMETERS
  const parameters: SoundParameters = {
    seed: seed ?? baseline.seed,
    maxDepth: readInteger(params, KEYS.maxDepth, SOUND_LIMITS.maxDepth.min, SOUND_LIMITS.maxDepth.max, baseline.maxDepth),
    branching: readInteger(params, KEYS.branching, SOUND_LIMITS.branching.min, SOUND_LIMITS.branching.max, baseline.branching),
    spreadDegrees: readInteger(params, KEYS.spreadDegrees, SOUND_LIMITS.spreadDegrees.min, SOUND_LIMITS.spreadDegrees.max, baseline.spreadDegrees),
    tempo: readInteger(params, KEYS.tempo, SOUND_LIMITS.tempo.min, SOUND_LIMITS.tempo.max, baseline.tempo),
    root: readInteger(params, KEYS.root, 0, 11, baseline.root),
    scale: scale ?? baseline.scale,
  }

  return { presetId: preset?.id ?? 'forest', parameters }
}

/** Serialize state into a stable query string, so equal songs share one link. */
export function encodeShareLink({ presetId, parameters }: SharedState): string {
  const params = new URLSearchParams()
  params.set(KEYS.preset, presetId)
  params.set(KEYS.seed, String(parameters.seed))
  params.set(KEYS.maxDepth, String(parameters.maxDepth))
  params.set(KEYS.branching, String(parameters.branching))
  params.set(KEYS.spreadDegrees, String(parameters.spreadDegrees))
  params.set(KEYS.tempo, String(parameters.tempo))
  params.set(KEYS.root, String(parameters.root))
  params.set(KEYS.scale, SCALE_CODES[parameters.scale])
  return params.toString()
}

/** Read the current page URL, or null when there is nothing worth sharing. */
export function readShareLink(location: Pick<Location, 'search'>): SharedState | null {
  if (!location.search || location.search === '?') return null
  return decodeShareLink(location.search)
}
