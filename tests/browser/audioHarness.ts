import * as Tone from 'tone'
import { createAudioGraph } from '../../src/audio/createAudioGraph'
import { SoundscapePlayer } from '../../src/audio/SoundscapePlayer'
import { generateScore } from '../../src/music/generateScore'
import { generateTree } from '../../src/tree/generateTree'

/** Render the same graph used by the player using a real browser's Web Audio. */
export async function renderAudioCheck() {
  const score = generateScore(generateTree())
  let graph: ReturnType<typeof createAudioGraph> | undefined
  try {
    const buffer = await Tone.Offline(async (context) => {
      graph = createAudioGraph(context, 0.65)
      await graph.ready
      graph.schedule(score)
      graph.gate.gain.value = 1
      context.transport.start(0)
    }, score.durationSeconds + 1, 2, 22050)
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    function stats(start: number, end: number) {
      let peak = 0
      let sum = 0
      let stereoSum = 0
      let finite = true
      const first = Math.floor(start * 22050)
      const last = Math.min(left.length, Math.floor(end * 22050))
      for (let i = first; i < last; i++) {
        finite &&= Number.isFinite(left[i]) && Number.isFinite(right[i])
        peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
        sum += left[i] ** 2 + right[i] ** 2
        stereoSum += (left[i] - right[i]) ** 2
      }
      return { peak, rms: Math.sqrt(sum / (2 * (last - first))), stereoRms: Math.sqrt(stereoSum / (last - first)), finite }
    }
    return {
      all: stats(0, score.durationSeconds),
      pad: stats(2, 6),
      rhodes: stats(16, 22),
      chime: stats(36, 42),
      tail: stats(score.tailStartSeconds, score.tailStartSeconds + 2),
      ending: stats(score.durationSeconds - 0.1, score.durationSeconds),
      after: stats(score.durationSeconds + 0.1, score.durationSeconds + 0.9),
    }
  } finally {
    graph?.dispose()
  }
}

export async function exerciseLifecycle() {
  const base = generateScore(generateTree({ maxDepth: 0 }))
  const score = {
    ...base,
    notes: base.notes.map((note) => ({ ...note, durationSeconds: 0.2 })),
    chords: [
      { ...base.chords[0], durationSeconds: 0.5 },
      { ...base.chords[1], timeSeconds: 0.5, durationSeconds: 1, fadeOutSeconds: 1 },
    ],
    drone: { ...base.drone, durationSeconds: 1.5, fadeOutSeconds: 1 },
    tailStartSeconds: 0.5,
    durationSeconds: 1.5,
  }
  let onEnd = () => {}
  const player = new SoundscapePlayer(score, (snapshot) => {
    if (snapshot.status === 'ended') onEnd()
  })
  try {
    const starting = player.play()
    await player.stop()
    await starting
    const stoppedDuringLoading = player.snapshot
    const finished = new Promise<void>((resolve) => { onEnd = resolve })
    await player.play()
    await finished
    const ended = player.snapshot
    await player.play()
    const replaying = player.snapshot.status
    await player.stop()
    const restarting = player.play()
    await player.dispose()
    await restarting
    return { stoppedDuringLoading, ended, replaying, disposed: player.snapshot.status }
  } finally {
    await player.dispose()
  }
}
