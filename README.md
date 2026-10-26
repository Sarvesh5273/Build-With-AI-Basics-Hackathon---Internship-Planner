# Internship Planner

A fresh proof of concept: taste test → editable Scout-like preferences → live official-source discovery → explicit target selection → preliminary eligibility → short foundation assessment → manually entered timetable → shared Research/Company roadmaps.

Scout's public repository was inspected as a behavioral reference. Its code, credentials, database and APIs are not imported.

Source repository: [Build With AI: Basics Hackathon — Internship Planner](https://github.com/Sarvesh5273/Build-With-AI-Basics-Hackathon---Internship-Planner).

## Run locally or in this workspace

Use Node 24 and pnpm 10. Install the pinned workspace dependencies with `pnpm install --frozen-lockfile`. The managed workspace service runs:

```sh
pnpm --filter @workspace/internship-planner run dev
```

After task merges, the configured `scripts/post-merge.sh` hook installs the
locked workspace dependencies non-interactively and rebuilds the client. It is
safe to rerun and does not call providers or alter personal progress. Replit
then reconciles the managed workflow.

The development service binds to `0.0.0.0`, port 22950. API requests are same-origin relative URLs. Use the workspace preview, not a frontend URL pointing at another localhost server.

Configure `SESSION_SECRET`, `TINYFISH_API_KEY` and `GROQ_API_KEY` through Replit Secrets. `TINYFISH_AGENT_FALLBACK=on` (non-secret) enables the capped paid Agent fallback. Never put their values in source, browser storage, committed configuration, screenshots or logs. No Replit-managed inference service is used by the app.

```sh
pnpm check
pnpm test
pnpm --filter @workspace/internship-planner validate:data
pnpm build
pnpm --filter @workspace/internship-planner start
```

The last command starts the built React client **and Express API**. Static-only hosting cannot run discovery or assessment. Publishing this source repository does not deploy the running app; production service configuration needs separate review before deployment.

## Provider and cost boundaries

- TinyFish Search/Fetch reads public leads and official pages.
- **Public job boards are read directly, without AI.** When a search finds any Greenhouse, Lever, Ashby or Workday posting or board, the app reads that employer's documented public job-board JSON (fixed platform hosts, DNS-checked, no redirects, 20 s timeout, 8 MB streamed cap; Workday's public career-site search is a POST, which TinyFish Fetch cannot send). Up to 12 most relevant internship postings per board become listings; every fact is a verbatim line of the posting (location, workplace, stated deadline, visa sentence, pay sentence) and passes the same quote validation. Ownership is checked once per board: the organization's own site must link to that board (same platform + tenant). Board titles that are not employer names are labelled “Employer not named by the board”.
- **Paid TinyFish Agent fallback (opt-in, capped).** Only when `TINYFISH_AGENT_FALLBACK=on` (a non-secret env var; off by default for clones). A real browser reads a page *only after Fetch failed*, and only for sources that could pass the ownership gate (recognised ATS boards, academic/government domains, `careers.`/`jobs.` hosts, or a host named after a requested organization) — never third-party job aggregators. Caps: 2 Agent reads per discovery run (run in the background so discovery continues), 1 per preparation, 120 s requested duration and the run's own deadline, 2 concurrent, $1.50 and 8 runs per UTC day. Each run reserves 25 steps × $0.016 = $0.40, then settles to TinyFish's reported steps; unknown cost stays reserved. Before every run the wallet is checked: auto-reload on, or balance under $1, means no run. **No wallet top-ups are ever made.** The Agent is told not to sign in, apply, upload or submit forms. Its captured text passes the same quote and ownership validation as Fetch text and is labelled as Agent-read. Observed: TinyFish runs can exceed the requested duration (≈140 s for 5 steps), so the app cancels at its own deadline and settles reported steps.
- The learner's native Groq configuration interprets public source text and grades fixed rubrics. Its model is `openai/gpt-oss-120b` through Groq—not an OpenAI key or internal inference service.
- Each discovery run: at most 5 minutes (results appear as they are found), 20 searches (including ownership look-ups), 80 URL attempts and 50 results. Pages are interpreted two at a time across two Groq models (`gpt-oss-120b`, falling over to `gpt-oss-20b`), each with its own free-tier allowance; quotes are validated in code either way. Fit uses the listing title and quoted description as well as extracted facts; results matching none of the student's topics are hidden by default (count + toggle). Public interpretation is locally validated against fetched quotes and ownership evidence.
- **Official vs other sources.** A page corroborated as the organization's own (or an ATS board its site links to) is an *official source*. Other readable pages with valid quotes (announcement sites, news, unlinked job-board pages) are shown as *Other source · unverified* rather than discarded, and pages about the same internship are merged into one card with per-fact source attribution. Login-walled/anti-automation job boards and social or student-report sites stay excluded. Results can be filtered by source, minimum fit and deadline status; results your own preferences exclude are hidden by default (with a count and toggle).
- Preparation: 180 seconds; selected snapshots must belong to the anonymous browser session. Each target's primary source can have at most two same-host requirements follow-ups. Unread links, clipped evidence and rejected claims stay disclosed.
- Assessment: at most 8 answers of 1,500 characters, one explicit bounded scoring request, 90 seconds. Questions and rubrics are trusted server records. Unknown IDs, incomplete rubric coverage and unsupported excerpts fail rather than create a score.
- Demo-oriented limits (the app is used privately for the demo, not published as a public kit): no practical per-user hourly cap (1,000/browser/hour only stops a runaway loop). Remaining ceilings are the free provider limits themselves: 950 URL attempts/day (TinyFish Fetch free tier 1,000/day) and, per Groq model, 7,800 tokens/minute, 950 requests and 195,000 tokens/day (Groq free tier: 1,000 requests/day, 8,000 tokens/minute, from Groq's rate-limit headers on 2026-10-24). The paid Agent keeps its $1.50/day cap. Conservative reservations settle against verified actual usage; unknown usage remains reserved. Limits reset at UTC midnight, not local midnight. No automatic paid retry.
- Groq receives only the *structure* of each schema; every value rule (categories, minimum/maximum lengths, item counts, number ranges) is described in text, because its strict mode rejects a whole page for one bad value. Locally, the strict schema stays authoritative: only the smallest invalid item (one fact, lead or opportunity) is dropped and disclosed, and the rest still goes through quote validation. Model/source concurrency and rolling rate windows are shared. Search or preparation can stop partial, preserving accepted evidence. A progress countdown is a bound, not a promised completion time.

## Privacy and trust

No accounts or database. Academic profile, exam weeks, free hours, task history and interview answers live in this browser's local storage. Answer text leaves the browser **only after assessment consent**. Do not include private information in answers.

The private server directory `private-runtime/` contains bounded public evidence caches, anonymous ownership records and operational quotas, not academic profiles or raw interview answers. It is not served, committed or intended for deployment packaging. Public extraction cache retention is seven days; temporary source/question ownership records are bounded; assessment results are transient and removed after five minutes. Private operational storage failure pauses provider work. No provider retention/deletion guarantee is implied.

This is a **single-process proof of concept**. Atomic local files and in-memory jobs are not shared across replicas. A restart preserves browser progress and public cache but expires active jobs and trusted question packs. Prepare again explicitly after an expired pack; compatible reviewed answers can be reused. A multi-instance/public-scale launch needs shared durable job/ownership/quota storage and a new security/privacy review.

## Honest planning

Eligibility is a local check of supported source rules and self-reported details, not certification. Missing criteria, unknown scales and opaque membership remain Needs confirmation. No CGPA conversion or admission-probability score.

Readiness assesses short conceptual foundations. Practical, specialist, clinical, licensed or spoken competence is not certified. Uncovered requirements remain Not assessed. General topics are not silently promoted to mandatory skills. Changing answers invalidates their older assessment.

Both tracks use one time ledger. Compatible core CV, practice and skill-evidence tasks are counted once, using their earliest served target date. Essays, programme formats and incompatible requirements remain separate. Effort, uniform/prorated weekly availability, letter/host waiting and buffers are app estimates, never official rules.

Exam weeks have zero preparation capacity. Overflow or dependency failure is At risk, not hidden overbooking. Undated targets receive a stable, editable personal date when generating—not an invented official deadline. Date-only source deadlines retain unknown time/timezone with an earlier conservative planning cutoff. Closed cycles are not given a guessed future call. Conditional selection stages are not invitations. Completion/reopening changes remaining estimated work and preserves history.

## Verification evidence

Unit tests exercise source integrity, provider bounds, ownership, rubric validation and fixed-clock scheduling. Browser verification during development included:

- Real public-provider discovery, save/select/filter/hide, ownership and restoration checks.
- Explicitly labelled **API-fixture** checks for interactive planning, privacy boundaries, failures/retry, exam weeks, both tracks, completion/reopening and phone/tablet/desktop layouts.
- A successful recorded real-provider demo covering taste test → preferences → discovery → explicit Research and Company targets → eligibility → source preparation → Groq readiness assessment → timetable with an exam week → both roadmap timelines and task completion. The recording uses an illustrative demo profile and answers.

The development browser harnesses are not part of this repository. Generated reports, recordings and screenshots are in ignored `generated-artifacts/`, not app demo data. Run the checked-in verification commands above to validate a clone; a past live run does not guarantee current provider availability or quota. The app has no fixture-discovery mode or fixed opportunity catalogue.

## Attribution and licensing

Frontend package notices and CC-BY official work-scenario attribution are shipped in the public directory. Server dependency notices are in `THIRD-PARTY-SERVER-NOTICES.md`. Dependencies are pinned; no dependency licence grants a licence to the app's own source. The application's own source is released under the MIT License (see `LICENSE`).

Approved product documents, the build checklist and the app map are tracked in `devpost/`. The private learner profile is excluded from Git. Do not treat passing tests or this README as confirmation that the Devpost submission has been completed.
