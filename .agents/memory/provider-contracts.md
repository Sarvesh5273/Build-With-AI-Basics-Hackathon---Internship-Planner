---
name: Provider contracts and spending authorization
description: Non-obvious behaviour of Groq structured output, TinyFish Fetch/Agent and public job boards, plus the learner's spending caps.
---

## Groq strict json_schema rejects the whole reply for one bad value
Groq returns HTTP 400 `json_validate_failed` for an off-list enum, a short/long string or an over-long list, despite docs promising constrained decoding. Its `failed_generation` is often complete JSON.
**Rule:** send structure only (all value keywords moved into descriptions); validate strictly locally and salvage the smallest invalid item; a rejected complete reply goes through the same local salvage. Never log failed generations.
**Why:** both learner-visible “could not produce valid structured output” failures were this.

## Groq free-tier throughput is the discovery ceiling
Free tier: 8,000 tokens/min and 1,000 requests/day per model; limits are per model. Only gpt-oss-120b and gpt-oss-20b worked with the schema. ~4 pages/min across both.
**How to apply:** on malformed output or a 429, move to the other model, then wait retry-after once; don't end the run. Searches wind down by plan (finish in-flight, queue the rest) — the learner reads a “time limit reached” note as failure.

## Public job boards: read the board JSON directly
Large Greenhouse `?content=true` feeds exceed TinyFish Fetch's response size, and Workday search is a POST. Read documented board JSON directly and build listings deterministically from verbatim lines. Greenhouse `company_name` can be a board title — never show it as an employer.

## TinyFish Agent
Runs overrun `max_duration_seconds`; bound by the caller's deadline, cancel, then GET to settle reported steps. `max_steps` is beta-gated (403). Too slow/costly to replace Search (1–2 pages per search). Spend only on sources that can pass ownership.

## Spending authorization
Learner: “its ok if it costs credit as we did it with scout app and capped the usage”. Caps: $1.50/day, 8 runs/day, 2 per discovery run. Never top up the wallet; refuse if auto-reload is on. Don't raise caps without asking.
App per-user hourly/daily caps were removed at the learner's request for private demo use (“remove all hard limits its hurting demo”); keep input validation and paid-spend gates.
