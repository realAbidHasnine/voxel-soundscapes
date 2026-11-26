import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSoundscape } from './audio/useSoundscape'
import { ParameterControls } from './controls/ParameterControls'
import { PresetPicker } from './controls/PresetPicker'
import { DEFAULT_PRESET, presetById, type Preset, type PresetId } from './controls/presets'
import {
  DEFAULT_SOUND_PARAMETERS,
  musicParametersFor,
  randomSeed,
  scaleLabel,
  treeParametersFor,
  type SoundParameters,
} from './controls/soundParameters'
import { useExport } from './export/useExport'
import { generateScore } from './music/generateScore'
import { generateTree } from './tree/generateTree'
import { TreeCanvas } from './visuals/TreeCanvas'
import { buildTreeGeometry } from './visuals/treeGeometry'

/** Wait for a slider to settle before regenerating; the largest tree costs ~300ms. */
const APPLY_DELAY_MS = 220

function formatTime(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}

export default function App() {
  const [presetId, setPresetId] = useState<PresetId>(DEFAULT_PRESET.id)
  const [parameters, setParameters] = useState<SoundParameters>(DEFAULT_SOUND_PARAMETERS)
  const [applied, setApplied] = useState<SoundParameters>(parameters)
  const [zen, setZen] = useState(false)
  const preset = presetById(presetId)
  const { palette } = preset

  useEffect(() => {
    if (applied === parameters) return
    const timer = setTimeout(() => setApplied(parameters), APPLY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [parameters, applied])

  // Escape leaves zen mode, matching the visible exit button.
  useEffect(() => {
    if (!zen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zen])

  const pending = applied !== parameters
  const tree = useMemo(() => generateTree(treeParametersFor(applied)), [applied])
  const score = useMemo(() => generateScore(tree, musicParametersFor(applied)), [tree, applied])
  const geometry = useMemo(() => buildTreeGeometry(tree, score), [tree, score])
  const playback = useSoundscape(score)
  const exporting = useExport({ score, seed: applied.seed, volume: playback.volume })
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

  const selectPreset = (next: Preset) => {
    setPresetId(next.id)
    setParameters(next.parameters)
  }

  const theme = {
    '--accent': palette.accent,
    '--page-glow': palette.glow,
    '--page-background': palette.background,
    '--panel': palette.panel,
  } as CSSProperties

  return (
    <div
      className="relative min-h-svh bg-[radial-gradient(ellipse_at_top,var(--page-glow)_0%,var(--page-background)_65%)] transition-colors duration-500"
      style={theme}
    >
      <main
        className={`mx-auto grid min-h-svh w-full max-w-7xl items-center px-6 ${
          zen ? 'py-6' : 'gap-6 py-10 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-12 lg:py-12'
        }`}
      >
        <section
          aria-labelledby="welcome-title"
          hidden={zen}
          className="order-2 w-full rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-2xl backdrop-blur-sm sm:p-10 lg:order-1"
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--accent)]">
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
              <span className="text-[var(--accent)]">{preset.name}</span>
              <span className="text-stone-300">{scaleLabel(applied)} · {applied.tempo} BPM</span>
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
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={playing ? playback.pause : playback.play}
                disabled={busy}
                className="min-h-12 min-w-32 rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-emerald-950 disabled:cursor-wait disabled:opacity-60"
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
              <button
                type="button"
                onClick={exporting.download}
                disabled={exporting.status === 'rendering'}
                className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
              >
                {exporting.status === 'rendering' ? 'Rendering…' : 'Download'}
              </button>
              <button
                type="button"
                onClick={() => setZen(true)}
                className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10"
              >
                Zen
              </button>
            </div>
            <p aria-live="polite" className="mt-3 text-xs text-stone-400">
              {exporting.status === 'rendering'
                ? `Rendering about ${Math.round(score.durationSeconds)} seconds of audio. This can take a minute with reverb.`
                : 'Downloads a .wav file of this exact soundscape.'}
            </p>
            {exporting.error && <p role="alert" className="mt-2 text-sm text-rose-200">{exporting.error}</p>}
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
                className="mt-1 min-h-11 w-full cursor-pointer accent-[var(--accent)]"
              />
            </div>
            <p role="status" className="mt-4 text-sm text-stone-300">{statusText}</p>
            {playback.error && <p role="alert" className="mt-3 text-sm text-rose-200">{playback.error}</p>}
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="mb-3 text-sm font-medium text-stone-200">Preset</h2>
            <PresetPicker activeId={presetId} onSelect={selectPreset} disabled={busy} />
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium text-stone-200">Shape</h2>
              <span className="text-xs text-stone-400" aria-live="polite">
                {pending ? 'Growing…' : `Seed ${applied.seed}`}
              </span>
            </div>
            <ParameterControls
              parameters={parameters}
              onChange={setParameters}
              onRegrow={() => setParameters((current) => ({ ...current, seed: randomSeed(current.seed) }))}
              disabled={busy}
            />
          </div>
        </section>
        <div className={`order-1 w-full ${zen ? 'h-[92svh]' : 'h-[46svh] min-h-64 lg:order-2 lg:h-[78svh]'}`}>
          <TreeCanvas
            geometry={geometry}
            getPositionSeconds={playback.getPositionSeconds}
            animating={playing}
            palette={palette}
            label={`Fractal tree with ${tree.nodes.length} branches, blooming as the music plays.`}
          />
        </div>
      </main>
      {zen && (
        <div className="fixed inset-x-0 bottom-0 flex justify-center p-6">
          <button
            type="button"
            onClick={() => setZen(false)}
            className="min-h-11 rounded-full border border-white/20 bg-black/40 px-5 text-sm text-stone-200 backdrop-blur-sm hover:bg-black/60"
          >
            Leave zen mode
          </button>
        </div>
      )}
    </div>
  )
}
