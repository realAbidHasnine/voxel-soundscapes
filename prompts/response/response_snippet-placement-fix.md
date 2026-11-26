# Response — snippet placement fix

**Prompt:** see `prompts/prompt_19.txt`

**Tool:** Command Code / Claude

## What was wrong

The snippet was built and rendered, but it sat below the fold. The controls panel
had grown tall enough to stretch the grid, and because the grid centred its
items, the tree started at y=430 and the graph and snippet landed around y=820
on a 720px viewport. The page was 1458px tall.

Measured before the fix:

- tree: y 430, height 374
- snippet: y 820, height 208
- page height: 1458

## What was done

- Desktop now uses a viewport-height grid: the controls panel scrolls on its own
  and the visual column fits the screen.
- The tree flexes to fill the space left above the panels, so the graph and
  snippet are always visible.
- Zen mode keeps its own full-height layout.

After the fix: tree at y 40, snippet at y 392, page height exactly 720.

## Verification

- `npm test` — 128 unit tests passed.
- `npm run test:browser` — 25 browser tests passed.
- `npm run build` — type check and production build passed.
