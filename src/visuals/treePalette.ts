/** Colors a preset gives the tree and the page. Hues are degrees on the color wheel. */
export interface TreePalette {
  readonly hueStart: number
  readonly hueEnd: number
  readonly saturation: number
  readonly lightnessStart: number
  readonly lightnessEnd: number
  /** Radial glow behind the page. */
  readonly glow: string
  /** Page background behind the glow. */
  readonly background: string
  /** Accent for labels, buttons, and the progress bar. */
  readonly accent: string
  /** Translucent panel that sits over the tree. */
  readonly panel: string
}

export const FOREST_PALETTE: TreePalette = Object.freeze({
  hueStart: 166,
  hueEnd: 142,
  saturation: 52,
  lightnessStart: 38,
  lightnessEnd: 68,
  glow: '#203c30',
  background: '#101c19',
  accent: '#a7f3d0',
  panel: '#16281fe0',
})
