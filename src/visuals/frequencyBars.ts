export interface BarsOptions {
  readonly minDb?: number
  readonly maxDb?: number
}

/** Map a decibel value onto 0..1; non-finite input reads as silence. */
export function normalizeDecibels(db: number, minDb = -95, maxDb = -10): number {
  if (!Number.isFinite(db)) return 0
  return Math.min(1, Math.max(0, (db - minDb) / (maxDb - minDb)))
}

/**
 * Group FFT bins into bars with log-like spacing, so the low end does not
 * collapse into a single bar. Returns normalized heights.
 */
export function frequencyBars(
  values: ArrayLike<number>,
  barCount: number,
  options: BarsOptions = {},
): number[] {
  const bars: number[] = []
  if (barCount <= 0) return bars
  const binCount = values.length
  if (binCount === 0) {
    for (let bar = 0; bar < barCount; bar++) bars.push(0)
    return bars
  }
  const { minDb, maxDb } = options
  for (let bar = 0; bar < barCount; bar++) {
    // Squaring the fraction widens later bars, approximating a log scale.
    const start = Math.floor((binCount - 1) * (bar / barCount) ** 2)
    const end = Math.max(
      start + 1,
      Math.floor((binCount - 1) * ((bar + 1) / barCount) ** 2) + 1,
    )
    let sum = 0
    for (let bin = start; bin < end; bin++) {
      sum += normalizeDecibels(values[bin], minDb, maxDb)
    }
    bars.push(sum / (end - start))
  }
  return bars
}

export interface BandEnergy {
  readonly bass: number
  readonly mid: number
  readonly treble: number
}

/**
 * Rough three-band split used to drive the function trace. Peaks rather than
 * averages, because averaging over wide bands buries a single loud note.
 */
export function bandEnergy(values: ArrayLike<number>, options: BarsOptions = {}): BandEnergy {
  if (values.length === 0) return { bass: 0, mid: 0, treble: 0 }
  const peak = (from: number, to: number) => {
    const start = Math.floor(values.length * from)
    const end = Math.max(start + 1, Math.floor(values.length * to))
    let highest = 0
    for (let bin = start; bin < end && bin < values.length; bin++) {
      highest = Math.max(highest, normalizeDecibels(values[bin], options.minDb, options.maxDb))
    }
    return highest
  }
  return { bass: peak(0, 0.12), mid: peak(0.12, 0.45), treble: peak(0.45, 1) }
}
