# Taste

## Workflow & repo conventions

- Wants a persistent response log alongside prompts: every agent response saved as its own markdown file at `prompts/response/response_{prompt-summary}.md`, one per prompt, going forward ("from the next prompt start logging"). Confidence: 0.85
- Never rewrite or amend existing history to fix a gap (e.g. a missing response file or a mislabeled commit): add a new, narrowly-scoped forward commit instead, and leave the original commit and its files untouched. Confidence: 0.75

## UI expectations

- Judge delivered UI by what is actually visible on a normal viewport, not by whether the element exists in the DOM: a feature he asked to "display under X" must land on screen without scrolling, so verify placement/dimensions visually rather than trusting that tests or the component tree show it. Confidence: 0.55

## Communication & documentation

- Prefers concise, high-level documentation: brief summaries that state *what* was done, not *how* it was implemented ("keep the steps minimum… they will only need to know what is being done in that step not how its done"). Confidence: 0.55
