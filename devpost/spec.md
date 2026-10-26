---
doc: spec
status: approved
---

# Untitled — Technical Spec

Approved by the learner with a requested final ambiguity check, completed below. **Replicate Scout's relevant discovery functionality with TinyFish, implemented fresh**, then connect the student's choices to the agreed readiness and roadmap product. This replaces the rejected fixed-catalog proposal. It is planning, not application code.

## How This Works, In Plain Language

First, the student answers real, source-grounded questions about common internship work genres. Similar internships share genres, so this is one reusable taste test—not a test for every internship.

The next screen asks Scout-like questions about topics, locations, Research/Company interests, funding, visa needs and other preferences. A small TypeScript server uses TinyFish to search the web and read relevant official pages. It extracts evidence, labels unknown information honestly, and returns ranked results with filters and save/hide controls. The student chooses their targets; neither the taste test nor a hardcoded list chooses for them.

For those targets, the server prepares sourced criteria; the browser checks the student's local details against supported rules. The learner's own Groq assesses a consented short readiness interview. Ordinary code groups compatible preparation, counts shared work once, and fits it into the student's free hours around exams. Shared steps serve the earliest deadline in their group. Closed or impossible-to-fit targets remain explicitly visible as closed or at risk.

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
| AI | Groq with the learner's own server-side API key, explicitly requested during build. Proposed Groq-hosted `openai/gpt-oss-120b` with strict structured outputs; verify access by a real call. No Replit-managed OpenAI inference. | [Groq compatibility](https://console.groq.com/docs/openai), [structured outputs](https://console.groq.com/docs/structured-outputs), [limits](https://console.groq.com/docs/rate-limits) |
| Validation/tests | Zod at external-data boundaries; Vitest for rules, contracts and fixed-clock tests. Browser tests for the journey. | [Zod](https://zod.dev/), [Vitest](https://vitest.dev/guide/) |
| Storage | Browser localStorage for personal progress; bounded, private server files for public-source snapshots, run ownership and quotas. No database/auth service for the single-instance POC. | [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |

Pin compatible versions and the lockfile at the first build step after maintenance, vulnerability and license checks. No app dependencies are installed yet. TinyFish can use native server `fetch`; an SDK is optional after vetting, not copied from Scout.

### Component Licensing

Verify the installed versions and transitive licenses of every dependency before committing. Preserve third-party notices.

[React Bits' current license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) is **MIT with a Commons Clause condition, not plain MIT**. It permits use as part of an application but restricts selling, sublicensing or redistributing the components themselves, including bundles/ports. Any included component retains its notice and appears in THIRD_PARTY_NOTICES.md, separately from our app license.

Use ready-made interactions where helpful, but React Bits is not mandatory. Choose accessible, reduced-motion-friendly components after individual license review; use a permissively licensed equivalent if its restrictions do not fit. Do not redistribute a component library or claim blanket legal clearance.

## Where It Runs and How Someone Tries It

The fresh web artifact is `artifacts/internship-planner`, with one managed Express/Vite workflow and one server on `0.0.0.0:22950` (the managed artifact port). The structure below describes files inside it.

Implemented build commands:

- Initial setup installs vetted packages and creates the lockfile; thereafter `pnpm install --frozen-lockfile`.
- `pnpm --filter @workspace/internship-planner dev` — Express with Vite middleware; open `/` in Replit Preview.
- `pnpm check`, `pnpm test`, `pnpm validate:data` — types, tests and curated-question/source validation.
- `pnpm build` followed by `pnpm --filter @workspace/internship-planner start` — built client + same-origin API. Production service configuration is still part of final hardening; this does not authorize deployment.

App requests use relative `/api/...` paths. Vite must accept Replit's proxied development host. No hardcoded localhost in app code.

TinyFish needs server-side `TINYFISH_API_KEY`. No matching TinyFish connector was returned by the integration lookup; **do not substitute Parallel/Tavily or claim TinyFish is already connected**. Request the key through the workspace Secrets flow during setup, never chat, source files or the browser. Do not read or copy Scout's credentials.

Groq configuration is also an early build gate. The learner explicitly replaced managed OpenAI with their own Groq API during build. Request `GROQ_API_KEY` through Secrets; use the documented `https://api.groq.com/openai/v1` endpoint and verify structured outputs and account limits. Without configuration, show explicit unavailability; do not replace live discovery with unlabelled fixtures.

Required submission: short demo video + public GitHub repository containing approved planning docs. Publishing is optional, not a substitute for either. A clone needs documented provider setup; it will not magically inherit this workspace's integrations or secrets. Publishing is not authorized by this spec.

Public source repository: [Build With AI: Basics Hackathon — Internship Planner](https://github.com/Sarvesh5273/Build-With-AI-Basics-Hackathon---Internship-Planner). Source-code publication is separate from runtime deployment and hosted demo-video access.

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

“Search more” uses a server-issued continuation bound to the validated preferences and prior query/page coverage: advance provider pages (within its documented range), then unqueried topic/location combinations or unprocessed leads. Retain and deduplicate earlier results. Do not restart page zero and call identical results “more.” Each continuation consumes a disclosed bounded-run quota.

Funding preference defaults to the fully funded focus; the student may explicitly broaden it. Display source-backed funding components, exclusions, caps and fees. A provider/employer calling a placement “fully funded” does not establish zero costs; show that wording and the actual benefits separately. Unknown coverage never becomes a confirmed funding match.

Scheduled unattended hunts, showcase dashboards and advanced Scout administration are deferred from the approved POC. Core search/filter/evidence functionality is not deferred.

#### Scout reference and discovery-parity correction

The learner supplied [Scout's public repository](https://github.com/Sarvesh5273/Scout) on 2026-10-14 and reiterated that discovery should retain Scout's advanced behavior, with taste-derived editable preferences added. Reference inspection confirmed query intents for requested employers, ATS postings, open-web careers and research programmes; classification of postings versus boards/index pages; public ATS-feed reading; relevance-ranked linked-posting expansion; AI interpretation between collection waves; deduplication; and optional Agent fallback. These are behavioral references, not code to incorporate. Correct the initial simple search/read loop with fresh differentiated query planning, bounded batch reads, public-feed expansion, linked-page waves and compatible public-text extraction caching.

Scout's reference AI helper uses Replit-managed OpenAI; this product retains the learner's own Groq API. After this distinction was explained, the learner explicitly approved Groq for the equivalent source-extraction step during discovery. Taste responses inform editable preferences, not ability judgments or automatic target selection; they do not become inference inputs.

Documented public job-board adapters cover Greenhouse, Lever, Ashby and Workday (career-site search). A board found through search is read directly as structured public data and its most relevant internship postings become listings without an AI call; facts are verbatim posting lines and pass the same quote validation (deviation recorded 2026-10-25: large boards exceed the page reader's response limit and Workday search needs a POST). SmartRecruiters and Workable surfaces use safe Fetch and linked-page exploration where readable. Do not imply identical coverage on every ATS. Missing feeds, login walls and unreadable JavaScript portals remain explicit gaps. Additional specialized adapters and paid browser fallback are not fabricated when a surface cannot be read.

Scout implements paid Agent fallback, but its source alone does not establish which live runs used it. Its duration-based budget estimate is not a verified hard spend limit. Keep fallback disabled unless separately authorized with verified limits. Scout's higher per-run work caps and 270-second hard cutoff also do not authorize changing this product's disclosed limits.

### Discovery Runner, Source Reading and Evidence Extraction

Implements `prd.md > Search Preferences, Discovery and Selection`, `prd.md > Official Sources`.

1. Plan and deduplicate queries; reserve the run's provider budget before dispatch.
2. Classify results into official pages/ATS leads and other leads. Search snippets never count as evidence. A readable third-party page whose quotes validate becomes an **unverified other source** (source flag `official:false`), not a discarded lead; known announcement sites skip the ownership check so they spend no URL budget. Pages about the same organization + title (compatible cycle) are merged into one listing: an official page becomes primary/canonical, first occurrence of a duplicate quote wins, and every fact keeps its own source ID.
3. Validate public HTTPS URLs and redirects; reject local/private/metadata addresses, credentials in URLs and untrusted protocols. Corroborate an institution/employer's ownership or an official link to its ATS board. A plausible domain name alone is insufficient. New official sources can enter; source safety is not a fixed program list.
4. Fetch relevant pages in bounded batches through TinyFish Fetch; read documented public job-board data directly (fixed platform hosts, size/time caps). Posting text from the board is the evidence; board metadata alone never creates a fact. Follow relevant career/programme/posting/application/eligibility links within the same URL budget. Give the model only supplied link indices, never permission to invent URLs. Login walls stay inaccessible; do not attach credentials, vaults or profiles or bypass access restrictions.
5. Extract a typed listing: organization, opportunity/track, dates/cycle, funding components/fees/caps, visa statement, eligibility rules, skills and official selection stages. Every factual field is nullable and references an exact quote/source. Reject unsupported claims, invalid enums/IDs, quotations absent from text and cross-program quote attribution.
6. Deduplicate by canonical official posting + organization + cycle, and merge same organization + title pages within a run as above; retain source history. Do not collapse distinct roles/projects simply because they share an institution.
7. Compute match/filter values and return results even when some sources failed. “Official page read” is provenance, **not a guarantee that automated interpretation is correct**. Show interpretations as evidence-backed preliminary checks with the original excerpts.

AI supplies extracted facts/labelled judgments, not an opaque final fit score. Code computes an explainable 0–100 preference score using role/topic (35), location/remote (20), funding preference (20), visa constraint (15) and include keywords (10). Unknown is not a positive match and is visibly reflected in reasons; hard exclusions/confirmed incompatibilities cannot rank as a strong fit. Weights are app guidance, not admission odds.

Normalize weights over preferences actually supplied; an unused keyword/location preference is not a failed match. Keep unknown values for active constraints in the denominator so missing evidence cannot inflate fit. Preferred organizations influence query priority and tie-breaks; they are not automatically a hard exclusion of other organizations.

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

Keep selected confirmed-ineligible targets visible with sourced reasons, but exclude their application tasks from active scheduling. Needs-confirmation targets can have clearly labelled tentative/general preparation; unresolved mandatory conditions must not become a confirmed application-ready state.

### Readiness Questions and AI Assessment

Implements `prd.md > Readiness Interview`.

Selected targets' sourced skills map to a reviewed skill/question bank. Reuse relevant questions across similar internships. For skills outside that bank, generate a small question/rubric pack grounded in the extracted skill descriptions; label it app-generated preparation, never an employer's official interview questions. Validate source/skill IDs and topic coverage. If a skill cannot be assessed responsibly, show **Not assessed**, not a fabricated verdict.

The 6–8-question pack has an explicit coverage map across selected targets. Assess shared skills once; show uncovered skills per target and an optional further assessment/general-preparation action. Adding a different target may request another bounded pack; it never makes untested requirements “ready.” Reuse prior answers/results only when the skill/rubric versions remain compatible.

6–8 questions per short interview; one at a time. A question pack has fixed rubric items before answers are submitted. One AI assessment request per completed interview, not per keystroke. Server retrieves the trusted question/rubric and evidence records; the client cannot supply new system instructions or official facts.

Strict response: question/rubric IDs, `met | partial | missing`, brief reason and an excerpt from the student's answer. Validate coverage and excerpt membership, not just JSON shape. Code maps rubrics to ready/partly/not yet. A short response is evidence of readiness for those questions, not certification of mastery or probability of selection.

Documents/external actions are checklists, not AI-certified skills. The interview cannot confirm that a professor submitted a letter. Failures preserve answers and show an honest retry/unavailable state.

### Manual Timetable and Browser Progress

Implements `prd.md > Timetable Entry`, `prd.md > States and Boundaries`.

Versioned localStorage stores personal details, reactions, preferences, targets/evidence snapshots, timetable, answers, assessment and completion IDs. Validate restored state and handle schema/source/rubric changes. Reset requires confirmation; blocked/full/corrupt storage gets a visible warning. Same browser and origin only; no cross-device promise.

Restore the last in-progress screen when the flow is incomplete; return to the roadmap overview only after a roadmap exists. Interrupted runs are reconciled with the server, not blindly restarted. Preserved browser answers/history remain usable even if a server cache has expired; revalidate evidence/trusted rubric records before a new assessment.

One weekly free-hour budget across **both tracks**, not duplicated per track. Conservative initial implementation gives exam weeks zero preparation capacity; prorate the remaining portion of the current week. Marking done removes remaining effort; reopening restores it. Hours and waiting times are estimates.

### Shared Preparation and Deadline Scheduler

Implements `prd.md > Track Timeline`, `prd.md > Deadline Handling`.

The agreed behavior remains:

1. Map typed, evidenced requirements to reusable preparation templates, then build dependencies backwards from confirmed official stages. Documents use checklists; skill gaps use practice/evidence tasks; external actions use confirmation/waiting dependencies. The finite templates are task patterns, not a program catalog. Template effort ranges are app estimates, not official facts.
2. Merge only compatible reusable work—CV core, shared skill practice, reusable evidence—not distinct essays/submissions with different formats.
3. Tag each shared task with all programs it serves and assign the **earliest deadline it serves**.
4. Allocate dependency-ready work, earliest due first, into one future cross-track capacity ledger. Split effort into weekly chunks when needed; finishing in a deadline's week is insufficient if the chunk falls after its actual cutoff.
5. Never overflow silently. Leave impossible work visibly unscheduled/at risk, with hours/dependency reasons and affected targets. Waiting for an external letter is a real dependency, not compressible study hours.
6. Passed official deadlines remove that cycle from active application allocations but preserve completed history. Recompute the earliest deadline after removing a tag. A missed personal target instead remains overdue/needs rescheduling; do not falsely close a rolling program.

Known deadlines: UTC instant + original timezone and official quote. Date-only cutoff: disclose unknown time and schedule before that day conservatively. Rolling/capacity-limited programs: editable **personal application target**, explicitly not an official deadline. Unknown future cycles: no invented reopening month.

Actual later interviews/stages appear at published dates or as conditional “After application—date not published.” Prep can precede application; do not fabricate a date for the actual interview.

Do not invent mandatory tasks for an unsupported requirement type: retain the quote as “Needs review” and offer a clearly labelled source-review/confirmation action. Preparation instructions and estimates are app guidance tied to a sourced need, not claimed official wording. A professor's acceptance is a milestone only if that program requires it.

Weekly hours are an availability estimate, not exact daily slots. Prorate both the remaining current week and any pre-cutoff portion of a deadline week, using one ledger; no credit for hours after the cutoff. Show these assumptions, conservative effort estimates and an editable personal buffer/target before the official deadline. This improves planning safety but cannot guarantee the student completes work or applies on time.

Re-check deadlines on roadmap load, tab return and day change. This cannot warn while the app is closed; background reminders remain cut. Re-checking elapsed time is distinct from verifying the source is still current.

### Overview and Track Timeline

Implements `prd.md > Roadmap Overview`, `prd.md > Track Timeline`.

Retain the two levels: overview with this week's one actionable step across all targets; Research/Company cards; clicking opens the week-by-week track timeline. Show source disclosures for every program tag, hours, exams, deadlines/targets, conditional stages, risk and completion.

Choose the next dependency-ready unfinished action by nearest relevant due date. If no action is possible this week, show the honest empty/confirmation state rather than invent a step. No eligible targets → sourced reasons; all closed → general skill preparation and only evidenced future-call information.

### Server Safety, Cost Limits and Operations

Implements `prd.md > Official Sources`, `prd.md > States and Boundaries`.

- Same-origin JSON endpoints; reject unexpected origins, no wildcard CORS. Server-issued signed anonymous HttpOnly cookie + owner checks for run IDs. Use Secure/SameSite=None/Partitioned in the HTTPS embedded preview; verify the browser retained it before metered search work. This marker is not an account login or a JavaScript token. A browser that cannot retain it gets an explicit new-tab recovery message, not a paid search followed by an inaccessible run.
- Treat blocked browser storage separately from session-cookie availability. If progress storage is denied, warn that answers cannot survive reload/close or transfer automatically; offer opening the app separately. Lost run references must not wipe preferences, saved listings or targets, and must never automatically start another metered search.
- Validate all requests/provider outputs; 32KB ordinary body limit, 8 readiness answers max, 1,500 chars each; bound query fields, URLs, page text, extracted-listing count and model output.
- Trust only the configured proxy topology for IP limits; never arbitrary forwarded headers. Token/IP limits are abuse controls, not a durable identity.
- POC limits (removed in final review for private demo use at the learner's request; only runaway-loop stops remain): 1,000 runs per browser/hour; 2 concurrent searches globally, 2 model calls globally. Reserve quotas atomically to avoid parallel overspend.
- Persistent server operational counters: daily maximum 950 fetched URLs and, per Groq model, 950 calls / 195,000 tokens (just under the free tiers); discovery uses gpt-oss-120b then gpt-oss-20b, two pages concurrently. Per run: 20 searches, 80 URLs, 50 results, 5 minutes. Topic relevance also reads title and identity quote; off-topic results hidden by default. If quota storage fails, paid calls fail closed rather than reset silently. TinyFish rate limiting is independent of our budget.
- Fetch batches contain at most 4 candidate URLs; the initial AI pass interprets one bounded public page at a time with a 1,800-token completion allowance. Size source text with server-only ordinary-text o200k BPE plus a conservative 512-token framing/schema margin; GPT-OSS's harmony encoding shares those ordinary-text ranks. Enforce a 7,000-token rolling window below the observed 8,000 TPM allowance, and settle successful reservations from actual reported usage; absent usage retains the full reservation. Bound private public-text interpretation cache by content/extractor version, 120 entries and seven days, and revalidate quotes on reuse. No student answers enter that cache.
- Discovery extracts one opportunity and up to six preliminary quoted facts per page. Bind the already-known single-page source identifier in code; do not ask the model to regenerate it. Keep eligibility quotations without machine eligibility rules in this pass. Prepare supported rules and fuller requirements after explicit target selection; omitted criteria are not evidence of eligibility.
- Search/model request timeout 30s; Fetch request timeout 45s to accommodate bounded batches, with 25s per-URL reading limits; whole-search deadline remains 180s including shared-quota waiting. Show Groq waiting and an approximate overall countdown. Distinguish provider connectivity/request failures from the overall cutoff, and label usage as query/URL attempts rather than successful reads. No automatic retry storms or wallet top-ups. Global Search/Fetch windows are separately bounded below documented provider rates.
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

`targets/prepare` is also a metered service, not a rate-limit bypass: validate ownership/selection versions, cap each processing batch and run duration, reserve shared Fetch/model quotas, and reuse trusted evidence/packs where compatible. Preparation and generation calls have their own token/IP request limits. Apply the same cost controls to continuation, retries and additional question packs.

### TinyFish — Verified Contracts

Docs checked **2026-10-13**, and Search/Fetch/Agent reference behavior rechecked **2026-10-14**. Authenticated bounded Search and Fetch smoke tests returned HTTP 200, including a fresh independent check during timeout investigation. This establishes that those endpoints worked for the tested request, not that every page or user run succeeds. Use `X-API-Key` server-side.

| Function | Exact contract | App use |
| --- | --- | --- |
| Search | `GET https://api.search.tinyfish.ai` with encoded `query`, `purpose`, `language`, optional `include_domains`/`exclude_domains`, `page`. Response `results[]` contains title/snippet/URL/domain/rank, with query/page metadata. | Queries derived from student preferences; snippets are leads, not official evidence. |
| Fetch | `POST https://api.fetch.tinyfish.ai` with `{urls:[...],format:"markdown",links:true,ttl:0,per_url_timeout_ms:25000}`; max 10 URLs/request. Response `results[]` plus per-URL `errors[]`; results include original/final URLs and extracted text. | Read evidence and relevant official links; partial failure does not erase successful pages. |
| Agent | `POST https://agent.tinyfish.ai/v1/automation/run-async` with `{url,goal,output_schema,agent_config:{max_duration_seconds:60}}`; returns `run_id`. `GET /v1/runs/{id}` for state/results; `POST /v1/runs/{id}/cancel` to cancel. | Authorized, public read-only navigation/extraction fallback. No credentials/vault/profiles, no forms/applications. |

[Search reference](https://docs.tinyfish.ai/search-api/reference), [Fetch OpenAPI](https://docs.tinyfish.ai/api-reference/fetch-and-extract-content-from-urls), [Agent reference](https://docs.tinyfish.ai/agent-api/reference), [pricing](https://www.tinyfish.ai/pricing).

Current pricing page: Search free, **30 requests/min and 500/hour**; Fetch free, **150 URLs/min and 1,000/day**; Agent **$0.016/step**, 2 concurrent runs; Browser **$0.002/min**. Search's reference also discusses a 12,000/day allowance and wallet-dependent errors, contradicting the marketing claim that Search never draws the wallet. Do not promise unlimited/free operation beyond verified account limits. Handle 401/402/403/429 explicitly; use lower app caps and confirm the actual account at setup.

Agent strict mode and `max_steps` are beta-gated; omitting `max_steps` uses a documented default of 150. Do not send a gated field to a non-enabled account or claim our duration timeout is a hard dollar cap. Separate budget authorization is required before enabling paid fallback. No automatic wallet top-up.

Fetch's [current OpenAPI](https://docs.tinyfish.ai/api-reference/fetch-and-extract-content-from-urls) says `ttl:0` may still return an origin-cache-valid or operator-pinned cached entry. Preserve freshness metadata; never label it “verified live today” solely because the request used zero TTL.

### Groq — Learner-Owned API Access

Server-side native fetch to `https://api.groq.com/openai/v1/chat/completions`, with `GROQ_API_KEY` from Secrets. Groq's docs checked 2026-10-14 list `openai/gpt-oss-120b` and `openai/gpt-oss-20b` as supporting strict structured outputs. Use the 120B model initially, with fixed extraction/assessment instructions, untrusted content clearly separated, strict JSON schema, low temperature, token/time limits and no automatic retry storms. These are Groq-hosted open-weight models, not calls through Replit-managed OpenAI.

Use separate schemas for extraction, generated question packs and assessment. Format compliance does not prove truth; verify evidence references and support for each field. No tools or delegated application actions.

Usage is governed by the learner's Groq account, not Replit AI Integration credits. Do not promise free or unlimited inference. Groq documents organization-level request/token limits, account-specific exceptions and response limit headers. Verify available limits from real responses; size extraction batches below token limits and enforce shared application caps. Strict JSON shape does not guarantee factual correctness: exact source quotes, target attribution and assessment excerpts must still be validated in code.

Observed native caveat: strict-output requests also returned HTTP 400 with complete JSON containing an unsupported eligibility-field enum. Do not equate a documented strict-mode guarantee with a successful shape check. Keep local validation and bounded structural diagnostics; never log raw failed generation. Serialized-schema regression tests guard the discovery/selected-target boundary.

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

1. Fresh artifact/skeleton, provider configuration, safety limits; one real TinyFish search/fetch and one Groq structured-output smoke test.
2. Genre taste test → Scout-like preferences → live discovery, progress, filters, save/hide and explicit selection, including an opportunity not in our researched examples.
3. Selected-source preparation, criteria/unknown states, readiness questions/assessment and manual timetable; local restore/reset.
4. Shared task construction, one cross-track capacity ledger, overview/timeline, completion/reopen, expired/rolling/conditional stages and at-risk work.
5. End-to-end verification, public-demo hardening, truthful recording and approved documents.

Tests: query coverage and each filter; canonical dedup across cycles; official-vs-aggregator evidence; absent/misattributed quotes; malformed/excessive model output; malicious page instructions; URL/redirect restrictions; source/account limits; partial searches and cancellation; selection preserved under filters; unknown grade equivalence/institute/date constraints; restored state and lost server snapshots.

Scheduler tests use a fake clock: shared versus incompatible work, requirement-to-template mapping, unsupported requirement review, dependencies, exams, partial weeks, exact timezone/boundary, earliest deadline, no cross-track double spending, missed personal targets versus official expiry, expired tags, mid-week cutoff and unscheduled overflow. Readiness tests coverage gaps, compatible reuse, reviewed good/partial/empty answers and invalid-output mocks. Discovery tests continuation progression, no duplicate “more” results, funding exclusions and metered target preparation.

Run type/data checks, tests and build, then a **real** live search → selection → assessment → both roadmap levels. Verify phone (~390px), tablet (~768px), desktop (~1280px), keyboard, field errors, readable contrast and reduced motion. Screenshots cannot prove clicks; exercise interactive behavior separately.

Schedule: Oct 17 checkpoint for the readiness fallback/photo-timetable stretch; early share Oct 21–22; final target Oct 25; hard deadline Oct 27, 02:30 IST. Do not cut discovery to static examples as a shortcut.

## What Was Simplified and Why

- One web/server app, not Scout plus a second integrated application.
- No account/database service; same-browser personal progress and bounded single-instance operational storage.
- Reusable genre questions and skill-question reuse, not a bespoke taste test for every listing.
- Bounded live discovery with visible coverage, not a claim to search every internship in the world.
- Code owns fit scoring, eligibility checks, deadlines and capacity; AI provides grounded extraction/readiness evidence, not an unchecked calendar.
- Already cut: application/SOP automation, professor finder, visa odds, notifications, review-site scraping. No change to these or to the agreed visual/roadmap behavior.
- Approved POC deferral: unattended scheduled Scout hunts/showcase/admin surfaces. This does not remove live discovery, filters, evidence, ranking or student choice.

## Decisions and Open Issues

- **Explicit learner decisions:** TypeScript stack; TinyFish as in Scout; rebuild relevant Scout functionality fresh because existing code/integration is excluded by the agreed competition boundary; taste test first, Scout-like questions second, existing planning product afterwards.
- **Preserved:** official-only evidence, grouped Research/Company timelines, shared steps before earliest served deadline, capacity-aware exam scheduling, manual timetable, paper planner/bold accents.
- **Accepted technical blueprint:** Express/Vite/Zod, private single-instance source/run/quota stores, explainable scoring, initial limits and deferred unattended hunts. Limits/weights are documented initial tuning parameters, not guarantees of search completeness. Approval is not authorization for paid fallback or a public launch.
- **Genuine learner uncertainty:** “basic securities” including rate limiting. Concrete mapping: repeated provider calls → quotas/rate limits; malformed input → validation; malicious answer/page instructions → isolated no-tools prompts plus schema/evidence checks. Explain at their build moments.
- **Early build gates:** TinyFish and Groq Secrets setup + actual account limits; Groq structured-output smoke test; provider freshness metadata; supported source/ATS interpretation; dependency/version/license audit. Paid Agent fallback additionally needs authorized spending and a verified bound/cancellation strategy. No claimed test success before these run.
- **Not reopenable as an agent shortcut:** fixed catalog instead of discovery, omitting target selection, generating a card per internship, or replacing the downstream roadmap product.
- **Can wait:** project name (learner's choice), optional publishing, photo timetable parsing and production-scale persistence. These do not block this proof of concept.
- **Prior work disclosure:** Scout was built for a separate entry. No reused code; feature inspiration and fresh implementation must be disclosed. This document does not draft the learner's submission text.

### Final Ambiguity Review

The learner said the draft was good and requested one last check. The audit found documentation inconsistencies and missing implementation policies, not a reason to redesign the product:

- Reconciled the PRD's “every requirement ready/partly/not yet” with honest short-interview coverage: uncovered skills are Not assessed; documents and external actions are checklists.
- Removed unsupported reopening months and “verified today” promises. Unknown dates stay unknown; a missed personal target is not an expired official cycle.
- Reconciled “exactly one action” with empty/exam/waiting weeks and zero exam-week capacity; return resumes an incomplete flow rather than a nonexistent roadmap.
- Defined evidence-to-task-template mapping and unsupported-requirement review, search continuation, active-preference score normalization and rate limits for selected-target preparation.
- Clarified funding labels, fees/exclusions and the fully funded default. No invented zero-cost guarantee.
- Provider/account configuration, cache metadata and paid Agent enforcement remain explicit build gates. They cannot be verified through document review alone.

No additional ceremonial sign-off is required. Application coding has not started and still requires its explicit start notice.
