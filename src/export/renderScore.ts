import * as Tone from 'tone'
import { createAudioGraph } from '../audio/createAudioGraph'
import type { MusicalScore } from '../music/generateScore'
import { EXPORT_SAMPLE_RATE, encodeWav } from './encodeWav'

/** Extra time so the last release and effect tails are captured. */
const TAIL_SECONDS = 1

/**
 * Render a score offline through the same audio graph used for playback.
 * Nothing is played aloud; the result is a 16-bit PCM WAV.
 */
export async function renderScoreToWav(
  score: MusicalScore,
  volume: number,
  sampleRate = EXPORT_SAMPLE_RATE,
): Promise<ArrayBuffer> {
  let graph: ReturnType<typeof createAudioGraph> | undefined
  try {
    const buffer = await Tone.Offline(async (context) => {
      graph = createAudioGraph(context, volume)
      // Reverb builds its impulse response asynchronously; schedule after it.
      await graph.ready
      graph.schedule(score)
      graph.gate.gain.value = 1
      context.transport.start(0)
    }, score.durationSeconds + TAIL_SECONDS, 2, sampleRate)

    const channels = Array.from(
      { length: buffer.numberOfChannels },
      (_, index) => buffer.getChannelData(index),
    )
    return encodeWav(channels, sampleRate)
  } finally {
    graph?.dispose()
  }
}
