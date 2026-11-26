import type { AlbumTrack } from './albumTracks'

export type AlbumStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export interface AlbumSnapshot {
  readonly status: AlbumStatus
  readonly positionSeconds: number
  readonly durationSeconds: number
  readonly trackId: string | null
  readonly volume: number
  readonly error: string | null
}

const SILENT_SPECTRUM: Float32Array<ArrayBuffer> = new Float32Array(256).fill(-Infinity)

/**
 * Plays a file from the album folder through its own Web Audio graph, with an
 * analyser on the master path for the frequency graph. Pausing suspends the
 * context, which freezes the clock and the spectrum exactly where they were.
 */
export class AlbumPlayer {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private data: Float32Array<ArrayBuffer> = SILENT_SPECTRUM
  private source: AudioBufferSourceNode | null = null
  private buffer: AudioBuffer | null = null
  private bufferUrl: string | null = null
  private startedAt = 0
  private trackId: string | null = null
  private status: AlbumStatus = 'idle'
  private volume: number
  private error: string | null = null
  private disposed = false
  private loadToken = 0
  private progressTimer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly onChange: (snapshot: AlbumSnapshot) => void,
    volume = 0.65,
  ) {
    this.volume = volume
  }

  get snapshot(): AlbumSnapshot {
    return {
      status: this.status,
      positionSeconds: this.currentPositionSeconds(),
      durationSeconds: this.buffer?.duration ?? 0,
      trackId: this.trackId,
      volume: this.volume,
      error: this.error,
    }
  }

  currentPositionSeconds(): number {
    if (this.status === 'idle' || !this.context) return 0
    if (this.status === 'ended') return this.buffer?.duration ?? 0
    return Math.max(0, Math.min(this.buffer?.duration ?? 0, this.context.currentTime - this.startedAt))
  }

  /** Spectrum in decibels; identical shape to the generated soundscape player. */
  currentFrequencyData(): ArrayLike<number> {
    if (!this.analyser || this.status !== 'playing') return SILENT_SPECTRUM
    this.analyser.getFloatFrequencyData(this.data)
    return this.data
  }

  private publish() {
    if (!this.disposed) this.onChange(this.snapshot)
  }

  private ensureGraph(): AudioContext {
    if (this.context) return this.context
    const context = new AudioContext({ latencyHint: 'playback' })
    const gain = context.createGain()
    gain.gain.value = this.volume
    // Connect straight to the output, then tap an analyser off the side. iOS
    // Safari silences a graph whose destination is reached only through an
    // AnalyserNode, so the analyser must not sit inline.
    gain.connect(context.destination)
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.8
    gain.connect(analyser)
    this.context = context
    this.gain = gain
    this.analyser = analyser
    this.data = new Float32Array(analyser.frequencyBinCount)
    return context
  }

  async play(track: AlbumTrack): Promise<void> {
    if (this.disposed) return
    const context = this.ensureGraph()

    // Resuming the same paused track continues from where it stopped.
    if (this.status === 'paused' && this.trackId === track.id) {
      await context.resume()
      this.status = 'playing'
      this.startProgress()
      this.publish()
      return
    }
    if (this.status === 'playing' && this.trackId === track.id) return

    const token = ++this.loadToken
    this.status = 'loading'
    this.trackId = track.id
    this.error = null
    this.publish()

    try {
      await context.resume()
      if (this.bufferUrl !== track.url || !this.buffer) {
        const response = await fetch(track.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = await response.arrayBuffer()
        const decoded = await context.decodeAudioData(bytes)
        if (this.disposed || token !== this.loadToken) return
        this.buffer = decoded
        this.bufferUrl = track.url
      }
      if (this.disposed || token !== this.loadToken) return
      this.stopSource()
      const source = context.createBufferSource()
      source.buffer = this.buffer
      source.connect(this.gain!)
      source.onended = () => {
        if (this.source === source) this.handleEnded()
      }
      source.start()
      this.source = source
      this.startedAt = context.currentTime
      this.status = 'playing'
      this.startProgress()
      this.publish()
    } catch {
      if (this.disposed || token !== this.loadToken) return
      this.status = 'error'
      this.error = 'That track could not be played. Check the file in beta-album/.'
      this.publish()
    }
  }

  async pause(): Promise<void> {
    if (this.status !== 'playing' || !this.context) return
    // Suspending freezes currentTime, so position and spectrum hold still.
    await this.context.suspend()
    this.stopProgress()
    this.status = 'paused'
    this.publish()
  }

  async stop(): Promise<void> {
    this.loadToken++
    this.stopSource()
    this.stopProgress()
    this.status = 'idle'
    this.trackId = null
    this.error = null
    if (this.context?.state === 'running') await this.context.suspend()
    this.publish()
  }

  setVolume(next: number) {
    if (!Number.isFinite(next) || next < 0 || next > 1) {
      throw new RangeError('volume must be between 0 and 1.')
    }
    this.volume = next
    if (this.gain && this.context) {
      this.gain.gain.setTargetAtTime(next, this.context.currentTime, 0.02)
    }
    this.publish()
  }

  async dispose(): Promise<void> {
    this.disposed = true
    this.stopProgress()
    this.stopSource()
    const context = this.context
    this.context = null
    this.gain = null
    this.analyser = null
    if (context) {
      try {
        await context.close()
      } catch {
        // Closing an already-closed context is harmless.
      }
    }
  }

  private handleEnded() {
    this.stopProgress()
    this.status = 'ended'
    this.publish()
  }

  private stopSource() {
    if (!this.source) return
    this.source.onended = null
    try {
      this.source.stop()
    } catch {
      // The source may already have finished.
    }
    this.source.disconnect()
    this.source = null
  }

  private startProgress() {
    this.stopProgress()
    this.progressTimer = setInterval(() => {
      if (this.status === 'playing') this.publish()
    }, 100)
  }

  private stopProgress() {
    if (this.progressTimer) clearInterval(this.progressTimer)
    this.progressTimer = undefined
  }
}
