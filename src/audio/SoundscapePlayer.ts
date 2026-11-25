import * as Tone from 'tone'
import type { MusicalScore } from '../music/generateScore'
import { createAudioGraph } from './createAudioGraph'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'pausing' | 'paused' | 'ended' | 'error'

export interface PlaybackSnapshot {
  status: PlaybackStatus
  positionSeconds: number
  volume: number
  error: string | null
}

interface Session {
  raw: AudioContext
  context: Tone.Context
  graph: ReturnType<typeof createAudioGraph>
  startTime: number
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export class SoundscapePlayer {
  private session: Session | null = null
  private status: PlaybackStatus = 'idle'
  private volume = 0.65
  private error: string | null = null
  private disposed = false
  private progressTimer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly score: MusicalScore,
    private readonly onChange: (snapshot: PlaybackSnapshot) => void,
  ) {}

  get snapshot(): PlaybackSnapshot {
    const position = this.session && this.session.startTime !== Infinity
      ? this.session.raw.currentTime - this.session.startTime
      : this.status === 'ended' ? this.score.durationSeconds : 0
    return {
      status: this.status,
      positionSeconds: Math.max(0, Math.min(this.score.durationSeconds, position)),
      volume: this.volume,
      error: this.error,
    }
  }

  private publish() {
    if (!this.disposed) this.onChange(this.snapshot)
  }

  async play(): Promise<void> {
    if (this.disposed || ['loading', 'playing', 'pausing'].includes(this.status)) return
    const resuming = this.status === 'paused'
    this.status = 'loading'
    this.error = null
    this.publish()
    let session = this.session
    try {
      if (!resuming) {
        // Construct and resume synchronously in the user's click handler.
        const raw = new AudioContext({ latencyHint: 'playback' })
        const context = new Tone.Context({ context: raw, lookAhead: 0.1 })
        try {
          session = { raw, context, graph: createAudioGraph(context, this.volume), startTime: Infinity }
        } catch (error) {
          context.dispose()
          throw error
        }
        this.session = session
      }
      if (!session) return
      await Promise.all([session.raw.resume(), session.graph.ready])
      // Stop/unmount may have invalidated this session while the reverb prepared.
      if (this.disposed || this.session !== session) return
      if (!resuming) {
        session.graph.schedule(this.score)
        session.startTime = session.context.now() + 0.05
        session.context.transport.start(session.startTime)
        const activeSession = session
        session.context.setTimeout(() => {
          if (this.session === activeSession) {
            this.session = null
            this.status = 'ended'
            clearInterval(this.progressTimer)
            this.publish()
            void this.release(activeSession)
          }
        }, session.startTime + this.score.durationSeconds - session.raw.currentTime)
        this.progressTimer = setInterval(() => {
          if (this.status === 'playing') this.publish()
        }, 100)
      }
      session.graph.gate.gain.rampTo(1, 0.03)
      this.status = 'playing'
      this.publish()
    } catch {
      if (this.disposed || (session && this.session !== session)) return
      this.session = null
      clearInterval(this.progressTimer)
      if (session) void this.release(session)
      this.status = 'error'
      this.error = 'Audio could not start. Check your browser’s audio permissions and try Play again.'
      this.publish()
    }
  }

  async pause(): Promise<void> {
    const session = this.session
    if (this.status !== 'playing' || !session) return
    this.status = 'pausing'
    this.publish()
    session.graph.gate.gain.rampTo(0, 0.03, session.raw.currentTime)
    await wait(40)
    if (this.session !== session) return
    try {
      // Freezing the audio clock preserves sustained notes, envelopes, and effect tails.
      await session.raw.suspend()
      if (this.session !== session) return
      this.status = 'paused'
      this.publish()
    } catch {
      if (this.session === session) {
        await this.stop()
        this.error = 'Audio could not pause. Playback has been stopped; try Play again.'
        this.status = 'error'
        this.publish()
      }
    }
  }

  async stop(): Promise<void> {
    const session = this.session
    this.session = null
    this.status = 'idle'
    this.error = null
    clearInterval(this.progressTimer)
    this.publish()
    if (session) await this.release(session)
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new RangeError('volume must be between 0 and 1.')
    }
    this.volume = volume
    this.session?.graph.output.gain.rampTo(volume, 0.05)
    this.publish()
  }

  private async release(session: Session): Promise<void> {
    session.context.transport.stop(session.raw.currentTime)
    session.context.transport.cancel()
    if (session.raw.state === 'running') {
      session.graph.gate.gain.rampTo(0, 0.03, session.raw.currentTime)
      await wait(40)
    }
    // Reverb generation writes its impulse buffer asynchronously; let it settle
    // before disposing the convolver, including when Stop interrupts loading.
    await session.graph.ready.catch(() => undefined)
    session.graph.dispose()
    await session.context.close()
    session.context.dispose()
  }

  async dispose(): Promise<void> {
    this.disposed = true
    await this.stop()
  }
}
