import type { MusicalScore } from '../music/generateScore'
import type { RecursiveTree } from '../tree/generateTree'

export interface TreeGeometry {
  readonly nodeCount: number
  /** Unit coordinates per branch, indexed by node id: x1, y1, x2, y2. */
  readonly segments: Float32Array
  /** Depth per branch, indexed by node id. */
  readonly depths: Uint8Array
  /** Branch ids in playback order, one per cue; silent branches are included. */
  readonly bloomOrder: Uint32Array
  /** Bloom time in seconds, parallel to `bloomOrder` and non-decreasing. */
  readonly bloomTimes: Float32Array
  readonly maxDepth: number
}

/**
 * Flatten a tree and its score into typed arrays the renderer can read per frame.
 * Coordinates keep their aspect ratio inside a unit square, so resizing never
 * needs to rebuild the geometry.
 */
export function buildTreeGeometry(
  tree: RecursiveTree,
  score: MusicalScore,
): TreeGeometry {
  const { minX, maxX, minY, maxY } = tree.bounds
  const width = maxX - minX
  const height = maxY - minY
  const size = Math.max(width, height) || 1
  const offsetX = (size - width) / 2
  const offsetY = (size - height) / 2
  const scale = 1 / size

  const segments = new Float32Array(tree.nodes.length * 4)
  const depths = new Uint8Array(tree.nodes.length)

  // The tree grows along negative Y and canvas Y grows downward, so normalized
  // coordinates already stand the trunk at the bottom: no axis flip needed.
  for (const node of tree.nodes) {
    const base = node.id * 4
    segments[base] = (node.x - minX + offsetX) * scale
    segments[base + 1] = (node.y - minY + offsetY) * scale
    segments[base + 2] = (node.endX - minX + offsetX) * scale
    segments[base + 3] = (node.endY - minY + offsetY) * scale
    depths[node.id] = node.depth
  }

  const bloomOrder = new Uint32Array(score.cues.length)
  const bloomTimes = new Float32Array(score.cues.length)
  for (const [index, cue] of score.cues.entries()) {
    bloomOrder[index] = cue.nodeId
    bloomTimes[index] = cue.timeSeconds
  }

  return {
    nodeCount: tree.nodes.length,
    segments,
    depths,
    bloomOrder,
    bloomTimes,
    maxDepth: tree.parameters.maxDepth,
  }
}
