# AI Usage & Prompt Log

This project was built with help from AI coding agents. As the hackathon rules require, every prompt and the agent's response to it are kept in this repository.

## Tools Used

| Tool | Model | Used for |
|------|-------|----------|
| Devin | GPT-6 Astra Medium Thinking | Project review, planning, scaffold, recursive trees, musical events, and audio playback |
| Command Code | Claude | Continued after Devin's quota ran out: finished the audio playback commit, then canvas visualization, controls, export, and polish |

## How the Log Is Organized

```
prompts/
├── prompt_1.txt
├── prompt_2.txt
├── prompt_3.txt
├── ...
└── response/
    ├── response_<prompt summary>.md
    └── ...
```

- **Prompt:** each `prompts/prompt_N.txt` holds one prompt, copied **verbatim** exactly as it was sent to the AI.
- **Response:** each agent response is saved as `prompts/response/response_<prompt summary>.md`,
  starting with the first Command Code session. Responses written before that folder
  existed live in the commit message instead.
- **Order:** prompts increase in the order they were sent, so the files read as the full prompt chain.

## Commit Convention

One prompt = one commit.

```
prompt_N: <short summary of what the agent did>

Tool: <tool / model>

Response:
<the agent's response, pasted verbatim or as complete as possible>
```

Example:

```
prompt_3: add pentatonic pitch mapping and reverb bus

Tool: OpenCode / GLM

Response:
Added src/audio/mapping.ts which maps branch depth to octave and
branch angle to a pentatonic degree. Created a Reverb(decay 8) and
PingPongDelay send bus in src/audio/engine.ts ...
```

## Reading the Log

List every prompt and the commit that answers it:

```bash
git log --reverse --format="%h %s" -- prompts/
```

Read a response:

```bash
ls prompts/response/
cat prompts/response/response_<prompt summary>.md
```

See one prompt with its commit and code changes:

```bash
git log --format="%B" -1 -- prompts/prompt_3.txt   # response text (older prompts)
git show <commit-hash>                             # code changes
```

## Rules I Follow

1. Every AI prompt gets a `prompt_N.txt`, including prompts whose output I discarded or changed heavily. In that case the commit says so.
2. Prompts are never edited after they're committed.
3. Code I wrote by hand without AI is committed normally, without a `prompt_` prefix.
4. History is never squashed or rewritten, so the prompt-to-response link is preserved.
