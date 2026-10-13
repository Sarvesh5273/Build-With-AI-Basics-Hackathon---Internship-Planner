---
doc: spec
status: draft
---

# Untitled — Technical Spec

Revised for the learner's explicit direction: **replicate Scout's relevant discovery functionality with TinyFish, implemented fresh**, then connect the student's choices to the agreed readiness and roadmap product. This replaces the rejected fixed-catalog proposal. It is planning, not application code.

## How This Works, In Plain Language

First, the student answers real, source-grounded questions about common internship work genres. Similar internships share genres, so this is one reusable taste test—not a test for every internship.

The next screen asks Scout-like questions about topics, locations, Research/Company interests, funding, visa needs and other preferences. A small TypeScript server uses TinyFish to search the web and read relevant official pages. It extracts evidence, labels unknown information honestly, and returns ranked results with filters and save/hide controls. The student chooses their targets; neither the taste test nor a hardcoded list chooses for them.

For those targets, the server checks the student's details against sourced criteria and assesses a short readiness interview with AI. Ordinary code groups compatible preparation, counts shared work once, and fits it into the student's free hours around exams. Shared steps serve the earliest deadline in their group. Closed or impossible-to-fit targets remain explicitly visible as closed or at risk.

React provides the screens. Personal progress stays in the browser; short-lived server records support search, evidence and cost limits. No Scout import, Scout API call, existing Scout database, accounts, application submission or copied Scout code.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. **Taste test:** reviewed genre questions grounded in real work → reactions → direction summary.
2. **Scout-like questions:** direction suggests editable topics; student supplies discovery preferences.
3. **Discovery:** server creates queries → TinyFish Search → candidate careers/program/ATS pages → TinyFish Fetch → structured extraction and evidence validation → deduplication and fit ranking.
4. **Filter and choose:** student filters results, saves/hides listings, and explicitly selects targets. Selection is separate from bookmarking; changing a display filter never deselects targets.
5. **Eligibility:** academic details plus conditional follow-ups → criteria checks → meets extracted criteria / not eligible / needs confirmation. Cycle status is separate.
6. **Readiness and timetable:** selected targets' skills → question bank or grounded question pack → answers → one assessment call; manual exam weeks/free hours retained.
7. **Roadmaps:** sources + selected targets + assessment + timetable → deterministic shared-task construction and one cross-track capacity ledger → overview and track timelines.
8. **Return:** restore browser progress, re-check dates locally, and update allocations after completion/timetable edits. A date check is not a claim that official pages were re-fetched.

## Stack

| Piece | Choice / rationale | Documentation |
| --- | --- | --- |
| Language | TypeScript throughout; accepted recommendation. One language for browser, rules and server. | [TypeScript](https://www.typescriptlang.org/docs/) |
| UI | React + Vite; focused components and ordinary CSS tokens. | [React](https://react.dev/learn), [Vite](https://vite.dev/guide/) |
| Server | Node.js 24 + Express, one same-origin service. Node 24 is already available here. | [Node](https://nodejs.org/docs/latest-v24.x/api/), [Express](https://expressjs.com/) |
| Discovery | **TinyFish Search + Fetch, with controlled Agent fallback.** Explicitly chosen by the learner. | [Search](https://docs.tinyfish.ai/search-api/reference), [Fetch](https://docs.tinyfish.ai/fetch-api/reference), [Agent](https://docs.tinyfish.ai/agent-api/reference) |
| AI | OpenAI through Replit AI Integrations; proposed `gpt-4.1-mini` for evidence extraction and readiness. | [Managed AI](https://docs.replit.com/features/integrations/replit-ai-integrations), [model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) |
| Validation/tests | Zod at external-data boundaries; Vitest for rules, contracts and fixed-clock tests. Browser tests for the journey. | [Zod](https://zod.dev/), [Vitest](https://vitest.dev/guide/) |
| Storage | Browser localStorage for personal progress; bounded, private server files for public-source snapshots, run ownership and quotas. No database/auth service for the single-instance POC. | [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |

Pin compatible versions and the lockfile at the first build step after maintenance, vulnerability and license checks. No app dependencies are installed yet. TinyFish can use native server `fetch`; an SDK is optional after vetting, not copied from Scout.

### Component Licensing

Verify the installed versions and transitive licenses of every dependency before committing. Preserve third-party notices.

[React Bits' current license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) is **MIT with a Commons Clause condition, not plain MIT**. It permits use as part of an application but restricts selling, sublicensing or redistributing the components themselves, including bundles/ports. Any included component retains its notice and appears in THIRD_PARTY_NOTICES.md, separately from our app license.

Use ready-made interactions where helpful, but React Bits is not mandatory. Choose accessible, reduced-motion-friendly components after individual license review; use a permissively licensed equivalent if its restrictions do not fit. Do not redistribute a component library or claim blanket legal clearance.

## Where It Runs and How Someone Tries It

Create a fresh web artifact in this Replit project during the build phase, with one managed workflow and one server on `0.0.0.0:5000`. The artifact's generated location determines the app directory; the structure below describes the files inside it.

Planned commands, **not implemented yet**:

- Initial setup installs vetted packages and creates the lockfile; thereafter `npm ci`.
- `npm run dev` — Express with Vite middleware; open `/` in Replit Preview.
- `npm run check`, `npm test`, `npm run validate:data` — types, tests and curated-question/source validation.
- `npm run build` followed by `npm start` — built client + same-origin API.

App requests use relative `/api/...` paths. Vite must accept Replit's proxied development host. No hardcoded localhost in app code.

TinyFish needs server-side `TINYFISH_API_KEY`. No matching TinyFish connector was returned by the integration lookup; **do not substitute Parallel/Tavily or claim TinyFish is already connected**. Request the key through the workspace Secrets flow during setup, never chat, source files or the browser. Do not read or copy Scout's credentials.

Managed AI activation/configuration is also an early build gate. Obtain the actual platform-provided settings, not guessed proxy URLs or environment-variable names. Without configuration, show explicit unavailability; do not replace live discovery with unlabelled fixtures.

Required submission: short demo video + public GitHub repository containing approved planning docs. Publishing is optional, not a substitute for either. A clone needs documented provider setup; it will not magically inherit this workspace's integrations or secrets. Publishing is not authorized by this spec.

**Before application coding:** explicitly tell the learner it is starting. Scope/PRD/spec edits are planning, not that notice. This planning task does not create scaffolding or install app packages.

## Look and Feel

Implements `prd.md > Look and Feel`; preserve the agreed **paper planner with bold accents** and a distinct identity from Scout.

Off-white/grid-paper base, dark ink, chunky headings, strong flat highlighter accents, thick outlines and modest hard shadows. Sources appear as clipped excerpts; deadline/at-risk states include text, not just color. Exam weeks are hatched and labelled.

Phone: stacked forms, results and week blocks; filters in an accessible expandable panel. Desktop: denser result/overview layouts. Editable CSS tokens support manual tuning. Readable body type, 44px touch targets, keyboard focus, associated field errors, source disclosures and live status announcements. Respect reduced motion; no essential information depends on hover or animation.

## Components

### Taste Test and Direction

Implements `prd.md > Taste Test`.

10–12 reviewed questions/work scenarios cover shared genres: research/company work and areas such as software, ML/data, robotics and core engineering. Each references the real official work description grounding it. These are **app-authored direction questions**, not claimed verbatim employer interview questions.

Direction responses include interested/not for me/unclear. Use per-genre proportions rather than raw totals so a research-heavy sample does not automatically imply research preference. Ties can suggest both; no interest stays undecided; unclear means explore, not low ability. Result informs editable preferences, never target selection.

Only this reusable question set is curated. The searchable internships are not a fixed catalog.

### Scout-Like Preferences and Search Planning

Implements `prd.md > Search Preferences, Discovery and Selection`.

Fresh implementation of the relevant Scout behavior:

| Capability | Planned behavior |
| --- | --- |
| Preferences | Topics/roles, locations, Research/Company, remote preference, citizenship/visa needs, funding, include/exclude keywords, preferred organizations. |
| Query planning | Cover company careers/official ATS postings, research programs, requested organizations and geography. Keep internships as the opportunity level; Scout's experienced-job searches are outside this product. |
| Live discovery | TinyFish Search → classify individual postings/programs versus index/careers pages → read relevant pages with Fetch → bounded browser-agent fallback where necessary and authorized. |
| Ranking | Explainable preference fit, computed in code from evidence; never “chance of selection.” |
| Results | Search within results; Research/Company, visa/funding/unknown-state filters; sort by fit, newest, deadline; save/hide controls. |
| Evidence | Quote + URL + last-read date for each funding/visa/eligibility/deadline fact; unknown stays unknown. |
| Progress | Search/run status, sources checked, partial failures, explicit limits, retry/search more. |
| Roadmap handoff | User-selected targets only, with source/version references and constraints. |

Keep search preferences in browser progress. The server receives only what discovery needs, not grades, timetable or interview answers. Topics, preferred locations and citizenship/visa constraints may reach the providers; explain this before search.

Initial proposed per-run budget: 8 queries, 20 fetched URLs including followed pages, at most 20 returned evidence-backed listings, and a 180-second overall deadline. Bounds control work, not the universe of eligible programs. Show queries/source coverage and partial results; offer another bounded search/page instead of claiming exhaustive coverage. Changing preferences creates a new search, not merely a local reorder of seed data.

Scheduled unattended hunts, showcase dashboards and advanced Scout administration are **recommended POC deferrals**, not already-agreed exclusions. Core search/filter/evidence functionality is not deferred. Review approval resolves this proposed boundary.

### Discovery Runner, Source Reading and Evidence Extraction

Implements `prd.md > Search Preferences, Discovery and Selection`, `prd.md > Official Sources`.

1. Plan and deduplicate queries; reserve the run's provider budget before dispatch.
2. Classify results into official pages/ATS leads and other leads. Search snippets/aggregators help find a page but are not authority for program facts.
3. Validate public HTTPS URLs and redirects; reject local/private/metadata addresses, credentials in URLs and untrusted protocols. Corroborate an institution/employer's ownership or an official link to its ATS board. A plausible domain name alone is insufficient. New official sources can enter; source safety is not a fixed program list.
4. Fetch relevant pages and limited application/eligibility links; retain short contextual excerpts and source metadata. Login walls stay inaccessible; do not attach credentials, vaults or profiles or bypass access restrictions.
5. Extract a typed listing: organization, opportunity/track, dates/cycle, funding components/fees/caps, visa statement, eligibility rules, skills and official selection stages. Every factual field is nullable and references an exact quote/source. Reject unsupported claims, invalid enums/IDs, quotations absent from text and cross-program quote attribution.
6. Deduplicate by canonical official posting + organization + cycle; retain source history. Do not collapse distinct roles/projects simply because they share an institution.
7. Compute match/filter values and return results even when some sources failed. “Official page read” is provenance, **not a guarantee that automated interpretation is correct**. Show interpretations as evidence-backed preliminary checks with the original excerpts.

AI supplies extracted facts/labelled judgments, not an opaque final fit score. Code computes an explainable 0–100 preference score using role/topic (35), location/remote (20), funding preference (20), visa constraint (15) and include keywords (10). Unknown is not a positive match and is visibly reflected in reasons; hard exclusions/confirmed incompatibilities cannot rank as a strong fit. Weights are app guidance, not admission odds.

Compatible public source snapshots are cached by canonical URL + content hash + extractor version. Last fetched and last interpreted are separate timestamps. A personal timetable edit does not re-crawl. Results returned from cache are labelled; TinyFish `ttl:0` **prefers** live fetching but its current docs do not guarantee fresh origin content in every case.

### Filtering, Saving and Target Selection

Implements `prd.md > Search Preferences, Discovery and Selection`, `prd.md > States and Boundaries`.

Store saved IDs, hidden IDs, selected IDs, preferences and result snapshots locally. Saved does not automatically mean selected. Hidden/selected conflicts require an explicit choice; filters never silently delete selections.

Before planning, fetch additional official stage/requirement evidence for selected targets within the same safety/budget controls. Selection may be processed in batches; do not impose an unexplained “three internships only” product limit. Missing requirements/stages remain unconfirmed, with general preparation separated from confirmed program steps.

Deselecting removes that program's scheduling constraints and tags; preserve completed shared work that still applies. Add/select new targets → re-evaluate eligibility, relevant questions and future allocations. Do not re-score existing answers unnecessarily.

### Profile and Eligibility Engine

Implements `prd.md > Eligibility Check`.

Separate eligibility (`meetsExtractedCriteria | failsCriteria | needsConfirmation`) from cycle (`open | closed | rolling | unknown | unavailable`). Check supported typed rules in code; unsupported/ambiguous rules remain needs-confirmation rather than AI-guessed eligibility.

Inputs include nationality, study year, grade **value and scale**, branch, plus conditional institute/degree dates/remaining-semester/English/age-threshold confirmations when official rules require them. Do not collect identity documents or full date of birth unnecessarily. Do not turn all CGPAs into percentage by multiplying by ten.

One failed mandatory criterion yields a sourced negative. No failures plus missing mandatory evidence is not a positive. The student's statements are not independently verified. Show “Based on your details and extracted official criteria—check the linked conditions before applying.”

### Readiness Questions and AI Assessment

Implements `prd.md > Readiness Interview`.

Selected targets' sourced skills map to a reviewed skill/question bank. Reuse relevant questions across similar internships. For skills outside that bank, generate a small question/rubric pack grounded in the extracted skill descriptions; label it app-generated preparation, never an employer's official interview questions. Validate source/skill IDs and topic coverage. If a skill cannot be assessed responsibly, show **Not assessed**, not a fabricated verdict.

6–8 questions per short interview; one at a time. A question pack has fixed rubric items before answers are submitted. One AI assessment request per completed interview, not per keystroke. Server retrieves the trusted question/rubric and evidence records; the client cannot supply new system instructions or official facts.

Strict response: question/rubric IDs, `met | partial | missing`, brief reason and an excerpt from the student's answer. Validate coverage and excerpt membership, not just JSON shape. Code maps rubrics to ready/partly/not yet. A short response is evidence of readiness for those questions, not certification of mastery or probability of selection.

Documents/external actions are checklists, not AI-certified skills. The interview cannot confirm that a professor submitted a letter. Failures preserve answers and show an honest retry/unavailable state.

### Manual Timetable and Browser Progress

Implements `prd.md > Timetable Entry`, `prd.md > States and Boundaries`.

Versioned localStorage stores personal details, reactions, preferences, targets/evidence snapshots, timetable, answers, assessment and completion IDs. Validate restored state and handle schema/source/rubric changes. Reset requires confirmation; blocked/full/corrupt storage gets a visible warning. Same browser and origin only; no cross-device promise.

One weekly free-hour budget across **both tracks**, not duplicated per track. Conservative initial implementation gives exam weeks zero preparation capacity; prorate the remaining portion of the current week. Marking done removes remaining effort; reopening restores it. Hours and waiting times are estimates.

### Shared Preparation and Deadline Scheduler

Implements `prd.md > Track Timeline`, `prd.md > Deadline Handling`.

The agreed behavior remains:

1. Build preparation dependencies backwards from each selected internship's actual official selection stages.
2. Merge only compatible reusable work—CV core, shared skill practice, reusable evidence—not distinct essays/submissions with different formats.
3. Tag each shared task with all programs it serves and assign the **earliest deadline it serves**.
4. Allocate dependency-ready work, earliest due first, into one future cross-track capacity ledger. Split effort into weekly chunks when needed; finishing in a deadline's week is insufficient if the chunk falls after its actual cutoff.
5. Never overflow silently. Leave impossible work visibly unscheduled/at risk, with hours/dependency reasons and affected targets. Waiting for an external letter is a real dependency, not compressible study hours.
6. Passed deadlines remove the program from active allocations but preserve completed history. Recompute the earliest deadline after removing a tag.

Known deadlines: UTC instant + original timezone and official quote. Date-only cutoff: disclose unknown time and schedule before that day conservatively. Rolling/capacity-limited programs: editable **personal application target**, explicitly not an official deadline. Unknown future cycles: no invented reopening month.

Actual later interviews/stages appear at published dates or as conditional “After application—date not published.” Prep can precede application; do not fabricate a date for the actual interview.

Re-check deadlines on roadmap load, tab return and day change. This cannot warn while the app is closed; background reminders remain cut. Re-checking elapsed time is distinct from verifying the source is still current.

### Overview and Track Timeline

Implements `prd.md > Roadmap Overview`, `prd.md > Track Timeline`.

Retain the two levels: overview with this week's one actionable step across all targets; Research/Company cards; clicking opens the week-by-week track timeline. Show source disclosures for every program tag, hours, exams, deadlines/targets, conditional stages, risk and completion.

Choose the next dependency-ready unfinished action by nearest relevant due date. If no action is possible this week, show the honest empty/confirmation state rather than invent a step. No eligible targets → sourced reasons; all closed → general skill preparation and only evidenced future-call information.

### Server Safety, Cost Limits and Operations

Implements `prd.md > Official Sources`, `prd.md > States and Boundaries`.

- Same-origin JSON endpoints; reject unexpected origins, no wildcard CORS. Server-issued signed anonymous token + owner checks for run IDs. No account authentication claims.
- Validate all requests/provider outputs; 32KB ordinary body limit, 8 readiness answers max, 1,500 chars each; bound query fields, URLs, page text, extracted-listing count and model output.
- Trust only the configured proxy topology for IP limits; never arbitrary forwarded headers. Token/IP limits are abuse controls, not a durable identity.
- Proposed POC limits: 2 searches per browser/hour, 6 per trusted IP/hour; 3 assessments per browser/hour; 2 concurrent searches globally, 2 model calls globally. Reserve quotas atomically to avoid parallel overspend.
- Persistent server operational counters: proposed daily maximum 50 searches, 800 fetched URLs, 150 total model calls. If quota storage fails, paid calls fail closed rather than reset silently. TinyFish rate limiting is independent of our budget.
- Extraction in bounded batches (e.g. up to 4 pages and 12k input tokens per model call); readiness output cap ~1,800 tokens; 30s model timeout, per-URL fetch timeout 25s, whole-search deadline 180s. No automatic retry storms; provider 429 respects Retry-After and bounded backoff.
- Paid Agent fallback needs explicit wallet/budget authorization at setup and a verified enforcement strategy. Current step-cap/strict-mode features are beta-gated; do not assume access or use an unenforceable hard-dollar claim. Keep fallback disabled until that gate is met, while retaining genuine Search/Fetch discovery.
- No application writes, logins, credential vaults, browsing tools in the extraction/readiness LLM, arbitrary URL proxy endpoint, or raw HTML rendering. Page text/answers are data, not instructions; never execute student code.
- Before search/interview, disclose provider transmission. Grades/timetable/answers stay out of discovery calls; answers leave the browser only for scoring. No server logs/disk of raw academic profile or interview text; verify provider terms before claiming retention/deletion guarantees.
- Structured logs: request ID, stage, duration, sanitized error category and usage counts; no credentials, raw IPs or personal answers. `/api/health` checks app/configuration/store readiness without paid calls.

Private JSON files are a single-process POC implementation, with atomic writes and a bounded retention policy; not a scalable production database. A later public/multi-instance launch needs shared durable storage/quotas and a fresh privacy/security review.

## Data Model and Persistence

| Record | Main fields | Where / lifecycle |
| --- | --- | --- |
| Genre question | ID, scenario, genre/track, direction options, official source excerpt/URL | Reviewed files; reusable independently of live listings. |
| Preferences | Roles/topics, places, track, remote, funding, citizenship/visa, keywords/exclusions, organizations | Browser; sent transiently for a search. |
| Search run | Opaque ID/owner hash, status/stage, query coverage, usage, result IDs, sanitized failures | Short-lived private server run store; proposed 24h retention. No raw profile/answers. |
| Source snapshot | Canonical URL, title, short excerpts, content hash, fetchedAt/interpretedAt, extractor version, freshness label | Bounded private cache, proposed 7-day retention; currentness remains visible. Raw pages are not public repo files. |
| Listing | Stable posting+cycle ID, organization, track/skills, typed rules, funding/visa facts, deadline kind/timezone, official stages, source refs, uncertainty | Public-source snapshot server-side; selected copy in browser for return/history. |
| Selection | Saved/hidden/selected IDs, snapshot versions | Browser; stable across result filters and deduplicated search runs. |
| Question pack | Skill/question/rubric/source IDs, versions, generated-or-reviewed marker | Trusted server record; prompts to browser. No client-authored rubrics. |
| Progress | Schema version, academic details, timetable, answers/assessment, completion IDs, selected snapshots | Browser; resettable. Server scoring payload is transient. |
| Schedule | Task dependencies/reuse keys, allocations, program tags, due kind, capacity use, risk reasons | Derived in code; recompute from validated inputs rather than trust a saved calendar. |
| Quota | UTC day/window, reserved/consumed call counts | Private operational store; fail-closed handling, single instance only. |

Expire source/run caches and cancelled runs safely. Browser snapshots can show old evidence but must say so. If trusted server evidence/question records are gone on return, revalidate/rebuild them before another paid assessment; do not accept browser edits as authority.

## File Structure

Planned app-relative boundaries; the fresh artifact setup supplies the actual enclosing directory:

```text
web-app/
├── package.json / package-lock.json / tsconfig.json / vite.config.ts
├── index.html
├── client/src/
│   ├── main.tsx / App.tsx
│   ├── pages/
│   │   ├── TasteTest.tsx / DirectionResult.tsx
│   │   ├── SearchPreferences.tsx / DiscoveryResults.tsx
│   │   ├── EligibilityDetails.tsx / ReadinessInterview.tsx
│   │   └── Timetable.tsx / RoadmapOverview.tsx / TrackTimeline.tsx
│   ├── components/
│   │   ├── FilterPanel.tsx / ListingCard.tsx / SearchProgress.tsx
│   │   ├── SourceDisclosure.tsx / TaskCard.tsx / WeekBlock.tsx
│   │   └── StatusMessage.tsx
│   ├── lib/storage.ts / api.ts
│   └── styles/tokens.css / app.css
├── server/
│   ├── index.ts / routes.ts / health.ts
│   ├── providers/tinyfish.ts / openai.ts
│   ├── discovery/
│   │   ├── plan.ts / run.ts / sources.ts / extract.ts
│   │   └── rank.ts / deduplicate.ts / revalidate.ts
│   ├── readiness/questions.ts / assess.ts
│   └── lib/store.ts / quota.ts / safety.ts / logger.ts
├── shared/
│   ├── schemas.ts / types.ts / direction.ts / eligibility.ts
│   └── tasks.ts / scheduler.ts / dates.ts
├── data/genre-questions.json / question-bank.json / task-templates.json
├── scripts/validate-data.ts
├── tests/                           # provider mocks, rules and journey tests
├── README.md / LICENSE / THIRD_PARTY_NOTICES.md
└── .env.example                     # names/placeholders, never credentials

devpost/                             # canonical scope/PRD/spec + HTML companions
generated-artifacts/                 # ignored raw research and test outputs
private-runtime/                     # ignored operational stores, never served
```

All application files are new. Do not import old Scout packages, database definitions, component files or wrappers. Feature inspection and current provider docs are references for requirements, not copied implementation.

## API and External Service Contracts

### Application API

- `POST /api/searches`: validated preferences and continuation → `{runId,status}`. Server creates its own bounded query plan.
- `GET /api/searches/:id`: owner checked → `{status,stage,coverage,listings,sourceStatus,usage,errors}`; short polling until complete/partial/failed.
- `POST /api/searches/:id/cancel`: owner checked → cancel pending work and any cancellable provider Agent runs; preserve completed results. A disconnected tab is not a reason to duplicate a run.
- `POST /api/targets/prepare`: selected server-known listing IDs/versions → source-backed eligibility/stages and trusted question-pack ID. Expired references require revalidation.
- `POST /api/assessment`: question-pack ID + bounded answers → `{assessedAt,results:[{questionId,skillId,status,reason,evidence}]}`.
- `GET /api/health`: configuration/app/store readiness, no secrets or provider spend.

Errors are `{error:{code,message,requestId}}`, using 400/429/502/503 appropriately and Retry-After where needed. No stack trace, raw upstream credential message or secret configuration to the browser.

### TinyFish — Verified Contracts

Docs checked **2026-10-13**; no authenticated call has been made yet. Use `X-API-Key` server-side.

| Function | Exact contract | App use |
| --- | --- | --- |
| Search | `GET https://api.search.tinyfish.ai` with encoded `query`, `purpose`, `language`, optional `include_domains`/`exclude_domains`, `page`. Response `results[]` contains title/snippet/URL/domain/rank, with query/page metadata. | Queries derived from student preferences; snippets are leads, not official evidence. |
| Fetch | `POST https://api.fetch.tinyfish.ai` with `{urls:[...],format:"markdown",links:true,ttl:0,per_url_timeout_ms:25000}`; max 10 URLs/request. Response `results[]` plus per-URL `errors[]`; results include original/final URLs and extracted text. | Read evidence and relevant official links; partial failure does not erase successful pages. |
| Agent | `POST https://agent.tinyfish.ai/v1/automation/run-async` with `{url,goal,output_schema,agent_config:{max_duration_seconds:60}}`; returns `run_id`. `GET /v1/runs/{id}` for state/results; `POST /v1/runs/{id}/cancel` to cancel. | Authorized, public read-only navigation/extraction fallback. No credentials/vault/profiles, no forms/applications. |

[Search reference](https://docs.tinyfish.ai/search-api/reference), [Fetch OpenAPI](https://docs.tinyfish.ai/api-reference/fetch-and-extract-content-from-urls), [Agent reference](https://docs.tinyfish.ai/agent-api/reference), [pricing](https://www.tinyfish.ai/pricing).

Current pricing page: Search free, **30 requests/min and 500/hour**; Fetch free, **150 URLs/min and 1,000/day**; Agent **$0.016/step**, 2 concurrent runs; Browser **$0.002/min**. Search's reference also discusses a 12,000/day allowance and wallet-dependent errors, contradicting the marketing claim that Search never draws the wallet. Do not promise unlimited/free operation beyond verified account limits. Handle 401/402/403/429 explicitly; use lower app caps and confirm the actual account at setup.

Agent strict mode and `max_steps` are beta-gated; omitting `max_steps` uses a documented default of 150. Do not send a gated field to a non-enabled account or claim our duration timeout is a hard dollar cap. Separate budget authorization is required before enabling paid fallback. No automatic wallet top-up.

Fetch's [current OpenAPI](https://docs.tinyfish.ai/api-reference/fetch-and-extract-content-from-urls) says `ttl:0` may still return an origin-cache-valid or operator-pinned cached entry. Preserve freshness metadata; never label it “verified live today” solely because the request used zero TTL.

### Managed OpenAI

Actual Replit-managed server configuration, not guessed credentials. Planned SDK call: chat completions with `model:"gpt-4.1-mini"`, fixed extraction/assessment instructions, untrusted content clearly separated, strict JSON schema, temperature 0, token/time limits and bounded retries.

Use separate schemas for extraction, generated question packs and assessment. Format compliance does not prove truth; verify evidence references and support for each field. No tools or delegated application actions.

[Replit documentation](https://docs.replit.com/features/integrations/replit-ai-integrations) says usage is billed through Replit credits at provider public API rates, subject to plan/admin availability. This is not free. The [model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini) lists $0.40 input / $1.60 output per million tokens. Illustratively, 4k input + 1.8k output is about $0.0045; discovery may involve several larger extraction calls, so do not present this as the cost of an entire search. Measure actual usage and enforce shared limits.

## Official Source Research and Test Cases

These are researched **examples/fixtures for verification**, not a locked discovery catalog. Official pages were checked 2026-10-13; the live pipeline must support other legitimate sources.

- [KAUST VSRP](https://admissions.kaust.edu.sa/study/internships): official “fully funded” wording, all-year-round applications and [public project pages](https://admissions.kaust.edu.sa/internship/search). Useful rolling/program and genre-question tests.
- [OIST](https://www.oist.jp/admissions/research-internship/apply-research-internship): Spring 2027 deadline Oct 15, 2026, 23:59 JST; application fee JPY 5,000 despite [funded placement benefits](https://www.oist.jp/admissions/research-internship/program-description). Official [faculty/project availability](https://www.oist.jp/admissions/research-internship/ri-faculty-project-availability) provides work examples and says not to seek faculty approval before applying.
- [EPFL E3](https://eee.epfl.ch/): current application date Nov 1, 2026 and [living/travel support](https://eee.epfl.ch/program-at-a-glance/). Verify the actual cutoff/timezone and complete detailed eligibility before a hard-date plan.
- [HENNGE](https://recruit.hennge.com/en/gip): coding challenge + CV/cover letter, HR and online interviews; applications close when slots fill. Rolling/capacity-limited, not a fabricated universal cutoff.
- [Mitacs](https://www.mitacs.ca/our-programs/globalink-research-internship-students/): Summer 2027 applications closed; Indian criteria include institutional eligibility and country-specific grades. Test closed-cycle behavior and conditional profile questions.
- [DAAD WISE official entry](https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database?daad&detail=50015295&origin=4&page=1&q&status=1&subjectGrps): “not available right now,” not evidence of permanent discontinuation.
- [Charpak Summer Training](https://www.inde.campusfrance.org/france-excellence-charpak-summer-training-scholarship): excludes medical/travel expenses and insurance; not a fully funded target just because earlier brainstorming named it.

Represent funding components and limits, not a blanket promise of zero student expenses. Include fees and uncovered costs prominently. Use short excerpts and paraphrases; do not bulk-copy catalogs or use unofficial mirrors as official sources.

## Important Failure Modes

- **Search/Fetch/provider unavailable or exhausted:** truthful failed/partial state, retained successful results and retry/changed-preferences controls. No unlabelled seed-catalog fallback.
- **Missing/stale/contradictory official facts:** show unconfirmed criteria/dates/stages. No inferred future deadline or automatic “Eligible” badge from incomplete evidence.
- **Readiness unavailable/malformed:** keep answers, show retry; unrelated screens work. A labelled self-check fallback at Oct 17 still requires the learner's decision.
- **Impossible workload:** explicit unscheduled/at-risk work. No double-spent hours, exam overload or hidden expired target.
- **Browser/server storage unavailable:** visible persistence warning; expire stale server references and revalidate rather than trust browser-written facts.

## Verification and Build Order

1. Fresh artifact/skeleton, provider configuration, safety limits; one real TinyFish search/fetch and one managed-AI structured-output smoke test.
2. Genre taste test → Scout-like preferences → live discovery, progress, filters, save/hide and explicit selection, including an opportunity not in our researched examples.
3. Selected-source preparation, criteria/unknown states, readiness questions/assessment and manual timetable; local restore/reset.
4. Shared task construction, one cross-track capacity ledger, overview/timeline, completion/reopen, expired/rolling/conditional stages and at-risk work.
5. End-to-end verification, public-demo hardening, truthful recording and approved documents.

Tests: query coverage and each filter; canonical dedup across cycles; official-vs-aggregator evidence; absent/misattributed quotes; malformed/excessive model output; malicious page instructions; URL/redirect restrictions; source/account limits; partial searches and cancellation; selection preserved under filters; unknown grade equivalence/institute/date constraints; restored state and lost server snapshots.

Scheduler tests use a fake clock: shared versus incompatible work, dependencies, exams, partial weeks, exact timezone/boundary, earliest deadline, no cross-track double spending, rolling target labels, expired tags, mid-week cutoff and unscheduled overflow. Readiness uses reviewed good/partial/empty answers and invalid-output mocks.

Run type/data checks, tests and build, then a **real** live search → selection → assessment → both roadmap levels. Verify phone (~390px), tablet (~768px), desktop (~1280px), keyboard, field errors, readable contrast and reduced motion. Screenshots cannot prove clicks; exercise interactive behavior separately.

Schedule: Oct 17 checkpoint for the readiness fallback/photo-timetable stretch; early share Oct 21–22; final target Oct 25; hard deadline Oct 27, 02:30 IST. Do not cut discovery to static examples as a shortcut.

## What Was Simplified and Why

- One web/server app, not Scout plus a second integrated application.
- No account/database service; same-browser personal progress and bounded single-instance operational storage.
- Reusable genre questions and skill-question reuse, not a bespoke taste test for every listing.
- Bounded live discovery with visible coverage, not a claim to search every internship in the world.
- Code owns fit scoring, eligibility checks, deadlines and capacity; AI provides grounded extraction/readiness evidence, not an unchecked calendar.
- Already cut: application/SOP automation, professor finder, visa odds, notifications, review-site scraping. No change to these or to the agreed visual/roadmap behavior.
- Proposed deferral only: unattended scheduled Scout hunts/showcase/admin surfaces. This does not remove live discovery, filters, evidence, ranking or student choice.

## Decisions and Open Issues

- **Explicit learner decisions:** TypeScript stack; TinyFish as in Scout; rebuild relevant Scout functionality fresh because existing code/integration is excluded by the agreed competition boundary; taste test first, Scout-like questions second, existing planning product afterwards.
- **Preserved:** official-only evidence, grouped Research/Company timelines, shared steps before earliest served deadline, capacity-aware exam scheduling, manual timetable, paper planner/bold accents.
- **Proposed technical details for review:** Express/Vite/Zod, private single-instance source/run/quota stores, explainable scoring weights, initial limits and deferred unattended hunts. Spec approval accepts these implementation choices, not a public launch.
- **Genuine learner uncertainty:** “basic securities” including rate limiting. Concrete mapping: repeated provider calls → quotas/rate limits; malformed input → validation; malicious answer/page instructions → isolated no-tools prompts plus schema/evidence checks. Explain at their build moments.
- **Early build gates:** TinyFish Secrets setup + actual account limits; managed-AI activation/smoke test; provider freshness metadata; supported source/ATS interpretation; dependency/version/license audit. Paid Agent fallback additionally needs authorized spending and a verified bound/cancellation strategy. No claimed test success before these run.
- **Not reopenable as an agent shortcut:** fixed catalog instead of discovery, omitting target selection, generating a card per internship, or replacing the downstream roadmap product.
- **Can wait:** project name (learner's choice), optional publishing, photo timetable parsing and production-scale persistence. These do not block this proof of concept.
- **Prior work disclosure:** Scout was built for a separate entry. No reused code; feature inspiration and fresh implementation must be disclosed. This document does not draft the learner's submission text.
