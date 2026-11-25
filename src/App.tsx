import { useMemo } from 'react'
import { useSoundscape } from './audio/useSoundscape'
import { generateScore } from './music/generateScore'
import { generateTree } from './tree/generateTree'

function formatTime(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}

export default function App() {
  const score = useMemo(() => generateScore(generateTree()), [])
  const playback = useSoundscape(score)
  const busy = playback.status === 'loading' || playback.status === 'pausing'
  const playing = playback.status === 'playing'
  const active = playing || busy || playback.status === 'paused'
  const buttonLabel = playback.status === 'loading' ? 'Preparing…'
    : playback.status === 'pausing' ? 'Pausing…'
    : playing ? 'Pause'
    : playback.status === 'paused' ? 'Resume'
    : playback.status === 'ended' ? 'Play again' : 'Play'
  const statusText = playback.status === 'loading' ? 'Preparing your soundscape.'
    : playback.status === 'pausing' ? 'Pausing your soundscape.'
    : playback.status === 'paused' ? 'Paused. Take your time.'
    : playback.status === 'ended' ? 'A quiet finish. Listen again whenever you like.'
    : playing ? 'Let the branches unfold.'
    : playback.status === 'error' ? 'Playback needs your attention.'
    : 'Ready when you are.'

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12 sm:py-6">
      <section
        aria-labelledby="welcome-title"
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl sm:p-10"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-200">
          Recursive Soundscapes
        </p>
        <h1
          id="welcome-title"
          className="mt-6 text-4xl font-light leading-tight tracking-tight text-stone-100 sm:text-5xl"
        >
          A little room
          <br />
          to slow down.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-stone-300">
          A branching melody, soft chords, and a little space to breathe.
          Press play and settle into the sound.
        </p>
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-emerald-200">Forest Canopy</span>
            <span className="text-stone-300">C major · 70 BPM</span>
          </div>
          <progress
            aria-label="Playback progress"
            aria-valuetext={`${formatTime(playback.positionSeconds)} of ${formatTime(score.durationSeconds)}`}
            value={playback.positionSeconds}
            max={score.durationSeconds}
            className="mt-5 block h-1.5 w-full overflow-hidden rounded-full"
          />
          <div className="mt-2 flex justify-between text-xs tabular-nums text-stone-300" aria-hidden="true">
            <span>{formatTime(playback.positionSeconds)}</span>
            <span>{formatTime(score.durationSeconds)}</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={playing ? playback.pause : playback.play}
              disabled={busy}
              className="min-h-12 min-w-32 rounded-full bg-emerald-200 px-6 py-3 font-medium text-emerald-950 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              {buttonLabel}
            </button>
            <button
              type="button"
              onClick={playback.stop}
              disabled={!active}
              className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop
            </button>
          </div>
          <div className="mt-6">
            <label htmlFor="master-volume" className="flex justify-between text-sm text-stone-300">
              <span>Volume</span>
              <span>{Math.round(playback.volume * 100)}%</span>
            </label>
            <input
              id="master-volume"
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(playback.volume * 100)}
              onChange={(event) => playback.setVolume(Number(event.target.value) / 100)}
              aria-valuetext={`${Math.round(playback.volume * 100)} percent`}
              className="mt-1 min-h-11 w-full cursor-pointer accent-emerald-200"
            />
          </div>
          <p role="status" className="mt-4 text-sm text-stone-300">{statusText}</p>
          {playback.error && <p role="alert" className="mt-3 text-sm text-rose-200">{playback.error}</p>}
        </div>
      </section>
    </main>
  )
}
