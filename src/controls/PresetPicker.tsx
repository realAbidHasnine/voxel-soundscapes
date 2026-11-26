import { PRESETS, type Preset, type PresetId } from './presets'

interface PresetPickerProps {
  readonly activeId: PresetId | null
  readonly onSelect: (preset: Preset) => void
  readonly disabled: boolean
}

export function PresetPicker({ activeId, onSelect, disabled }: PresetPickerProps) {
  return (
    <div role="group" aria-label="Soundscape presets" className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => {
        const active = preset.id === activeId
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(preset)}
            className={`min-h-11 rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? 'border-transparent bg-[var(--accent)] font-medium text-emerald-950'
                : 'border-white/20 text-stone-200 hover:bg-white/10'
            }`}
          >
            <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: preset.palette.accent }} />
            {preset.name}
          </button>
        )
      })}
    </div>
  )
}
