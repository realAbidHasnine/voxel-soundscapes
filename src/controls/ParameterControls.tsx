import { useId } from 'react'
import {
  LARGE_TREE_BRANCHES,
  SOUND_LIMITS,
  branchCount,
  type SoundParameters,
} from './soundParameters'

interface ParameterControlsProps {
  readonly parameters: SoundParameters
  readonly onChange: (parameters: SoundParameters) => void
  readonly onRegrow: () => void
  readonly disabled: boolean
}

interface SliderProps {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly step: number
  readonly display: string
  readonly onChange: (value: number) => void
  readonly disabled: boolean
  readonly hint?: string
}

function Slider({ id, label, value, min, max, step, display, onChange, disabled, hint }: SliderProps) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between gap-3 text-sm text-stone-300">
        <span>{label}</span>
        <span className="tabular-nums text-emerald-200">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={display}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1 min-h-11 w-full cursor-pointer accent-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-stone-400">{hint}</p>}
    </div>
  )
}

export function ParameterControls({ parameters, onChange, onRegrow, disabled }: ParameterControlsProps) {
  const id = useId()
  const update = (changes: Partial<SoundParameters>) => onChange({ ...parameters, ...changes })
  const branches = branchCount(parameters.maxDepth, parameters.branching)
  const large = branches > LARGE_TREE_BRANCHES

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Slider
        id={`${id}-depth`}
        label="Max depth"
        value={parameters.maxDepth}
        min={SOUND_LIMITS.maxDepth.min}
        max={SOUND_LIMITS.maxDepth.max}
        step={1}
        display={String(parameters.maxDepth)}
        onChange={(maxDepth) => update({ maxDepth })}
        disabled={disabled}
      />
      <Slider
        id={`${id}-branching`}
        label="Branching"
        value={parameters.branching}
        min={SOUND_LIMITS.branching.min}
        max={SOUND_LIMITS.branching.max}
        step={1}
        display={String(parameters.branching)}
        onChange={(branching) => update({ branching })}
        disabled={disabled}
      />
      <Slider
        id={`${id}-spread`}
        label="Spread"
        value={parameters.spreadDegrees}
        min={SOUND_LIMITS.spreadDegrees.min}
        max={SOUND_LIMITS.spreadDegrees.max}
        step={5}
        display={`${parameters.spreadDegrees}°`}
        onChange={(spreadDegrees) => update({ spreadDegrees })}
        disabled={disabled}
      />
      <Slider
        id={`${id}-tempo`}
        label="Tempo"
        value={parameters.tempo}
        min={SOUND_LIMITS.tempo.min}
        max={SOUND_LIMITS.tempo.max}
        step={1}
        display={`${parameters.tempo} BPM`}
        onChange={(tempo) => update({ tempo })}
        disabled={disabled}
      />
      <div className="sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-400" aria-live="polite">
            {branches.toLocaleString()} branches
            {large && ' — this may take a moment'}
          </p>
          <button
            type="button"
            onClick={onRegrow}
            disabled={disabled}
            className="min-h-11 rounded-full border border-white/20 px-5 text-sm text-stone-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Regrow
          </button>
        </div>
      </div>
    </div>
  )
}
