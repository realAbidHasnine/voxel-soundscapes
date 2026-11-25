# AI Usage & Prompt Log

This project was built with help from AI coding agents. As the hackathon rules require, every prompt and the agent's response to it are kept in this repository.

## Tools Used

| Tool | Model | Used for |
|------|-------|----------|
| Devin | GPT-6 Astra Medium Thinking | Project review, implementation planning, and application scaffold |

## How the Log Is Organized

```
prompts/
├── prompt_1.txt
├── prompt_2.txt
├── prompt_3.txt
└── ...
```

- **Prompt:** each `prompts/prompt_N.txt` holds one prompt, copied **verbatim** exactly as it was sent to the AI.
- **Response:** the agent's response to `prompt_N` is recorded in the **commit** that adds `prompt_N.txt`. The commit holds:
  - the code or files the agent produced or changed
  - the agent's text response in the commit message (summary in the subject, full response in the body)
- **Order:** `N` increases in the order the prompts were sent, so the files read as the full prompt chain.

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

See one prompt and its full response plus code changes:

```bash
git log --format="%B" -1 -- prompts/prompt_3.txt   # response text
git show <commit-hash>                             # code changes
```

## Rules I Follow

1. Every AI prompt gets a `prompt_N.txt`, including prompts whose output I discarded or changed heavily. In that case the commit says so.
2. Prompts are never edited after they're committed.
3. Code I wrote by hand without AI is committed normally, without a `prompt_` prefix.
4. History is never squashed or rewritten, so the prompt-to-response link is preserved.
