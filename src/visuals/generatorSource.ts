export interface SourceLine {
  readonly id: string
  readonly text: string
}

/** The recursive generator, shown in the trace window under the tree. */
export const GENERATOR_SOURCE: readonly SourceLine[] = [
  { id: 'signature', text: 'function* grow(x, y, ang, len, depth) {' },
  { id: 'emit', text: '  yield { x, y, ang, len, depth };' },
  { id: 'leaf', text: '  if (depth >= maxDepth) return;' },
  { id: 'loop', text: '  for (let i = 0; i < branching; i++) {' },
  { id: 'jitter', text: '    const a = ang + t * 2 * spread + (rng() - 0.5) * 0.2;' },
  { id: 'recurse', text: '    yield* grow(nextX, nextY, a, len * ratio, depth + 1);' },
  { id: 'close', text: '  }' },
  { id: 'end', text: '}' },
]

export interface TraceSignal {
  readonly playing: boolean
  /** Current tree level, or null when the album is playing instead. */
  readonly depth: number | null
  readonly maxDepth: number
  readonly bass: number
  readonly mid: number
  readonly treble: number
}

const BASS_GATE = 0.3
const MID_GATE = 0.25
const TREBLE_GATE = 0.3
const JITTER_GATE = 0.5

/**
 * Which lines are "executing" right now. The generated soundscape walks the
 * recursion by depth; an album has no depth, so the spectrum drives the trace.
 */
export function activeLineIds(signal: TraceSignal): ReadonlySet<string> {
  const active = new Set<string>()
  if (!signal.playing) return active
  active.add('signature')
  active.add('emit')

  if (signal.depth === null) {
    if (signal.bass > BASS_GATE) active.add('recurse')
    if (signal.mid > MID_GATE) active.add('loop')
    if (signal.treble > TREBLE_GATE) active.add('jitter')
    return active
  }

  if (signal.depth >= signal.maxDepth) {
    active.add('leaf')
    return active
  }
  active.add('loop')
  active.add('recurse')
  if (signal.treble > JITTER_GATE) active.add('jitter')
  return active
}
