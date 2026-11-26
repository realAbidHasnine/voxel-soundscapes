# Response — step 8: presets and zen mode

**Prompt:** see `prompts/prompt_15.txt`

**Tool:** Command Code / Claude

## What was done

- Added the three presets from the project brief: Forest Canopy (C major),
  Midnight Rain (A minor), and Cherry Blossom (D major).
- Each preset sets the scale, tempo, tree shape, and color palette together.
- The palette now colors the tree, labels, sliders, buttons, progress bar, and page.
- Added zen mode, which hides the interface and leaves only the tree.
  Escape or the exit button returns to the full view.

## Notes

- The score's root and scale moved into the shared parameters, so a preset can
  change key and mode instead of only the tree shape.
- Choosing a preset also updates the Shape sliders, since those values are part
  of the preset.
- Zen mode hides the panel with `hidden`, so keyboard focus cannot land inside it.

## Verification

- `npm test` — 88 unit tests passed.
- `npm run test:browser` — 15 browser tests passed.
- `npm run build` — type check and production build passed.
- Checked screenshots of all three presets and zen mode.
