import { describe, expect, it } from 'vitest'
import { DEFAULT_TREE_PARAMETERS, generateTree } from './generateTree'

describe('generateTree', () => {
  it('reproduces the complete tree regardless of other generation calls', () => {
    const parameters = { seed: 123456, maxDepth: 4, branching: 3 }
    const first = generateTree(parameters)
    generateTree({ seed: 999 })
    expect(generateTree(parameters)).toEqual(first)
    expect(generateTree({ ...parameters, seed: 123457 }).nodes).not.toEqual(first.nodes)
    expect(parameters).toEqual({ seed: 123456, maxDepth: 4, branching: 3 })
  })

  it('uses defaults without sharing mutable result arrays', () => {
    const first = generateTree()
    const second = generateTree()
    expect(first.parameters).toEqual(DEFAULT_TREE_PARAMETERS)
    expect(first.nodes).toHaveLength(127)
    expect(first).toEqual(second)
    expect(first.nodes).not.toBe(second.nodes)
    expect(first.levels[0]).not.toBe(second.levels[0])
  })

  it('supports a root-only tree', () => {
    const tree = generateTree({ maxDepth: 0, seed: 0 })
    expect(tree.nodes).toHaveLength(1)
    expect(tree.levels).toHaveLength(1)
    expect(tree.nodes[0]).toMatchObject({
      id: 0, parentId: null, x: 0, y: 0, endY: -1,
      angle: -Math.PI / 2, length: 1, depth: 0,
    })
    expect(tree.nodes[0].endX).toBeCloseTo(0)
  })

  it.each([1, 2, 3, 4])('builds complete levels with branching %i', (branching) => {
    const tree = generateTree({ branching, maxDepth: 4 })
    expect(tree.levels.map((level) => level.length)).toEqual(
      [0, 1, 2, 3, 4].map((depth) => branching ** depth),
    )
    expect(tree.levels.flat()).toHaveLength(tree.nodes.length)

    for (const [depth, level] of tree.levels.entries()) {
      for (const [index, node] of level.entries()) {
        expect(node.depth).toBe(depth)
        expect(tree.nodes[node.id]).toBe(node)
        if (index > 0) {
          const previous = level[index - 1]
          expect(node.x).toBeGreaterThanOrEqual(previous.x)
          if (node.x === previous.x) {
            expect(node.endX).toBeGreaterThanOrEqual(previous.endX)
          }
        }
      }
    }
  })

  it('connects children to parents with the configured fan and shrinking lengths', () => {
    const tree = generateTree({ branching: 3, maxDepth: 4, spread: 0.4, ratio: 0.65 })
    const childCounts = Array<number>(tree.nodes.length).fill(0)
    for (const node of tree.nodes) {
      expect(Math.hypot(node.endX - node.x, node.endY - node.y)).toBeCloseTo(node.length)
      if (node.parentId === null) continue
      const parent = tree.nodes[node.parentId]
      const childIndex = childCounts[parent.id]++
      const position = childIndex / 2 - 0.5
      expect(node.depth).toBe(parent.depth + 1)
      expect(node.x).toBe(parent.endX)
      expect(node.y).toBe(parent.endY)
      expect(node.length / parent.length).toBeGreaterThanOrEqual(0.65 * 0.9)
      expect(node.length / parent.length).toBeLessThan(0.65 * 1.1)
      expect(Math.abs(node.angle - parent.angle - position * 2 * 0.4)).toBeLessThanOrEqual(0.1)
    }
    for (const node of tree.nodes) {
      expect(childCounts[node.id]).toBe(node.depth === 4 ? 0 : 3)
    }
  })

  it('returns tight bounds covering all branch endpoints and the root', () => {
    const tree = generateTree({ spread: Math.PI / 2, seed: 0xffffffff })
    const xs = [0, ...tree.nodes.map((node) => node.endX)]
    const ys = [0, ...tree.nodes.map((node) => node.endY)]
    expect(tree.bounds).toEqual({
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    })
  })

  it('accepts zero spread and a single-child chain without invalid geometry', () => {
    const tree = generateTree({ spread: 0, branching: 1, maxDepth: 9, ratio: 0.9 })
    expect(tree.nodes).toHaveLength(10)
    for (const node of tree.nodes) {
      expect(Number.isFinite(node.endX) && Number.isFinite(node.endY)).toBe(true)
      expect(node.length).toBeGreaterThan(0)
    }
  })

  it.each([
    { seed: -1 }, { seed: 2 ** 32 }, { seed: 1.5 }, { seed: NaN },
    { maxDepth: -1 }, { maxDepth: 10 }, { maxDepth: 4.5 }, { maxDepth: Infinity },
    { branching: 0 }, { branching: 5 }, { branching: 2.5 }, { branching: NaN },
    { spread: -0.1 }, { spread: Math.PI }, { spread: Infinity },
    { ratio: 0 }, { ratio: -0.5 }, { ratio: 0.91 }, { ratio: NaN },
  ])('rejects invalid parameters: %j', (parameters) => {
    expect(() => generateTree(parameters)).toThrow(RangeError)
  })

  it('generates the largest supported tree without truncation', () => {
    const tree = generateTree({ maxDepth: 9, branching: 4 })
    expect(tree.nodes).toHaveLength(349525)
    expect(tree.levels.map((level) => level.length)).toEqual(
      Array.from({ length: 10 }, (_, depth) => 4 ** depth),
    )
    expect(tree.nodes.at(-1)?.depth).toBe(9)
  })
})
