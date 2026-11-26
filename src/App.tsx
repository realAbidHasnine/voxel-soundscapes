import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSoundscape } from './audio/useSoundscape'
import { ParameterControls } from './controls/ParameterControls'
import { PresetPicker } from './controls/PresetPicker'
import { DEFAULT_PRESET, presetById, type Preset } from './controls/presets'
import { encodeShareLink, readShareLink, type SharedState } from './controls/shareLink'
import {
  DEFAULT_SOUND_PARAMETERS,
  musicParametersFor,
  randomSeed,
  scaleLabel,
  treeParametersFor,
} from './controls/soundParameters'
import { useExport } from './export/useExport'
import { depthAtSeconds, generateScore } from './music/generateScore'
import { generateTree } from './tree/generateTree'
import { TreeCanvas } from './visuals/TreeCanvas'
import { buildTreeGeometry } from './visuals/treeGeometry'

/** Wait for a slider to settle before regenerating; the largest tree costs ~300ms. */
const APPLY_DELAY_MS = 220

function formatTime(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}

/** A link shared from a previous session wins over the defaults. */
const initial: SharedState = readShareLink(typeof window === 'undefined' ? { search: '' } : window.location)
  ?? { presetId: DEFAULT_PRESET.id, parameters: DEFAULT_SOUND_PARAMETERS }

export default function App() {
  // Preset and parameters are one unit: a preset changes both, and the URL must
  // never describe a preset with parameters that belong to another one.
  const [settings, setSettings] = useState<SharedState>(initial)
  const [applied, setApplied] = useState<SharedState>(settings)
  const [zen, setZen] = useState(false)
  const [copied, setCopied] = useState(false)
  const preset = presetById(settings.presetId)
  const { palette } = preset
  const { parameters } = settings

  useEffect(() => {
    if (applied === settings) return
    const timer = setTimeout(() => setApplied(settings), APPLY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [settings, applied])

  // Escape leaves zen mode, matching the visible exit button.
  useEffect(() => {
    if (!zen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zen])

  const pending = applied !== settings
  const tree = useMemo(() => generateTree(treeParametersFor(applied.parameters)), [applied])
  const score = useMemo(
    () => generateScore(tree, musicParametersFor(applied.parameters)),
    [tree, applied],
  )
  const geometry = useMemo(() => buildTreeGeometry(tree, score), [tree, score])
  const playback = useSoundscape(score)
  const exporting = useExport({ score, seed: applied.parameters.seed, volume: playback.volume })
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

  // The level counter only makes sense once the piece is moving.
  const depth = active ? depthAtSeconds(score, playback.positionSeconds) : null

  const selectPreset = (next: Preset) => {
    setSettings({ presetId: next.id, parameters: next.parameters })
  }

  // Keep the address bar in step with the applied soundscape, so copying the
  // URL always shares exactly what is on screen.
  useEffect(() => {
    const query = encodeShareLink(applied)
    const next = `${window.location.pathname}?${query}`
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(null, '', next)
    }
  }, [applied])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [copied])

  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${encodeShareLink(applied)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard access can be blocked; the URL is already in the address bar.
      setCopied(false)
    }
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
      <a
        href="#main"
        className="sr-only rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-emerald-950 focus:not-sr-only focus:absolute focus:left-6 focus:top-6 focus:z-50"
      >
        Skip to controls
      </a>
      <main
        id="main"
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
              <span className="text-stone-300">
                {depth !== null && `Depth ${depth} of ${tree.parameters.maxDepth} · `}
                {scaleLabel(applied.parameters)} · {applied.parameters.tempo} BPM
              </span>
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
              <button
                type="button"
                onClick={() => { void copyShareLink() }}
                aria-live="polite"
                className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10"
              >
                {copied ? 'Link copied' : 'Share'}
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
            <PresetPicker activeId={settings.presetId} onSelect={selectPreset} disabled={busy} />
            <p className="sr-only" aria-live="polite">
              {preset.name}. {preset.description}. {scaleLabel(applied.parameters)} at {applied.parameters.tempo} BPM.
            </p>
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium text-stone-200">Shape</h2>
              <span className="text-xs text-stone-400" aria-live="polite">
                {pending ? 'Growing…' : `Seed ${applied.parameters.seed}`}
              </span>
            </div>
            <ParameterControls
              parameters={parameters}
              onChange={(next) => setSettings((current) => ({ ...current, parameters: next }))}
              onRegrow={() => setSettings((current) => ({
                ...current,
                parameters: { ...current.parameters, seed: randomSeed(current.parameters.seed) },
              }))}
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
