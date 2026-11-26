import { useEffect, useRef } from 'react'
import { drawTreeFrame } from './drawTreeFrame'
import type { TreeGeometry } from './treeGeometry'
import type { TreePalette } from './treePalette'

interface TreeCanvasProps {
  readonly geometry: TreeGeometry
  /** Sampled every frame from the audio clock. */
  readonly getPositionSeconds: () => number
  /** False before playback starts and after it stops, which freezes the frame. */
  readonly animating: boolean
  readonly label: string
  readonly palette: TreePalette
}

export function TreeCanvas({ geometry, getPositionSeconds, animating, label, palette }: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })

  // Size only what the frame needs; the draw call stays independent of React.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { width, height }
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    let frame = 0
    const render = () => {
      const { width, height } = sizeRef.current
      drawTreeFrame(ctx, geometry, { width, height, elapsedSeconds: getPositionSeconds(), palette })
      frame = requestAnimationFrame(render)
    }
    // One static frame is enough while playback is idle or paused.
    if (animating) {
      frame = requestAnimationFrame(render)
      return () => cancelAnimationFrame(frame)
    }
    render()
    return () => cancelAnimationFrame(frame)
  }, [geometry, getPositionSeconds, animating, palette])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="block h-full w-full"
    />
  )
}
