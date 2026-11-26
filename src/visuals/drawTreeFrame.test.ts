import { describe, expect, it } from 'vitest'
import { generateScore } from '../music/generateScore'
import { generateTree } from '../tree/generateTree'
import { drawTreeFrame } from './drawTreeFrame'
import { buildTreeGeometry } from './treeGeometry'

interface StrokeRecord {
  alpha: number
  color: string
  lineWidth: number
}

/** Minimal 2D context recording what the renderer draws. */
function createRecordingContext() {
  const strokes: StrokeRecord[] = []
  const state = { alpha: 1, color: '', lineWidth: 0, cleared: 0, points: 0 }
  const ctx = {
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    clearRect: () => { state.cleared++ },
    beginPath: () => {},
    moveTo: () => { state.points++ },
    lineTo: () => { state.points++ },
    stroke: () => { strokes.push({ alpha: ctx.globalAlpha, color: String(ctx.strokeStyle), lineWidth: ctx.lineWidth }) },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, strokes, state }
}

const frame = (elapsedSeconds: number) => ({ width: 800, height: 600, elapsedSeconds })

describe('drawTreeFrame', () => {
  const tree = generateTree({ maxDepth: 4, branching: 2 })
  const score = generateScore(tree)
  const geometry = buildTreeGeometry(tree, score)

  it('draws only a silhouette before playback and blooms from the root', () => {
    const before = createRecordingContext()
    expect(drawTreeFrame(before.ctx, geometry, frame(-1))).toBe(0)
    // The silhouette draws once, fainter than any bloomed branch.
    expect(before.strokes).toHaveLength(1)
    expect(before.strokes[0].alpha).toBeLessThan(0.2)
    expect(before.state.points).toBe(geometry.nodeCount * 2)

    // The root blooms slightly after zero: humanization jitters its onset.
    const rootTime = score.cues[0].timeSeconds
    expect(rootTime).toBeGreaterThan(0)
    const start = createRecordingContext()
    expect(drawTreeFrame(start.ctx, geometry, frame(rootTime + 0.01))).toBe(1)
    // The root branch is the only bloomed one, and it is still fading in.
    const bloomed = start.strokes.slice(1)
    expect(bloomed).toHaveLength(1)
    expect(bloomed[0].alpha).toBeLessThan(0.3)
  })

  it('reveals more branches as the audio clock advances', () => {
    const counts = [0, 8, 16, 24, 32, score.durationSeconds].map((seconds) => {
      const { ctx } = createRecordingContext()
      return drawTreeFrame(ctx, geometry, frame(seconds))
    })
    for (let index = 1; index < counts.length; index++) {
      expect(counts[index]).toBeGreaterThanOrEqual(counts[index - 1])
    }
    expect(counts.at(-1)).toBe(geometry.nodeCount)
  })

  it('draws every branch once the score has finished', () => {
    const { ctx } = createRecordingContext()
    expect(drawTreeFrame(ctx, geometry, frame(score.durationSeconds))).toBe(geometry.nodeCount)
  })

  it('clears the full canvas and finishes with an opaque state', () => {
    const { ctx, state } = createRecordingContext()
    drawTreeFrame(ctx, geometry, frame(8))
    expect(state.cleared).toBe(1)
    expect(ctx.globalAlpha).toBe(1)
  })

  it('groups strokes by depth so a frame stays a handful of draw calls', () => {
    const { ctx, strokes } = createRecordingContext()
    drawTreeFrame(ctx, geometry, frame(score.durationSeconds))
    // Ghost plus at most four fade steps per depth level, not one stroke per branch.
    expect(strokes.length).toBeLessThanOrEqual((tree.parameters.maxDepth + 1) * 4 + 1)
    expect(geometry.nodeCount).toBeGreaterThan(20)
    expect(strokes.every((stroke) => Number.isFinite(stroke.lineWidth) && stroke.lineWidth > 0)).toBe(true)
  })

  it('samples the largest tree down to a bounded number of branches', () => {
    const bigTree = generateTree({ maxDepth: 9, branching: 4 })
    const bigScore = generateScore(bigTree)
    const bigGeometry = buildTreeGeometry(bigTree, bigScore)
    const { ctx } = createRecordingContext()
    const drawn = drawTreeFrame(ctx, bigGeometry, frame(bigScore.durationSeconds))
    expect(drawn).toBeLessThan(bigGeometry.nodeCount)
    expect(drawn).toBeGreaterThan(1000)
  })

  it('does nothing when the canvas has no drawable area', () => {
    const { ctx } = createRecordingContext()
    expect(drawTreeFrame(ctx, geometry, { width: 0, height: 600, elapsedSeconds: 8 })).toBe(0)
    expect(drawTreeFrame(ctx, geometry, { width: 800, height: 0, elapsedSeconds: 8 })).toBe(0)
  })
})
