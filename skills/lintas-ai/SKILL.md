---
name: lintas-ai
description: Entry point for Lintas AI — local/remote AI gateway with OpenAI-compatible REST for chat, image, TTS, embeddings, web search, web fetch. Use when the user mentions Lintas AI, LINTAS_AI_URL, or wants AI without writing provider boilerplate. This skill covers setup + indexes capability skills; fetch the relevant capability SKILL.md from the URLs below when needed.
---

# Lintas AI

Local/remote AI gateway exposing OpenAI-compatible REST. One key, many providers, auto-fallback.

## Setup

```bash
export LINTAS_AI_URL="http://localhost:20128"      # or VPS / tunnel URL
export LINTAS_AI_KEY="sk-..."                      # from Dashboard → Keys (only if requireApiKey=true)
```

All requests: `${LINTAS_AI_URL}/v1/...` with header `Authorization: Bearer ${LINTAS_AI_KEY}` (omit if auth disabled).

Verify: `curl $LINTAS_AI_URL/api/health` → `{"ok":true}`

## Discover models

```bash
curl $LINTAS_AI_URL/v1/models                  # chat/LLM (default)
curl $LINTAS_AI_URL/v1/models/image            # image-gen
curl $LINTAS_AI_URL/v1/models/tts              # text-to-speech
curl $LINTAS_AI_URL/v1/models/embedding        # embeddings
curl $LINTAS_AI_URL/v1/models/web              # web search + fetch (entries have `kind` field)
curl $LINTAS_AI_URL/v1/models/stt              # speech-to-text
curl $LINTAS_AI_URL/v1/models/image-to-text    # vision
```

Use `data[].id` as `model` field in requests. Combos appear with `owned_by:"combo"`.

Response shape:
```json
{ "object": "list", "data": [
  { "id": "openai/gpt-5", "object": "model", "owned_by": "openai", "created": 1735000000 },
  { "id": "tavily/search", "object": "model", "kind": "webSearch", "owned_by": "tavily", "created": 1735000000 }
]}
```

## Capability skills

When the user needs a specific capability, fetch that skill's `SKILL.md` from its raw URL:

| Capability | Raw URL |
|---|---|
| Chat / code-gen | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-chat/SKILL.md |
| Image generation | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-image/SKILL.md |
| Text-to-speech | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-tts/SKILL.md |
| Speech-to-text | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-stt/SKILL.md |
| Embeddings | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-embeddings/SKILL.md |
| Web search | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-web-search/SKILL.md |
| Web fetch (URL → markdown) | https://raw.githubusercontent.com/codingcollective-dev/AI-Gateway/refs/heads/main/skills/lintas-ai-web-fetch/SKILL.md |

## Errors

- 401 → set/refresh `LINTAS_AI_KEY` (Dashboard → Keys)
- 400 `Invalid model format` → check `model` exists in `/v1/models/<kind>`
- 503 `All accounts unavailable` → wait `retry-after` or add another provider account
