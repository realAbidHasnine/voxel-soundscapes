import { useEffect, useRef, useState } from 'react'
import type { MusicalScore } from '../music/generateScore'
import { SoundscapePlayer } from './SoundscapePlayer'
import type { PlaybackSnapshot } from './SoundscapePlayer'

export function useSoundscape(score: MusicalScore) {
  const player = useRef<SoundscapePlayer | null>(null)
  const [volume, setVolumeState] = useState(0.65)
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>({
    status: 'idle', positionSeconds: 0, volume, error: null,
  })

  // Regrowing a tree replaces the player; keep the user's chosen volume.
  const volumeRef = useRef(volume)
  volumeRef.current = volume

  useEffect(() => {
    const instance = new SoundscapePlayer(score, setSnapshot, volumeRef.current)
    player.current = instance
    setSnapshot(instance.snapshot)
    return () => {
      player.current = null
      void instance.dispose()
    }
  }, [score])

  return {
    ...snapshot,
    volume,
    play: () => { void player.current?.play() },
    pause: () => { void player.current?.pause() },
    stop: () => { void player.current?.stop() },
    setVolume: (next: number) => {
      setVolumeState(next)
      player.current?.setVolume(next)
    },
    // Sampled per animation frame; reading state would lag behind the audio.
    getPositionSeconds: () => player.current?.currentPositionSeconds() ?? 0,
  }
}
