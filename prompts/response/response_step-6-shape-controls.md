# Response — step 6: shape controls

**Prompt:** see `prompts/prompt_13.txt`

**Tool:** Command Code / Claude

## What was done

- Added a Shape panel with max depth, branching, spread, and tempo sliders.
- Added a Regrow button that picks a new seed.
- Changing shape regenerates the tree, score, and canvas together.

## Notes

- Regeneration is debounced, because the largest tree takes about 300 ms to build.
- The panel shows the branch count, so heavy settings are visible before they run.
- Volume is now kept outside the player session and survives a regrow.

## Verification

- `npm test` — 71 unit tests passed.
- `npm run test:browser` — 10 browser tests passed.
- `npm run build` — type check and production build passed.
