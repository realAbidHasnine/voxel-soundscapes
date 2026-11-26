import { useCallback, useEffect, useRef, useState } from 'react'
import type { MusicalScore } from '../music/generateScore'
import { soundscapeFileName } from './encodeWav'
import { renderScoreToWav } from './renderScore'

export type ExportStatus = 'idle' | 'rendering' | 'error'

interface UseExportOptions {
  readonly score: MusicalScore
  readonly seed: number
  readonly volume: number
}

export function useExport({ score, seed, volume }: UseExportOptions) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)
  const url = useRef<string | null>(null)

  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = null
    }
  }, [])

  const download = useCallback(async () => {
    if (status === 'rendering') return
    setStatus('rendering')
    setError(null)
    const sessionCancelled = () => cancelled.current
    try {
      const wav = await renderScoreToWav(score, volume)
      if (sessionCancelled()) return
      if (url.current) URL.revokeObjectURL(url.current)
      const blobUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      url.current = blobUrl
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = soundscapeFileName(seed)
      anchor.click()
      setStatus('idle')
    } catch {
      if (sessionCancelled()) return
      setStatus('error')
      setError('Rendering the audio file did not finish. Try the download again.')
    }
  }, [score, seed, volume, status])

  return { status, error, download }
}
