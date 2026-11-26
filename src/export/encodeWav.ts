/** 44.1 kHz is standard for web audio and plays everywhere. */
export const EXPORT_SAMPLE_RATE = 44_100

const BITS_PER_SAMPLE = 16
const WAV_HEADER_BYTES = 44

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index++) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

/** Clamp to [-1, 1) and convert to signed 16-bit PCM. */
function toPcm16(sample: number) {
  const clamped = Math.max(-1, Math.min(1, sample))
  return Math.round(clamped * (clamped < 0 ? 0x8000 : 0x7fff))
}

/**
 * Encode interleaved float channels as a 16-bit PCM WAV file.
 * Channels must be the same length; the first channel sets the duration.
 */
export function encodeWav(channels: readonly Float32Array[], sampleRate = EXPORT_SAMPLE_RATE): ArrayBuffer {
  if (channels.length === 0) throw new RangeError('at least one channel is required.')
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError('sampleRate must be a positive integer.')
  }
  const frames = channels[0].length
  for (const channel of channels) {
    if (channel.length !== frames) throw new RangeError('all channels must have the same length.')
  }

  const channelCount = channels.length
  const bytesPerSample = BITS_PER_SAMPLE / 8
  const blockAlign = channelCount * bytesPerSample
  const dataBytes = frames * blockAlign
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // format: PCM
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BITS_PER_SAMPLE, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataBytes, true)

  let offset = WAV_HEADER_BYTES
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      view.setInt16(offset, toPcm16(channels[channel][frame]), true)
      offset += bytesPerSample
    }
  }
  return buffer
}

/** A descriptive, filesystem-safe name for a rendered soundscape. */
export function soundscapeFileName(seed: number): string {
  return `recursive-soundscape-seed-${seed}.wav`
}
