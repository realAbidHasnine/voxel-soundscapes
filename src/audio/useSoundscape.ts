import { useEffect, useRef, useState } from 'react'
import type { MusicalScore } from '../music/generateScore'
import { SoundscapePlayer } from './SoundscapePlayer'
import type { PlaybackSnapshot } from './SoundscapePlayer'

export function useSoundscape(score: MusicalScore) {
  const player = useRef<SoundscapePlayer | null>(null)
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>({
    status: 'idle', positionSeconds: 0, volume: 0.65, error: null,
  })

  useEffect(() => {
    const instance = new SoundscapePlayer(score, setSnapshot)
    player.current = instance
    setSnapshot(instance.snapshot)
    return () => {
      player.current = null
      void instance.dispose()
    }
  }, [score])

  return {
    ...snapshot,
    play: () => { void player.current?.play() },
    pause: () => { void player.current?.pause() },
    stop: () => { void player.current?.stop() },
    setVolume: (volume: number) => player.current?.setVolume(volume),
  }
}
