import { useEffect, useRef, useState } from 'react'
import { activeLineIds, GENERATOR_SOURCE, type TraceSignal } from './generatorSource'

interface FunctionTraceProps {
  readonly getSignal: () => TraceSignal
  /** Shown as a caption so the window explains itself. */
  readonly caption: string
}

const EMPTY = ''

export function FunctionTrace({ getSignal, caption }: FunctionTraceProps) {
  const [activeKey, setActiveKey] = useState(EMPTY)
  // Survives effect restarts, so turning every line off still clears the state.
  const previousRef = useRef(EMPTY)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const signal = getSignal()
      const next = [...activeLineIds(signal)].sort().join(' ')
      // Repaint only when the executing lines actually change.
      if (next !== previousRef.current) {
        previousRef.current = next
        setActiveKey(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [getSignal])

  const active = new Set(activeKey ? activeKey.split(' ') : [])

  return (
    <figure className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-xs text-stone-400">
        <span className="font-mono text-stone-300">grow()</span>
        <span className="truncate">{caption}</span>
      </figcaption>
      <pre className="min-h-0 w-full min-w-0 flex-1 overflow-auto font-mono text-[11px] leading-relaxed sm:text-xs">
        <code>
          {GENERATOR_SOURCE.map((line, index) => {
            const live = active.has(line.id)
            return (
              <span
                key={line.id}
                aria-current={live ? 'step' : undefined}
                className={`flex gap-3 rounded px-1 ${live ? 'bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-stone-100' : 'text-stone-400/70'}`}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-right text-stone-600">
                  {index + 1}
                </span>
                <span className="whitespace-pre">{line.text}</span>
              </span>
            )
          })}
        </code>
      </pre>
    </figure>
  )
}
