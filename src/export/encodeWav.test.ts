import { describe, expect, it } from 'vitest'
import { EXPORT_SAMPLE_RATE, encodeWav, soundscapeFileName } from './encodeWav'

function readAscii(view: DataView, offset: number, length: number) {
  let text = ''
  for (let index = 0; index < length; index++) text += String.fromCharCode(view.getUint8(offset + index))
  return text
}

function pcmSamples(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const count = (buffer.byteLength - 44) / 2
  return Array.from({ length: count }, (_, index) => view.getInt16(44 + index * 2, true))
}

describe('encodeWav', () => {
  it('writes a valid 16-bit PCM header for mono audio', () => {
    const buffer = encodeWav([Float32Array.from([0, 0.5, -0.5])])
    const view = new DataView(buffer)

    expect(readAscii(view, 0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8)
    expect(readAscii(view, 8, 4)).toBe('WAVE')
    expect(readAscii(view, 12, 4)).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16)
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(EXPORT_SAMPLE_RATE)
    expect(view.getUint32(28, true)).toBe(EXPORT_SAMPLE_RATE * 2) // byte rate
    expect(view.getUint16(32, true)).toBe(2) // block align
    expect(view.getUint16(34, true)).toBe(16)
    expect(readAscii(view, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(6)
    expect(buffer.byteLength).toBe(44 + 6)
  })

  it('describes stereo layout and interleaves channels', () => {
    const left = Float32Array.from([1, 0.25])
    const right = Float32Array.from([-1, 0])
    const buffer = encodeWav([left, right], 48_000)
    const view = new DataView(buffer)

    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(24, true)).toBe(48_000)
    expect(view.getUint32(28, true)).toBe(48_000 * 4)
    expect(view.getUint16(32, true)).toBe(4)
    expect(pcmSamples(buffer)).toEqual([32767, -32768, 8192, 0])
  })

  it('scales by the correct positive and negative full-scale ranges', () => {
    const samples = pcmSamples(encodeWav([Float32Array.from([0, 1, -1, 0.5, -0.5])]))
    expect(samples).toEqual([0, 32767, -32768, 16384, -16384])
  })

  it('clamps samples outside the valid range instead of wrapping', () => {
    const samples = pcmSamples(encodeWav([Float32Array.from([2, -2, 100, -100])]))
    expect(samples).toEqual([32767, -32768, 32767, -32768])
  })

  it('rounds to the nearest step rather than truncating toward zero', () => {
    const step = 1 / 32768
    const samples = pcmSamples(encodeWav([Float32Array.from([step * 1.4, step * 1.6, -step * 1.6])]))
    expect(samples).toEqual([1, 2, -2])
  })

  it('handles an empty channel as a header-only file', () => {
    const buffer = encodeWav([new Float32Array(0)])
    const view = new DataView(buffer)
    expect(buffer.byteLength).toBe(44)
    expect(view.getUint32(40, true)).toBe(0)
    expect(readAscii(view, 0, 4)).toBe('RIFF')
  })

  it('rejects invalid input', () => {
    expect(() => encodeWav([])).toThrow(RangeError)
    expect(() => encodeWav([new Float32Array(2)], 0)).toThrow(RangeError)
    expect(() => encodeWav([new Float32Array(2)], 1.5)).toThrow(RangeError)
    expect(() => encodeWav([new Float32Array(2), new Float32Array(3)])).toThrow(RangeError)
  })

  it('produces the expected size for one second of CD-quality stereo', () => {
    const frames = EXPORT_SAMPLE_RATE
    const buffer = encodeWav([new Float32Array(frames), new Float32Array(frames)])
    expect(buffer.byteLength).toBe(44 + frames * 4)
  })

  it('names files from the seed without unsafe characters', () => {
    const name = soundscapeFileName(4039281145)
    expect(name).toBe('recursive-soundscape-seed-4039281145.wav')
    expect(name).toMatch(/^[a-z0-9.\-]+$/)
  })
})
