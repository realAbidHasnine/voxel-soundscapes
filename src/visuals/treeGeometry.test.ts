import { describe, expect, it } from 'vitest'
import { generateScore } from '../music/generateScore'
import { generateTree } from '../tree/generateTree'
import { buildTreeGeometry } from './treeGeometry'

describe('buildTreeGeometry', () => {
  it('keeps one segment per branch and one bloom entry per cue', () => {
    const tree = generateTree({ maxDepth: 5, branching: 3 })
    const score = generateScore(tree)
    const geometry = buildTreeGeometry(tree, score)
    expect(geometry.nodeCount).toBe(tree.nodes.length)
    expect(geometry.segments).toHaveLength(tree.nodes.length * 4)
    expect(geometry.depths).toHaveLength(tree.nodes.length)
    expect(geometry.bloomOrder).toHaveLength(score.cues.length)
    expect(geometry.bloomTimes).toHaveLength(score.cues.length)
  })

  it('normalizes the tree into a unit square without distorting its aspect ratio', () => {
    const tree = generateTree()
    const geometry = buildTreeGeometry(tree, generateScore(tree))
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let node = 0; node < geometry.nodeCount; node++) {
      for (const [offset, axis] of [[0, 'x'], [2, 'x'], [1, 'y'], [3, 'y']] as const) {
        const value = geometry.segments[node * 4 + offset]
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(-1e-6)
        expect(value).toBeLessThanOrEqual(1 + 1e-6)
        if (axis === 'x') {
          minX = Math.min(minX, value)
          maxX = Math.max(maxX, value)
        } else {
          minY = Math.min(minY, value)
          maxY = Math.max(maxY, value)
        }
      }
    }
    // A tree is taller than it is wide, so one axis spans nearly the full square.
    expect(Math.max(maxY - minY, maxX - minX)).toBeCloseTo(1, 5)
  })

  it('orders bloom times the way the score plays and matches each cue', () => {
    const tree = generateTree({ maxDepth: 4 })
    const score = generateScore(tree)
    const geometry = buildTreeGeometry(tree, score)
    for (const [index, cue] of score.cues.entries()) {
      expect(geometry.bloomOrder[index]).toBe(cue.nodeId)
      // Stored as Float32Array, so compare within float32 precision.
      expect(geometry.bloomTimes[index]).toBeCloseTo(cue.timeSeconds, 5)
      if (index > 0) expect(geometry.bloomTimes[index]).toBeGreaterThanOrEqual(geometry.bloomTimes[index - 1])
    }
  })

  it('records each branch depth and the configured maximum', () => {
    const tree = generateTree({ maxDepth: 3, branching: 2 })
    const geometry = buildTreeGeometry(tree, generateScore(tree))
    expect(geometry.maxDepth).toBe(3)
    for (const node of tree.nodes) expect(geometry.depths[node.id]).toBe(node.depth)
  })

  it('handles the largest tree with typed arrays sized for every branch', () => {
    const tree = generateTree({ maxDepth: 9, branching: 4 })
    const score = generateScore(tree)
    const geometry = buildTreeGeometry(tree, score)
    expect(geometry.nodeCount).toBe(349525)
    expect(geometry.segments).toHaveLength(349525 * 4)
    // Uint8Array caps at 255; depth 9 still fits. Reduce rather than spread,
    // which would exceed the argument limit at this size.
    expect(geometry.depths.reduce((max, depth) => Math.max(max, depth), 0)).toBe(9)
  })
})
