import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAlbum } from './audio/useAlbum'
import { useAlbumTracks } from './audio/useAlbumTracks'
import type { AlbumTrack } from './audio/albumTracks'
import { useSoundscape } from './audio/useSoundscape'
import { AlbumPicker } from './controls/AlbumPicker'
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
import { bandEnergy } from './visuals/frequencyBars'
import { FrequencyGraph } from './visuals/FrequencyGraph'
import { FunctionTrace } from './visuals/FunctionTrace'
import type { TraceSignal } from './visuals/generatorSource'
import { TreeCanvas } from './visuals/TreeCanvas'
import { buildTreeGeometry } from './visuals/treeGeometry'

/** Wait for a slider to settle before regenerating; the largest tree costs ~300ms. */
const APPLY_DELAY_MS = 220

type SourceMode = 'generated' | 'album'

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
  const [mode, setMode] = useState<SourceMode>('generated')
  const albumTracks = useAlbumTracks()
  const [trackId, setTrackId] = useState<string | null>(null)
  const preset = presetById(settings.presetId)
  const { palette } = preset
  const { parameters } = settings
  const albumAvailable = albumTracks.length > 0

  const applySettings = (next: SharedState) => setSettings(next)

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
  const album = useAlbum()
  const exporting = useExport({ score, seed: applied.parameters.seed, volume: playback.volume })

  const albumMode = mode === 'album'
  const track: AlbumTrack | null = albumTracks.find((item) => item.id === trackId) ?? null

  // Pick the first track once the list arrives, or when the current one vanishes.
  useEffect(() => {
    if (albumTracks.length === 0) {
      if (trackId !== null) setTrackId(null)
      return
    }
    if (!albumTracks.some((item) => item.id === trackId)) {
      setTrackId(albumTracks[0].id)
    }
  }, [albumTracks, trackId])
  const sourceStatus = albumMode ? album.status : playback.status
  const playing = sourceStatus === 'playing'
  const busy = sourceStatus === 'loading' || sourceStatus === 'pausing'
  const active = playing || busy || sourceStatus === 'paused'
  const volume = albumMode ? album.volume : playback.volume
  const positionSeconds = albumMode ? album.positionSeconds : playback.positionSeconds
  const durationSeconds = albumMode ? album.durationSeconds : score.durationSeconds

  const buttonLabel = sourceStatus === 'loading' ? 'Preparing…'
    : sourceStatus === 'pausing' ? 'Pausing…'
    : playing ? 'Pause'
    : sourceStatus === 'paused' ? 'Resume'
    : sourceStatus === 'ended' ? 'Play again' : 'Play'
  const statusText = sourceStatus === 'loading' ? (albumMode ? 'Loading the track.' : 'Preparing your soundscape.')
    : sourceStatus === 'pausing' ? 'Pausing.'
    : sourceStatus === 'paused' ? 'Paused. Take your time.'
    : sourceStatus === 'ended' ? 'A quiet finish. Listen again whenever you like.'
    : playing ? (albumMode ? 'Follow the music through the recursion.' : 'Let the branches unfold.')
    : sourceStatus === 'error' ? 'Playback needs your attention.'
    : 'Ready when you are.'

  // The level counter only makes sense once the piece is moving.
  const depth = !albumMode && active ? depthAtSeconds(score, playback.positionSeconds) : null

  const selectPreset = (next: Preset) => {
    applySettings({ presetId: next.id, parameters: next.parameters })
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

  const switchMode = (next: SourceMode) => {
    if (next === mode) return
    if (next === 'album') playback.stop()
    else album.stop()
    setMode(next)
  }

  const togglePlay = () => {
    if (albumMode) {
      if (album.status === 'playing') album.pause()
      else if (track) album.play(track)
      return
    }
    if (playback.status === 'playing') playback.pause()
    else playback.play()
  }

  const stopSource = () => {
    if (albumMode) album.stop()
    else playback.stop()
  }

  const selectTrack = (next: AlbumTrack) => {
    setTrackId(next.id)
    album.play(next)
  }

  // In album mode the tree blooms across the whole track instead of the score.
  // These callbacks are read every frame, so they stay stable across renders.
  const albumRef = useRef(album)
  const playbackRef = useRef(playback)
  albumRef.current = album
  playbackRef.current = playback

  const treePositionSeconds = useCallback(() => {
    if (!albumMode) return playbackRef.current.getPositionSeconds()
    const total = albumRef.current.durationSeconds
    if (total <= 0) return 0
    return (albumRef.current.getPositionSeconds() / total) * score.durationSeconds
  }, [albumMode, score.durationSeconds])

  const frequencyData = useCallback(
    () => (albumMode ? albumRef.current.getFrequencyData() : playbackRef.current.getFrequencyData()),
    [albumMode],
  )

  const traceSignal = useCallback((): TraceSignal => {
    if (albumMode) {
      const energy = bandEnergy(albumRef.current.getFrequencyData())
      return {
        playing: albumRef.current.status === 'playing',
        depth: null,
        maxDepth: tree.parameters.maxDepth,
        ...energy,
      }
    }
    return {
      playing: playbackRef.current.status === 'playing',
      depth,
      maxDepth: tree.parameters.maxDepth,
      bass: 0,
      mid: 0,
      treble: 0,
    }
  }, [albumMode, depth, tree.parameters.maxDepth])

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
        className={`mx-auto grid min-h-svh w-full max-w-7xl px-6 ${
          zen
            ? 'py-6'
            : 'gap-6 py-10 lg:h-svh lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:overflow-hidden lg:py-0'
        }`}
      >
        <section
          aria-labelledby="welcome-title"
          hidden={zen}
          className="order-2 w-full rounded-3xl border border-white/10 bg-[var(--panel)] p-8 shadow-2xl backdrop-blur-sm sm:p-10 lg:order-1 lg:my-10 lg:h-[calc(100svh-5rem)] lg:overflow-y-auto"
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

          {albumAvailable && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="mb-3 text-sm font-medium text-stone-200">Source</h2>
              <div role="group" aria-label="Audio source" className="flex gap-2">
                {([['generated', 'Generated'], ['album', 'Album']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => switchMode(value)}
                    className={`min-h-11 rounded-full border px-4 text-sm ${
                      mode === value
                        ? 'border-transparent bg-[var(--accent)] font-medium text-emerald-950'
                        : 'border-white/20 text-stone-200 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-[var(--accent)]">
                {albumMode ? (track?.title ?? 'Album') : preset.name}
              </span>
              <span className="text-stone-300">
                {depth !== null && `Depth ${depth} of ${tree.parameters.maxDepth} · `}
                {albumMode
                  ? `${formatTime(positionSeconds)} / ${formatTime(durationSeconds)}`
                  : `${scaleLabel(applied.parameters)} · ${applied.parameters.tempo} BPM`}
              </span>
            </div>
            <progress
              aria-label="Playback progress"
              aria-valuetext={`${formatTime(positionSeconds)} of ${formatTime(durationSeconds)}`}
              value={positionSeconds}
              max={Math.max(durationSeconds, 0.001)}
              className="mt-5 block h-1.5 w-full overflow-hidden rounded-full"
            />
            <div className="mt-2 flex justify-between text-xs tabular-nums text-stone-300" aria-hidden="true">
              <span>{formatTime(positionSeconds)}</span>
              <span>{formatTime(durationSeconds)}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={busy || (albumMode && !track)}
                className="min-h-12 min-w-32 rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-emerald-950 disabled:cursor-wait disabled:opacity-60"
              >
                {buttonLabel}
              </button>
              <button
                type="button"
                onClick={stopSource}
                disabled={!active}
                className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Stop
              </button>
              {!albumMode && (
                <button
                  type="button"
                  onClick={exporting.download}
                  disabled={exporting.status === 'rendering'}
                  className="min-h-12 rounded-full border border-white/20 px-6 py-3 text-stone-200 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                  {exporting.status === 'rendering' ? 'Rendering…' : 'Download'}
                </button>
              )}
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
              {albumMode
                ? 'Audio comes from the local beta-album folder.'
                : exporting.status === 'rendering'
                  ? `Rendering about ${Math.round(score.durationSeconds)} seconds of audio. This can take a minute with reverb.`
                  : 'Downloads a .wav file of this exact soundscape.'}
            </p>
            {exporting.error && !albumMode && (
              <p role="alert" className="mt-2 text-sm text-rose-200">{exporting.error}</p>
            )}
            {album.error && albumMode && (
              <p role="alert" className="mt-2 text-sm text-rose-200">{album.error}</p>
            )}
            <div className="mt-6">
              <label htmlFor="master-volume" className="flex justify-between text-sm text-stone-300">
                <span>Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </label>
              <input
                id="master-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(volume * 100)}
                onChange={(event) => {
                  const next = Number(event.target.value) / 100
                  if (albumMode) album.setVolume(next)
                  else playback.setVolume(next)
                }}
                aria-valuetext={`${Math.round(volume * 100)} percent`}
                className="mt-1 min-h-11 w-full cursor-pointer accent-[var(--accent)]"
              />
            </div>
            <p role="status" className="mt-4 text-sm text-stone-300">{statusText}</p>
            {playback.error && !albumMode && (
              <p role="alert" className="mt-3 text-sm text-rose-200">{playback.error}</p>
            )}
          </div>

          {albumMode ? (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h2 className="mb-3 text-sm font-medium text-stone-200">Album</h2>
              <AlbumPicker
                tracks={albumTracks}
                activeId={album.trackId}
                onSelect={selectTrack}
                disabled={busy}
              />
            </div>
          ) : (
            <>
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
                  onChange={(next) => applySettings({ ...settings, parameters: next })}
                  onRegrow={() => applySettings({
                    ...settings,
                    parameters: { ...settings.parameters, seed: randomSeed(settings.parameters.seed) },
                  })}
                  disabled={busy}
                />
              </div>
            </>
          )}
        </section>

        <div
          className={`order-1 flex w-full min-w-0 flex-col gap-4 lg:order-2 ${
            zen ? '' : 'lg:h-[calc(100svh-5rem)] lg:py-10'
          }`}
        >
          <div className={zen ? 'h-[92svh] w-full' : 'h-[40svh] min-h-56 lg:h-auto lg:min-h-0 lg:flex-1'}>
            <TreeCanvas
              geometry={geometry}
              getPositionSeconds={treePositionSeconds}
              animating={playing}
              palette={palette}
              label={`Fractal tree with ${tree.nodes.length} branches, blooming as the music plays.`}
            />
          </div>
          {!zen && (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="h-52 min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3">
                <FrequencyGraph
                  getData={frequencyData}
                  active={playing}
                  accent={palette.accent}
                  label="Live frequency graph of the music."
                />
              </div>
              <div className="h-52 min-w-0">
                <FunctionTrace
                  getSignal={traceSignal}
                  caption={albumMode ? 'driven by the music' : 'driven by the tree level'}
                />
              </div>
            </div>
          )}
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
