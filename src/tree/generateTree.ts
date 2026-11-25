import { mulberry32 } from '../random/mulberry32'

export interface TreeParameters {
  readonly seed: number
  /** Root depth is zero. The core supports 0–9; the planned UI uses 4–9. */
  readonly maxDepth: number
  /** Children per branch. The core supports 1–4; the planned UI uses 2–4. */
  readonly branching: number
  /** Half of the fan angle, in radians, from 0 to PI / 2. */
  readonly spread: number
  /** Length multiplier, greater than zero and at most 0.9. */
  readonly ratio: number
}

export interface TreeNode {
  readonly id: number
  readonly parentId: number | null
  readonly depth: number
  readonly x: number
  readonly y: number
  readonly endX: number
  readonly endY: number
  readonly angle: number
  readonly length: number
}

export interface RecursiveTree {
  readonly parameters: TreeParameters
  /** Depth-first creation order; nodes[id] resolves parent references. */
  readonly nodes: readonly TreeNode[]
  /** Breadth-first playback order, with each depth sorted left to right. */
  readonly levels: readonly (readonly TreeNode[])[]
  readonly bounds: {
    readonly minX: number
    readonly maxX: number
    readonly minY: number
    readonly maxY: number
  }
}

export const DEFAULT_TREE_PARAMETERS: TreeParameters = Object.freeze({
  seed: 1,
  maxDepth: 6,
  branching: 2,
  spread: Math.PI / 6,
  ratio: 0.7,
})

function assertRange(
  name: string,
  value: number,
  min: number,
  max: number,
  integer = false,
) {
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    throw new RangeError(
      `${name} must be ${integer ? 'an integer' : 'a finite number'} between ${min} and ${max}.`,
    )
  }
}

/**
 * Generate in world coordinates: a unit trunk at (0, 0) pointing upward.
 * No canvas size, audio state, clock, or global randomness affects the result.
 * Validated depth/branching bound the complete tree to 349,525 nodes.
 */
export function generateTree(
  overrides: Partial<TreeParameters> = {},
): RecursiveTree {
  const parameters = { ...DEFAULT_TREE_PARAMETERS, ...overrides }
  const { seed, maxDepth, branching, spread, ratio } = parameters

  assertRange('seed', seed, 0, 0xffffffff, true)
  assertRange('maxDepth', maxDepth, 0, 9, true)
  assertRange('branching', branching, 1, 4, true)
  assertRange('spread', spread, 0, Math.PI / 2)
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 0.9) {
    throw new RangeError('ratio must be greater than zero and at most 0.9.')
  }

  const random = mulberry32(seed)
  const nodes: TreeNode[] = []
  const levels: TreeNode[][] = Array.from({ length: maxDepth + 1 }, () => [])
  const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 }

  function grow(
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    parentId: number | null,
  ): void {
    const node: TreeNode = {
      id: nodes.length,
      parentId,
      depth,
      x,
      y,
      endX: x + Math.cos(angle) * length,
      endY: y + Math.sin(angle) * length,
      angle,
      length,
    }
    nodes.push(node)
    levels[depth].push(node)
    bounds.minX = Math.min(bounds.minX, node.endX)
    bounds.maxX = Math.max(bounds.maxX, node.endX)
    bounds.minY = Math.min(bounds.minY, node.endY)
    bounds.maxY = Math.max(bounds.maxY, node.endY)

    if (depth >= maxDepth) return

    for (let i = 0; i < branching; i++) {
      const position = branching === 1 ? 0 : i / (branching - 1) - 0.5
      const childAngle = angle + position * 2 * spread + (random() - 0.5) * 0.2
      const childLength = length * ratio * (0.9 + random() * 0.2)
      grow(node.endX, node.endY, childAngle, childLength, depth + 1, node.id)
    }
  }

  grow(0, 0, -Math.PI / 2, 1, 0, null)

  for (const level of levels) {
    // Siblings share a start point; endpoints give those ties a spatial order.
    level.sort((a, b) => a.x - b.x || a.endX - b.endX || a.id - b.id)
  }

  return { parameters, nodes, levels, bounds }
}
