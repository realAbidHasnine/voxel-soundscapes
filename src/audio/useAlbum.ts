import { useEffect, useRef, useState } from 'react'
import { AlbumPlayer } from './AlbumPlayer'
import type { AlbumSnapshot } from './AlbumPlayer'
import type { AlbumTrack } from './albumTracks'

const EMPTY_SPECTRUM = new Float32Array(256).fill(-Infinity)

export function useAlbum() {
  const player = useRef<AlbumPlayer | null>(null)
  const [volume, setVolumeState] = useState(0.65)
  const [snapshot, setSnapshot] = useState<AlbumSnapshot>({
    status: 'idle', positionSeconds: 0, durationSeconds: 0, trackId: null, volume, error: null,
  })

  const volumeRef = useRef(volume)
  volumeRef.current = volume

  useEffect(() => {
    const instance = new AlbumPlayer(setSnapshot, volumeRef.current)
    player.current = instance
    return () => {
      player.current = null
      void instance.dispose()
    }
  }, [])

  return {
    ...snapshot,
    volume,
    play: (track: AlbumTrack) => { void player.current?.play(track) },
    pause: () => { void player.current?.pause() },
    stop: () => { void player.current?.stop() },
    setVolume: (next: number) => {
      setVolumeState(next)
      player.current?.setVolume(next)
    },
    getPositionSeconds: () => player.current?.currentPositionSeconds() ?? 0,
    getFrequencyData: () => player.current?.currentFrequencyData() ?? EMPTY_SPECTRUM,
  }
}
