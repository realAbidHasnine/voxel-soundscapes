import { describe, expect, it } from 'vitest'
import { bandEnergy, frequencyBars, normalizeDecibels } from './frequencyBars'

describe('normalizeDecibels', () => {
  it('maps the audible range onto 0..1 and clamps outside it', () => {
    expect(normalizeDecibels(-95)).toBe(0)
    expect(normalizeDecibels(-10)).toBe(1)
    expect(normalizeDecibels(0)).toBe(1)
    expect(normalizeDecibels(-200)).toBe(0)
    expect(normalizeDecibels(-52.5)).toBeCloseTo(0.5, 2)
  })

  it('treats non-finite input as silence', () => {
    for (const value of [-Infinity, Infinity, NaN]) expect(normalizeDecibels(value)).toBe(0)
  })
})

describe('frequencyBars', () => {
  it('always returns the requested number of bars', () => {
    expect(frequencyBars([], 8)).toHaveLength(8)
    expect(frequencyBars(new Float32Array(64), 8)).toHaveLength(8)
    expect(frequencyBars([-50, -60], 1)).toHaveLength(1)
    expect(frequencyBars([-50], 0)).toHaveLength(0)
  })

  it('returns silence for empty input', () => {
    expect(frequencyBars([], 4)).toEqual([0, 0, 0, 0])
  })

  it('keeps every bar within 0..1', () => {
    const values = Array.from({ length: 128 }, (_, index) => -120 + index)
    for (const bar of frequencyBars(values, 16)) {
      expect(bar).toBeGreaterThanOrEqual(0)
      expect(bar).toBeLessThanOrEqual(1)
    }
  })

  it('responds to louder input with taller bars', () => {
    const quiet = new Float32Array(64).fill(-90)
    const loud = new Float32Array(64).fill(-20)
    const quietBars = frequencyBars(quiet, 8)
    const loudBars = frequencyBars(loud, 8)
    for (const [index, bar] of loudBars.entries()) {
      expect(bar).toBeGreaterThan(quietBars[index])
    }
  })

  it('covers every bin without leaving gaps in a sparse FFT', () => {
    const values = new Float32Array(32).fill(-95)
    values[31] = -10
    const bars = frequencyBars(values, 8)
    expect(Math.max(...bars)).toBeGreaterThan(0)
  })
})

describe('bandEnergy', () => {
  it('splits the spectrum into bass, mid, and treble', () => {
    const values = new Float32Array(100).fill(-95)
    for (let bin = 0; bin < 10; bin++) values[bin] = -10
    const energy = bandEnergy(values)
    expect(energy.bass).toBeGreaterThan(energy.mid)
    expect(energy.bass).toBeGreaterThan(energy.treble)
    expect(energy.mid).toBeLessThan(0.1)
  })

  it('returns zeros for an empty spectrum', () => {
    expect(bandEnergy([])).toEqual({ bass: 0, mid: 0, treble: 0 })
  })

  it('keeps bands within 0..1', () => {
    const loud = new Float32Array(64).fill(-5)
    const energy = bandEnergy(loud)
    for (const value of [energy.bass, energy.mid, energy.treble]) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
      expect(value).toBeCloseTo(1, 5)
    }
  })
})
