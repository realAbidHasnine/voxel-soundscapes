import type { AlbumTrack } from '../audio/albumTracks'

interface AlbumPickerProps {
  readonly tracks: readonly (AlbumTrack & { readonly license?: string })[]
  readonly activeId: string | null
  readonly onSelect: (track: AlbumTrack) => void
  readonly disabled: boolean
}

export function AlbumPicker({ tracks, activeId, onSelect, disabled }: AlbumPickerProps) {
  if (tracks.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-stone-400">
        No album tracks found. Add audio files to <code className="text-stone-300">beta-album/</code>{' '}
        and reload. That folder is gitignored, so the files stay local.
      </p>
    )
  }

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
      {tracks.map((track, index) => {
        const active = track.id === activeId
        return (
          <li key={track.id}>
            <button
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(track)}
              title={track.license ? `License: ${track.license}` : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-stone-100'
                  : 'text-stone-300 hover:bg-white/5'
              }`}
            >
              <span aria-hidden="true" className="w-5 shrink-0 text-right text-xs tabular-nums text-stone-500">
                {track.trackNumber ?? index + 1}
              </span>
              <span className="truncate">{track.title}</span>
              {track.license && (
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-stone-500">
                  {track.license}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
