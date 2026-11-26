import type { TreeGeometry } from './treeGeometry'
import { FOREST_PALETTE, type TreePalette } from './treePalette'

const MAX_DRAWN_BRANCHES = 24_000
const ALPHA_STEPS = 4
const FADE_SECONDS = 0.45
const GHOST_ALPHA = 0.13

/** Trunk to tip, following the preset's hue and lightness ramp. */
function branchColor(depthRatio: number, palette: TreePalette) {
  const hue = palette.hueStart + (palette.hueEnd - palette.hueStart) * depthRatio
  const lightness = palette.lightnessStart
    + (palette.lightnessEnd - palette.lightnessStart) * depthRatio
  return `hsl(${hue.toFixed(1)} ${palette.saturation}% ${lightness.toFixed(1)}%)`
}

export interface TreeFrameOptions {
  readonly width: number
  readonly height: number
  readonly elapsedSeconds: number
  readonly palette?: TreePalette
}

/** Flattened x1, y1, x2, y2 per branch, grouped so one stroke covers many branches. */
type Bucket = number[]

/**
 * Draw the bloomed portion of the tree. Branch geometry is normalized, so this
 * fits to the smaller canvas axis and keeps its aspect ratio at any size.
 * Returns how many branches were drawn.
 */
export function drawTreeFrame(
  ctx: CanvasRenderingContext2D,
  geometry: TreeGeometry,
  { width, height, elapsedSeconds, palette = FOREST_PALETTE }: TreeFrameOptions,
): number {
  ctx.clearRect(0, 0, width, height)
  if (width <= 0 || height <= 0 || geometry.nodeCount === 0) return 0

  const size = Math.min(width, height)
  const padding = size * 0.06
  const inner = size - padding * 2
  const originX = (width - inner) / 2
  const originY = (height - inner) / 2
  const stride = Math.max(1, Math.ceil(geometry.nodeCount / MAX_DRAWN_BRANCHES))
  const cueCount = geometry.bloomOrder.length
  const segments = geometry.segments

  function trace(bucket: Bucket) {
    ctx.beginPath()
    for (let index = 0; index < bucket.length; index += 4) {
      ctx.moveTo(bucket[index], bucket[index + 1])
      ctx.lineTo(bucket[index + 2], bucket[index + 3])
    }
    ctx.stroke()
  }

  // A faint full silhouette keeps the screen composed before and after playback.
  const ghost: Bucket = []
  for (let nodeId = 0; nodeId < geometry.nodeCount; nodeId += stride) {
    const base = nodeId * 4
    ghost.push(
      originX + segments[base] * inner,
      originY + segments[base + 1] * inner,
      originX + segments[base + 2] * inner,
      originY + segments[base + 3] * inner,
    )
  }

  // One stroke per depth and fade step keeps this to a few dozen draw calls a frame.
  const buckets = new Map<number, Bucket>()
  let drawn = 0

  for (let index = 0; index < cueCount; index += stride) {
    const bloomTime = geometry.bloomTimes[index]
    if (bloomTime > elapsedSeconds) break // Cue times are sorted.
    const nodeId = geometry.bloomOrder[index]
    const fade = Math.min(1, (elapsedSeconds - bloomTime) / FADE_SECONDS)
    const alphaStep = Math.max(1, Math.ceil(fade * ALPHA_STEPS))
    const depth = geometry.depths[nodeId]
    const key = depth * (ALPHA_STEPS + 1) + alphaStep
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = []
      buckets.set(key, bucket)
    }
    const base = nodeId * 4
    bucket.push(
      originX + segments[base] * inner,
      originY + segments[base + 1] * inner,
      originX + segments[base + 2] * inner,
      originY + segments[base + 3] * inner,
    )
    drawn++
  }

  ctx.lineCap = 'round'
  const maxDepth = Math.max(1, geometry.maxDepth)
  const lineWidthFor = (depthRatio: number) => Math.max(0.6, (1.9 - depthRatio * 1.1) * (size / 900))

  ctx.globalAlpha = GHOST_ALPHA
  ctx.strokeStyle = branchColor(0.75, palette)
  ctx.lineWidth = lineWidthFor(0.75)
  trace(ghost)

  for (let depth = 0; depth <= geometry.maxDepth; depth++) {
    const depthRatio = depth / maxDepth
    ctx.strokeStyle = branchColor(depthRatio, palette)
    ctx.lineWidth = lineWidthFor(depthRatio)
    // Fainter steps draw first so recently bloomed branches sit on top.
    for (let alphaStep = 1; alphaStep <= ALPHA_STEPS; alphaStep++) {
      const bucket = buckets.get(depth * (ALPHA_STEPS + 1) + alphaStep)
      if (!bucket) continue
      ctx.globalAlpha = (alphaStep / ALPHA_STEPS) * (0.8 + depthRatio * 0.2)
      trace(bucket)
    }
  }

  ctx.globalAlpha = 1
  return drawn
}
