import { useEffect, useRef } from 'react'
import { frequencyBars } from './frequencyBars'

interface FrequencyGraphProps {
  readonly getData: () => ArrayLike<number>
  readonly active: boolean
  /** Hex color; canvas cannot resolve CSS custom properties. */
  readonly accent: string
  /** Bars per graph; more bars need fewer pixels each. */
  readonly bars?: number
  readonly label: string
}

const BAR_COUNT = 56

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full = value.length === 3
    ? value.split('').map((part) => part + part).join('')
    : value.padEnd(6, '0').slice(0, 6)
  const red = Number.parseInt(full.slice(0, 2), 16)
  const green = Number.parseInt(full.slice(2, 4), 16)
  const blue = Number.parseInt(full.slice(4, 6), 16)
  const safe = [red, green, blue].map((channel) => (Number.isFinite(channel) ? channel : 255))
  return `rgba(${safe[0]}, ${safe[1]}, ${safe[2]}, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`
}

export function FrequencyGraph({ getData, active, accent, bars = BAR_COUNT, label }: FrequencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { width, height }
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = (values: ArrayLike<number>) => {
      const { width, height } = sizeRef.current
      context.clearRect(0, 0, width, height)
      const heights = frequencyBars(values, bars)
      const slot = width / Math.max(1, heights.length)
      const barWidth = Math.max(1, slot * 0.62)
      for (const [index, value] of heights.entries()) {
        const barHeight = Math.max(1, value * (height - 2))
        const x = index * slot + (slot - barWidth) / 2
        // A faint floor keeps the graph readable between notes.
        context.fillStyle = withAlpha(accent, 0.18 + value * 0.72)
        context.fillRect(x, height - barHeight, barWidth, barHeight)
      }
    }

    let frame = 0
    const loop = () => {
      draw(getData())
      frame = requestAnimationFrame(loop)
    }
    if (active) frame = requestAnimationFrame(loop)
    else draw([])

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [active, accent, bars, getData])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="block h-full w-full"
    />
  )
}
