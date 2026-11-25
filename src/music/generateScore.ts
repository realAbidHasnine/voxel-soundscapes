import { mulberry32 } from '../random/mulberry32'
import type { RecursiveTree } from '../tree/generateTree'

const SCALES = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
} as const

export interface MusicParameters {
  readonly tempo: number
  /** Pitch class: C = 0, C# = 1, …, B = 11. */
  readonly root: number
  readonly scale: keyof typeof SCALES
}

export interface BranchCue {
  readonly nodeId: number
  readonly depth: number
  readonly slot: number
  readonly timeSeconds: number
}

export interface NoteEvent extends BranchCue {
  readonly midi: number
  readonly durationSeconds: number
  readonly velocity: number
  readonly pan: number
  readonly reverbSend: number
  readonly instrument: 'pad' | 'rhodes' | 'chime'
}

export interface ChordEvent {
  readonly timeSeconds: number
  readonly durationSeconds: number
  readonly midi: readonly number[]
  /** Fade during the final portion of this event; zero for regular chords. */
  readonly fadeOutSeconds: number
}

export interface DroneEvent {
  readonly timeSeconds: number
  readonly durationSeconds: number
  readonly midi: number
  readonly fadeOutSeconds: number
}

export interface MusicalScore {
  readonly parameters: MusicParameters
  readonly notes: readonly NoteEvent[]
  readonly chords: readonly ChordEvent[]
  readonly drone: DroneEvent
  /** Includes silent branches. Sounding branches share their note's exact time. */
  readonly cues: readonly BranchCue[]
  readonly tailStartSeconds: number
  readonly durationSeconds: number
}

export const DEFAULT_MUSIC_PARAMETERS: MusicParameters = Object.freeze({
  tempo: 70,
  root: 0,
  scale: 'majorPentatonic',
})

// Semitones above the tonic at octave 3. Major: Imaj9–vi9–IVmaj9–V6/9.
const MAJOR_CHORDS = [
  [0, 4, 7, 11, 14],
  [9, 12, 16, 19, 23],
  [5, 9, 12, 16, 19],
  [7, 11, 14, 16, 21],
] as const

// Natural minor counterpart: i9–VImaj9–iv9–v7(add11).
const MINOR_CHORDS = [
  [0, 3, 7, 10, 14],
  [8, 12, 15, 19, 22],
  [5, 8, 12, 15, 19],
  [7, 10, 14, 17, 24],
] as const

function chronological(a: BranchCue, b: BranchCue) {
  return a.timeSeconds - b.timeSeconds || a.nodeId - b.nodeId
}

/** A pure score builder for trees returned by generateTree; no audio is started. */
export function generateScore(
  tree: RecursiveTree,
  overrides: Partial<MusicParameters> = {},
): MusicalScore {
  const parameters = { ...DEFAULT_MUSIC_PARAMETERS, ...overrides }
  const { tempo, root, scale } = parameters
  if (!Number.isFinite(tempo) || tempo < 60 || tempo > 80) {
    throw new RangeError('tempo must be between 60 and 80 BPM.')
  }
  if (!Number.isInteger(root) || root < 0 || root > 11) {
    throw new RangeError('root must be an integer pitch class from 0 to 11.')
  }
  if (scale !== 'majorPentatonic' && scale !== 'minorPentatonic') {
    throw new RangeError('scale must be majorPentatonic or minorPentatonic.')
  }

  const scaleDegrees: readonly number[] = SCALES[scale]
  const availablePitches = Array.from({ length: 61 }, (_, i) => i + 36)
    .filter((midi) => scaleDegrees.includes((midi - root + 12) % 12))
  // Separate the musical random sequence from the geometry's random sequence.
  const random = mulberry32((tree.parameters.seed ^ 0x4d555349) >>> 0)
  const secondsPerBeat = 60 / tempo
  const levelSeconds = 8 * secondsPerBeat // Two bars of 4/4.
  const tailSeconds = 16 * secondsPerBeat
  const tailStartSeconds = tree.levels.length * levelSeconds
  const durationSeconds = tailStartSeconds + tailSeconds
  const chordPattern = scale === 'majorPentatonic' ? MAJOR_CHORDS : MINOR_CHORDS
  const width = tree.bounds.maxX - tree.bounds.minX
  const stereoWidth = tree.parameters.spread / (Math.PI / 2)
  const rawNotes: NoteEvent[] = []
  const cues: BranchCue[] = []
  const chords: ChordEvent[] = []

  for (const [depth, level] of tree.levels.entries()) {
    const levelStart = depth * levelSeconds
    chords.push({
      timeSeconds: levelStart,
      durationSeconds: levelSeconds,
      midi: chordPattern[depth % 4].map((offset) => 48 + root + offset),
      fadeOutSeconds: 0,
    })

    // Iterate rather than spreading the array: the largest level has 262,144 nodes.
    let minAngle = Infinity
    let maxAngle = -Infinity
    for (const node of level) {
      minAngle = Math.min(minAngle, node.angle)
      maxAngle = Math.max(maxAngle, node.angle)
    }

    for (const [index, node] of level.entries()) {
      const slot = Math.floor(index * 16 / level.length)
      const plays = random() < Math.min(1, 6 / level.length)
      const timingOffset = (random() - 0.5) * 0.03
      const velocityOffset = (random() - 0.5) * 0.1
      const gridTime = levelStart + slot * 0.5 * secondsPerBeat
      // Keep notes at the start of a level from preceding their supporting chord.
      const timeSeconds = plays ? Math.max(levelStart, gridTime + timingOffset) : gridTime
      const cue = { nodeId: node.id, depth, slot, timeSeconds }
      cues.push(cue)
      if (!plays) continue

      const normalizedAngle = maxAngle === minAngle
        ? 0.5
        : (node.angle - minAngle) / (maxAngle - minAngle)
      const degree = Math.min(scaleDegrees.length - 1, Math.floor(normalizedAngle * scaleDegrees.length))
      // Standard MIDI octave numbering: C2 = 36.
      const octave = Math.min(6, 2 + Math.floor(depth / 2))
      const desiredMidi = root + 12 * (octave + 1) + scaleDegrees[degree]
      const pitchIndex = availablePitches.findIndex((midi) => midi >= desiredMidi)
      const midi = availablePitches[pitchIndex < 0 ? availablePitches.length - 1 : pitchIndex]
      const normalizedX = width > 1e-12 ? (node.x - tree.bounds.minX) / width : 0.5

      rawNotes.push({
        ...cue,
        midi,
        durationSeconds: Math.max(0.25, node.length / tree.nodes[0].length * 4) * secondsPerBeat,
        velocity: Math.max(0.15, 0.7 - depth * 0.06) + velocityOffset,
        pan: Math.max(-0.8, Math.min(0.8, (normalizedX - 0.5) * 1.6)) * stereoWidth,
        reverbSend: 0.25 + depth * 0.07,
        instrument: depth < 2 ? 'pad' : depth < 5 ? 'rhodes' : 'chime',
      })
    }
  }

  // Humanization can reorder notes in a shared slot; avoid repeats in audible order.
  rawNotes.sort(chronological)
  let previousMidi = -1
  const notes = rawNotes.map((note) => {
    let midi = note.midi
    if (midi === previousMidi) {
      const index = availablePitches.indexOf(midi)
      midi = availablePitches[index === availablePitches.length - 1 ? index - 1 : index + 1]
    }
    previousMidi = midi
    return { ...note, midi }
  })
  cues.sort(chronological)
  chords.push({
    timeSeconds: tailStartSeconds,
    durationSeconds: tailSeconds,
    midi: chordPattern[0].map((offset) => 48 + root + offset),
    fadeOutSeconds: tailSeconds,
  })

  return {
    parameters,
    notes,
    chords,
    drone: {
      timeSeconds: 0,
      durationSeconds,
      midi: 24 + root,
      fadeOutSeconds: tailSeconds,
    },
    cues,
    tailStartSeconds,
    durationSeconds,
  }
}
