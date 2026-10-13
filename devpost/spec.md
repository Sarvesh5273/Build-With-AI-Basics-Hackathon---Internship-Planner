---
doc: spec
status: draft
---

# Untitled — Technical Spec

**Requires revision before review or implementation.** The learner clarified that discovery must not be restricted to a fixed catalog: rebuild Scout-inspired, preference-driven discovery from scratch, let students filter and select internships, then assess readiness and generate roadmaps for those choices. The fixed-catalog architecture below is an unapproved proposal and no longer reflects that requirement. Retain its verified source findings and the accepted TypeScript stack; revise discovery, selection, source verification, cost controls, storage and the corresponding scope/PRD before approval. No application coding has begun.

**Flow clarification:** reusable real questions about shared internship work genres → Scout-like preference questions → discovery/filtering/student selection → the already-agreed readiness, manual timetable and grouped Research/Company roadmaps. Preserve the downstream decisions; revise the technical discovery mechanism, not the product's roadmap behavior. The scope and PRD now reflect this correction.

This is a blueprint, not application code. The learner accepted the recommended TypeScript stack; that approval does not approve the fixed-catalog proposal.

## How This Works, In Plain Language

The app has React screens and a small TypeScript server. A checked set of files holds program requirements, short official quotes, dates, and real examples of the work. The student reacts to examples, enters their details and exam weeks, and answers a short skills interview.

The server asks AI to assess those answers against a fixed rubric. AI does not decide eligibility, invent program requirements, or place deadlines. Ordinary code does those jobs: it checks the student's details, combines compatible preparation across programs, and fits the work into one shared budget of free hours.

Progress stays in the student's browser. Interview answers go to the AI service only when they submit them; there are no accounts, uploads, or application submissions. The app helps prepare an application, not guarantees selection.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. Checked example files → taste-test cards → reactions stored locally → a deterministic direction summary.
2. Student details and timetable → shared validation → local eligibility rules and weekly capacity.
3. Program files → Research/Company groups → eligibility reasons, evidence, current cycle status.
4. Direction and relevant skills → a reviewed question bank → 6–8 short questions shown one at a time.
5. Completed answers → one bounded server request → managed AI → validated assessment → saved locally.
6. Assessment + program stages + timetable → deterministic scheduler → overview and track timelines.
7. Step completion or timetable edit → recompute locally. On load, return to tab, and day change → re-check deadlines. No AI call just to reschedule.

## Stack

| Piece | Choice and rationale | Documentation |
| --- | --- | --- |
| Language | TypeScript throughout; accepted by the learner. One language rather than a React/Python split. | [TypeScript](https://www.typescriptlang.org/docs/) |
| Screens | React, built with Vite; ordinary CSS variables and focused components. | [React](https://react.dev/learn), [Vite](https://vite.dev/guide/) |
| Server | Node.js 24 + Express; one same-origin service rather than separate public frontend/backend deployments. Node 24 is already available here. | [Node](https://nodejs.org/docs/latest-v24.x/api/), [Express](https://expressjs.com/en/guide/routing.html) |
| Validation | Zod for catalog, user-input, and AI-output schemas. TypeScript alone cannot validate external data. | [Zod](https://zod.dev/) |
| AI | OpenAI through Replit AI Integrations; proposed model `gpt-4.1-mini`, with strict structured output. | [Replit managed AI](https://docs.replit.com/features/integrations/replit-ai-integrations), [model](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs) |
| Testing | Vitest for rules and API checks; browser tests for the full journey during build. | [Vitest](https://vitest.dev/guide/) |
| Storage | Versioned JSON catalog files + browser localStorage. No database or authentication service. | [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |

Pin compatible package versions and retain the lockfile during the first build step, after maintenance, dependency, vulnerability, and license checks. No application dependencies have been installed in this planning phase.

### Component Licensing

React, Vite, TypeScript, Express, Zod, Vitest, and the OpenAI SDK publish permissive licenses; verify the actual installed versions and their dependencies before committing.

React Bits is **not plain MIT**. The [current license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md), read during planning, permits use as part of an application but prohibits selling, sublicensing, or redistributing the components themselves, including bundles and ports. Keep the original notice on any included component and list it in THIRD_PARTY_NOTICES.md; do not describe that component as covered by our own app license.

React Bits is optional, not a core dependency. Use a ready-made component only if it improves this flow, works with keyboard/reduced motion, and passes its individual license review. Do not add an animation library solely for decoration or ship a component collection. If its restrictions are unsuitable, choose a permissively licensed equivalent. No blanket commercial/legal clearance is claimed.

## Where It Runs and How Someone Tries It

One web app in this Replit project. During build, create its web artifact and one managed workflow; this spec does not create either or start application coding.

Planned commands, **not yet available**:

- `npm ci` — install from the committed lockfile after initial setup.
- `npm run dev` — start Express on `0.0.0.0:5000` with Vite middleware; open `/` in Replit Preview.
- `npm run check` — TypeScript checks.
- `npm test` — automated tests.
- `npm run validate:data` — check catalog schemas, quotes, references, cycles, and dependencies.
- `npm run build` then `npm start` — production build and single-server startup.

In development Vite must accept the Replit proxied host. In app code use relative `/api/...` URLs, never hardcoded localhost. Production serves the built client and API from the same origin.

The demo requires a short video and public GitHub repository; publishing is optional and does not replace either. A real deployment is not authorized by this plan. Provider access must be available to run the live interview; a repository clone must clearly explain managed-AI setup rather than promise a keyless local clone will work.

### Coding Start

The learner explicitly requested notice before coding starts. After approval of this spec, end the planning task and prepare the build sequence. Say plainly that application coding is starting before creating scaffolding, installing app packages, or writing app files. Do not treat stack approval as permission to start early.

## Look and Feel

Implements `prd.md > Look and Feel`.

Paper-planner base, dark ink, white/off-white cards, strong flat highlight, thick outlines and modest hard shadows. Chunky headings; readable body text. Official excerpts look like source clips. Deadline/at-risk states use text as well as color. Exam weeks use a hatch plus an “Exam week” label.

Use CSS tokens for easy manual UI edits. Phone: one-column guided flow and vertically stacked weeks. Desktop: wider overview and week groups, without requiring horizontal scrolling to read tasks. Minimum 44px touch targets; visible keyboard focus; labelled fields; accessible source disclosure; loading/error announcements. Optional transitions respect reduced motion. Do not make essential controls dependent on animation or hover.

## Verified Data Sources and Publication Gate

Official pages were read on **2026-10-13**. These are findings, not a completed dataset. Each shipped entry still needs its own reviewed rules and evidence records. Start with a small catalog rather than require eight names before the app works.

| Program | Evidence from the official source | Use in the first catalog |
| --- | --- | --- |
| [KAUST VSRP](https://admissions.kaust.edu.sa/study/internships) | “VSRP internship is a fully funded program.” Benefits include stipend, housing, airfare; applications are “All year round.” Year, GPA, language, and documents matter. | Research, rolling. [Public project pages](https://admissions.kaust.edu.sa/internship/search) are usable taste-test sources. |
| [OIST](https://www.oist.jp/admissions/research-internship/program-description) | Air ticket, furnished accommodation, allowance. [Application page](https://www.oist.jp/admissions/research-internship/apply-research-internship) gives Spring 2027 deadline **Oct 15, 2026, 23:59 JST**, last-two-years eligibility, documents, and **JPY 5,000 application fee**. | Research, dated cycle. Show the fee despite funded placement. [Public faculty/project availability](https://www.oist.jp/admissions/research-internship/ri-faculty-project-availability) provides real examples and explicitly discourages contacting faculty for approval before applying. |
| [EPFL E3](https://eee.epfl.ch/) | Portal says open, deadline **Nov 1, 2026**. [Funding page](https://eee.epfl.ch/program-at-a-glance/) says allowance covers accommodation/living and travel costs are covered. | Research candidate with a verified current date. Before publication, finish the linked eligibility/application rules and verify deadline cutoff/time zone and any funding limitations; do not guess them. |
| [HENNGE GIP](https://recruit.hennge.com/en/gip) | Benefits include subsidy, airfare, insurance. Steps: registration → coding challenge + CV/cover letter → HR and online interviews. Applications close when slots fill. | Company, rolling/capacity-dependent, with clearly stated funding details. Real pathway descriptions can supply a few company examples; do not invent different employers to fill cards. |
| [Mitacs Globalink](https://www.mitacs.ca/our-programs/globalink-research-internship-students/) | “Summer 2027 student applications has now concluded.” Indian eligibility includes an eligible institution and country-specific grade rules. | Closed-cycle evidence, not an open target. Do not invent a next deadline or call partial airfare contributions an unconditional promise of zero expenses. |
| [DAAD WISE official entry](https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database?daad&detail=50015295&origin=4&page=1&q&status=1&subjectGrps) | “This programme is not available right now.” | Exclude from active scheduling unless an official current call is found. This alone does not establish permanent discontinuation. |
| [Charpak Summer Training](https://www.inde.campusfrance.org/france-excellence-charpak-summer-training-scholarship) | “NOT cover medical or travel expenses, travel insurance or accommodation assistance.” 2026 call closed. | Exclude from the fully funded active catalog. Earlier planning named it too broadly. |

Keep funding component-by-component: stipend, housing, travel, insurance, fees, caps, and unsupported costs. “Fully funded” must never mean every possible expense is zero.

### Evidence-Based Clarifications for Review

These refine the approved PRD and must be accepted in spec review before implementation; do not silently edit the approved PRD:

1. **Taste-test research sources are not MITACS-only.** Use accessible official KAUST and OIST examples, correctly labelled. The MITACS portal was reached, but public unauthenticated access to individual project descriptions was not verified. A third-party copied catalog is not sufficient evidence of official public accessibility.
2. **Four profile fields do not establish full eligibility.** Ask small conditional follow-ups when a rule requires institution, degree type, study dates/remaining semesters, English evidence, or age threshold. Prefer yes/no confirmations over collecting date of birth or identity documents. Missing or unconvertible evidence gets **Needs confirmation**, not Eligible.
3. **Not every program has a fixed deadline.** Rolling programs use an editable personal apply-by target, labelled “Your target—not an official deadline.” Unannounced future calls get no invented dates. A published date without cutoff time is visibly date-only/unconfirmed; schedule before that day conservatively.
4. **Post-application stages may occur later.** Application preparation must be before its deadline. Actual selection events appear at their published date or as “After application—date not published.” Never force an interview event to precede application merely to satisfy a timeline check.
5. **Assessment is bounded evidence, not certification.** “Ready” means the answer met this question's rubric, not independently verified mastery or selection probability. Unanswered skills are “Not assessed,” not magically ready.

After acceptance, align both PRD companions with these clarifications, keeping the previously approved product intent.

## Components

### Official Catalog and Source Collector

Implements `prd.md > Official Sources`, `prd.md > Eligibility Check`.

Reviewed `data/` JSON files are the app's only program-fact source. A fresh script reads a short allowlist of public official pages, with timeout/size limits and no login bypass. Raw pages and draft extractions stay in ignored generated-artifacts; reviewed short quotes and paraphrased facts can enter the catalog after validation.

Start with direct public-page fetches and manual review. No live per-user crawler, paid browser agent, or mandatory TinyFish dependency. An optional build-time extraction call may use the same managed AI, but its output is untrusted and cannot publish itself. Extracted quotes must match source text (whitespace-normalized); reject invented quotations and unresolved contradictions.

Each official fact references a source record: URL, short exact quote, checked-at timestamp, cycle, and relevant section. Each suggested skill/task separately records its preparation rationale and underlying official/project evidence. Estimated hours and recommended learning steps are app guidance, **not official requirements**.

### Taste Test and Direction

Implements `prd.md > Taste Test`.

10–12 reviewed descriptions drawn from accessible official examples, covering diverse fields within the available sources. Multiple examples may come from one program; disclose that the sample is small, not a comprehensive measure of interests.

Store `interested | notForMe | unclear` by card ID. Compute interest per field/track as interested cards divided by cards shown in that category, avoiding a research-heavy sample automatically implying research preference. Ties can show both; no interest means undecided, not zero ability. “Unclear” becomes an explore list, not a negative skills verdict.

Direction selects the question-bank topics and suggested skill preparation; it never excludes an eligible program.

### Profile and Eligibility Engine

Implements `prd.md > Eligibility Check`, `prd.md > States and Boundaries`.

Check explicit reviewed rule objects, not AI prose. Validate grade value **and scale**, study year/degree duration and conditional confirmations. Do not convert every Indian CGPA to a percentage by multiplying by ten. Use only an official/evidenced equivalence; otherwise flag the grade rule for confirmation.

Separate two axes: eligibility (`meetsKnownCriteria | failsCriteria | needsConfirmation`) and cycle (`open | closed | rolling | unknown | unavailable`). One failed mandatory rule is enough for a reasoned negative; no failures plus unanswered mandatory rules is not enough for a positive.

Show eligibility based on entered details, not independent document verification. Missing facts do not disappear. No automatic hard-deadline schedule for a cycle with unconfirmed dates.

### Timetable and Browser Progress

Implements `prd.md > Timetable Entry`, `prd.md > States and Boundaries`.

One versioned browser record holds reactions, profile, weekly hours, exam weeks, answers, assessment, and completion IDs. Read/write through a focused storage helper; validate saved state, handle old schema/catalog versions, and show a visible warning if saving fails.

No name, email, passport number, grades transcript, or document uploads are needed. Provide Clear my progress with confirmation. Clearing browser/site data loses progress; different origins/devices do not share it.

POC exam weeks have **zero preparation capacity** (a conservative, simple way to meet “no heavy steps”). Partial current weeks prorate available hours. Use one budget across Research and Company, not full hours twice.

### Question Bank and AI Assessment

Implements `prd.md > Readiness Interview`.

Reviewed questions include skill ID, prompt, acceptable evidence, fixed rubric items, related official/project source IDs, and examples of inadequate evidence. Select 6–8 relevant questions; do not pretend every skill across all programs was tested.

Assess the completed interview in one AI call, not a paid call per keystroke/question. The server retrieves question/rubric/catalog contents by allowed IDs; the client cannot supply system prompts, new requirements, tools, or its own score.

Strict output: each question ID, per-rubric `met | partial | missing` verdict, short answer-evidence excerpt, and brief reason. Server validates IDs, enums, length, coverage, and evidence membership in the submitted answer. Code derives `ready` when all required rubric items are met, `partly` when some evidence is present, and `notYet` otherwise. Missing question coverage is not silently filled in.

Documents and external dependencies are completion checklists, not AI-certified skills. An interview cannot know a professor has submitted a recommendation. Do not invent a numeric “chance of selection.”

### Shared Preparation and Scheduler

Implements `prd.md > Track Timeline`, `prd.md > Deadline Handling`.

Maintain reviewed task templates and dependencies. Merge only compatible reusable work: a CV core, reusable evidence project, or common skill preparation. Program-specific essays, different submission formats, official letters, and application submissions remain distinct even if their names sound alike.

1. Remove closed/unavailable programs from active application scheduling, retaining completed work.
2. Derive prerequisites backwards from sourced stages. For undated later stages, show conditional milestones without invented interview dates.
3. Assign each preparation task its earliest relevant confirmed deadline or explicitly personal target.
4. Schedule dependency-ready work in due-date order into future non-exam capacity. Split work into weekly chunks when needed; use stable task IDs and deterministic tie-breaks.
5. Account for all tracks in the same capacity ledger. Tasks due mid-week must finish before the real cutoff; a week containing a deadline is not permission to work after it.
6. Leave impossible chunks in an **Unscheduled / At risk** section with unmet dependencies, hours short, and affected programs. Do not place overflow after its deadline and claim it fits.

Effort estimates are approximate template values, labelled as estimates. The feasibility check includes shared workload competition and waiting dependencies, not just separate per-program totals. Recommendation-letter requests may need lead time; that is explicitly estimated guidance, not a guaranteed response time.

Re-evaluate using a clock supplied to the rule engine for tests and the real current date for normal use. Store known deadline instants in UTC and original source timezone. Rolling slots can fill between catalog reviews: always disclose the last-check date and link to official availability.

### Roadmap Overview and Track Timeline

Implements `prd.md > Roadmap Overview`, `prd.md > Track Timeline`.

Overview: current action, track cards, readiness summary, deadline/target labels. Timeline: weekly allocations, official stage markers, source disclosures, exam weeks, program tags, completion controls, and explicit unscheduled work.

Select this week's action from unfinished dependency-ready scheduled tasks, earliest deadline first. If none exists, show an honest empty state (“No scheduled work this week”) or the necessary confirmation, not a fabricated task. No eligible programs → reasons and real future-call information. All closed → general preparation, without promising an unannounced next cycle.

Marking a task done removes its remaining effort; reopen restores it. Changing timetable/profile/direction re-evaluates the plan. Preserve completed work; invalidate an assessment only when questions/rubrics or selected skill focus actually change. Source lookup must work for every tagged program, not merely the first program in a shared task.

### Server Safety and Operational Controls

Implements `prd.md > Readiness Interview`, `prd.md > States and Boundaries`.

For the single-instance proof of concept:

- Validate requests and AI output; body limit 32KB, 8 answers maximum, 1,500 characters per answer, allowlisted IDs.
- Same-origin JSON endpoint; reject unexpected origins; no permissive wildcard CORS. Client IDs are not authentication.
- Signed anonymous browser token, plus safely configured trusted-proxy/IP limiting; never trust arbitrary forwarded headers.
- Proposed starting limits: 3 assessments per browser per hour, 10 per trusted IP per hour, 2 concurrent provider calls globally, 50 provider calls per day per server instance, output cap ~1,800 tokens, 30s provider timeout, no automatic retry storm.
- Enforce a server-held daily stop counter; ignore its operational file in Git. If persistent counter storage is unavailable, fail the paid feature closed or use a provider-side limit; do not silently reset protection. Confirm provider spend controls before opening a public demo. Multi-instance/public scale needs a shared quota store and a fresh security review.
- No source fetch endpoint for user URLs. Collector is an operator-only allowlist script, not a route that can access arbitrary/internal hosts.
- Treat page text and answers as untrusted content. AI has no tools, browsing, file access, or application-submission powers. Display its text safely; never render raw HTML or execute student code.
- Before interview submission, explain that answers go to the managed AI provider. Keep raw answers out of server logs and disk; do not promise zero provider retention without verifying terms.
- Log request ID, route, status, duration, model call count, and sanitized error category; no answers, credentials, full IP addresses, or academic profile.
- `/api/health` reports service status without calling AI. If provider access is missing, the interview clearly reports unavailable while non-AI screens still work.

These are bounded POC safeguards, not a claim of production-grade abuse prevention. Rate limiting limits repeated calls; input validation blocks malformed data; prompt-injection defenses prevent submitted text from gaining authority. Introduce these by name during their build steps, as requested.

## Data Model

| Record | Main fields | Lives where / update behavior |
| --- | --- | --- |
| Source | ID, official URL, short quote, section, checkedAt, cycle | Reviewed JSON; refreshed by operator review, not student content. |
| Program | ID, track, funding components/fees, rule IDs, stage IDs, cycle state, deadline kind/instant/timezone/source, next-call info if evidenced | Reviewed JSON; independently versioned. |
| Rule | ID, input key, operator/value/scale or confirmation, source ID | Reviewed JSON; deterministic evaluation. |
| Stage | ID, program ID, label, source ID, ordering, known date or conditional/undated | Reviewed JSON; no universal invented selection pipeline. |
| Taste card | ID, real description URL, paraphrase, short source quote, field/track tags, skill/source IDs | Reviewed JSON; reactions locally saved. |
| Question | ID, skill ID, rubric items, related source IDs, rubric version | Server-owned reviewed bank; selected prompts sent to browser. |
| Progress | schema version, catalog/rubric versions, reactions, profile, exam weeks/hours, optional personal targets, answers/assessment, completed task IDs | localStorage; write after meaningful actions. |
| Task template | stable ID, preparation/official distinction, dependencies, estimated hours, compatible reuse key, stage/rule evidence | Reviewed JSON; code instantiates/merges appropriately. |
| Schedule | allocations, program tags, due-kind, capacity usage, risk reasons, this-week action | Derived from inputs; recompute rather than trust a stale saved schedule. |
| Operational quota | UTC day, provider call reservations/count | Private server operational storage, no student answers. Single instance only. |

## File Structure

Planned only; this task does not create these application files. The web artifact setup may nest them under its app directory; preserve these logical boundaries.

```text
web-app/
├── package.json / package-lock.json  # scripts and reproducible dependencies
├── tsconfig.json / vite.config.ts    # TypeScript and single-origin dev setup
├── index.html                       # client entry
├── client/src/
│   ├── main.tsx / App.tsx           # guided flow and return routing
│   ├── pages/
│   │   ├── TasteTest.tsx / DirectionResult.tsx
│   │   ├── ProfileTimetable.tsx / EligiblePrograms.tsx
│   │   ├── ReadinessInterview.tsx / AssessmentSummary.tsx
│   │   └── RoadmapOverview.tsx / TrackTimeline.tsx
│   ├── components/
│   │   ├── SourceDisclosure.tsx / ProgramCard.tsx / TaskCard.tsx
│   │   └── WeekBlock.tsx / StatusMessage.tsx
│   ├── lib/storage.ts / api.ts      # validated saves and relative API requests
│   └── styles/tokens.css / app.css  # editable planner visual system
├── shared/
│   ├── schemas.ts / types.ts        # runtime validation and shared types
│   ├── direction.ts / eligibility.ts
│   ├── readiness.ts / tasks.ts      # verdict mapping and compatible reuse
│   └── scheduler.ts / dates.ts      # capacity/dependencies/timezone rules
├── server/
│   ├── index.ts / routes.ts         # same-origin server, health, API errors
│   ├── ai.ts / assessment.ts        # managed provider, schema, evidence checks
│   └── safety.ts / quota.ts         # limits, privacy-safe logs, cost stop
├── data/
│   ├── sources.json / programs.json / cards.json
│   └── questions.json / task-templates.json
├── scripts/collect-sources.ts / validate-data.ts
├── tests/                           # rules, API contracts, full journey
├── README.md / LICENSE / THIRD_PARTY_NOTICES.md
└── .env.example                     # names/placeholders only, no credentials

devpost/                             # canonical scope/PRD/spec + HTML companions
generated-artifacts/                 # ignored raw pages, extracts and test output
```

## API and External Service Contracts

### Application API

- `GET /api/catalog` → public reviewed sources/programs/cards/question prompts, catalog version. Never provider configuration or secret rubric answers.
- `POST /api/assessment` → `{catalogVersion, rubricVersion, direction, programIds, answers:[{questionId,text}]}`. Server derives valid questions and required rubrics; client-supplied tags are validated hints, not trusted rules.
- Successful response → `{assessmentId, rubricVersion, model, assessedAt, results:[{questionId,skillId,status,reason,evidence}]}`.
- Errors → `{error:{code,message,requestId}}`, with appropriate 400/429/502/503 status; 429 includes Retry-After. No stack trace or provider credential details.
- `GET /api/health` → availability of app/catalog/AI configuration, not secrets.

### Managed AI

Server-side OpenAI SDK using the **actual Replit-provided configuration**, never guessed credentials or proxy URL. Planned provider call: chat completions with `model: gpt-4.1-mini`, fixed system instructions, rubric + bounded answers, strict `response_format` JSON schema, temperature 0, output-token limit, timeout and no uncontrolled retries.

Responses must still be semantically validated; schema correctness does not prove factual correctness. Refusal, timeout, missing rubric items, bad IDs, or invalid evidence is an honest failure, not a fabricated assessment.

Replit's [documentation](https://docs.replit.com/features/integrations/replit-ai-integrations) confirms managed credentials and billing at provider public API prices through Replit credits, with plan/admin availability conditions. This is **not free AI usage**. A live integration is not configured in this workspace yet; the connector search returned no matching row, so do not invent a connector ID or claim it already works. Confirm managed-AI activation/configuration with the platform during build before the interview step.

The [model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini) lists input/output prices of $0.40/$1.60 per million tokens. As an indicative calculation, 4,000 input + 1,800 output tokens is ~$0.0045 per call, excluding other services, retries, and setup costs. Actual prompt/token counts must be measured. Lower cost is not an abuse defense; enforce quotas.

### Source Collection

No external crawler API on the critical path. Public official HTTPS GET requests run only in the source-collection script; source URLs are allowlisted and any redirects validated. Save drafts for review, not automatic release. Pages behind login or with unclear reuse/access conditions are excluded until resolved, not bypassed.

## Important Failure Modes

- **Dates/criteria missing, stale, or contradictory:** show Needs confirmation or call-unconfirmed. Never infer a future deadline from last year. Last-checked date always visible.
- **AI inaccessible, slow, refusing, or malformed:** preserve answers, show honest retry/unavailable state. Non-AI features remain usable. The Oct 17 self-check fallback requires the learner's explicit choice and must be visibly labelled.
- **No interest, no eligible programs, all closed, or no work this week:** meaningful empty state from the PRD; no fake internship or made-up next step.
- **Work cannot fit:** visible at-risk and unscheduled work with reasons; no over-capacity week or after-deadline task disguised as success.
- **Storage blocked/corrupt:** warn that progress cannot be saved or offer a confirmed reset; do not silently claim persistence.

## Verification and Build Order

Every PRD behavior has a component above. Build in working slices:

1. Reviewed catalog/schema and app skeleton; real sources and explicit uncertainty before the UI promises eligibility.
2. Taste test, profile/timetable, eligibility reasons and source disclosures; restore/clear progress.
3. Question bank and one real managed-AI assessment; invalid-input, injection, timeout/refusal and quota checks.
4. Shared task construction, one cross-track capacity ledger, roadmap overview/timeline, completion/reopen, closed/rolling/at-risk behavior.
5. Full journey and public-demo hardening; capture a truthful recording with real data and approved docs.

Test the scheduler with a fake clock: same-step reuse, incompatible essays not merged, dependency order, exam weeks, partial weeks, exact time zones, nearest deadline, no double-spending hours across tracks, rolling target labels, passed deadlines, and overflow remaining unscheduled.

Test eligibility with missing institution, unsupported grade conversion, conditional evidence, changed study year, failed criteria, and closed cycles. Validate every referenced quote/source/task ID and every real card link. Test readiness against reviewed good/partial/empty answers; judge explanations as well as JSON validity. Test save/restore/reset, unavailable provider, malformed outputs, and limits without paying for each failure test.

Run type check, catalog validation, tests and build, then exercise one real end-to-end interview and the full no-eligible/all-closed paths. Verify phone (~390px), tablet (~768px), desktop (~1280px), keyboard operation, focus/errors, readable contrast, and reduced motion.

**Schedule:** target build Oct 15–20; Oct 17 checkpoint decides whether the readiness interview must become a labelled self-check. Photo timetable parsing remains stretch, never part of the kernel. Early share Oct 21–22, final target Oct 25, hard deadline Oct 27 at 02:30 IST.

## What Was Simplified and Why

- Reviewed files instead of a live per-user crawler: reliable demo, fewer services, bounded cost. Never fake the source facts.
- Browser progress instead of accounts/database: enough for a single-student proof of concept, no cross-device sync.
- Question bank + one assessment call instead of open-ended AI chat: testable evidence, predictable cost, less injection exposure.
- Deterministic scheduling instead of an AI-generated calendar: dates, capacity and dependencies must be checkable.
- A small evidence-backed program set instead of an arbitrary eight-program target: exclude unsupported/inactive/partially funded examples.
- No application automation, professor finder, mock selection interview, notifications, or review-site scraping.

## Decisions and Open Issues

- **Learner decision:** TypeScript throughout with React and a small server; accepted the recommendation rather than preferring a Python server.
- **Earlier agreed product decisions:** general direction test, grouped Research/Company tracks, earliest-deadline shared preparation, official-only selection stages, manual timetable, paper planner with bold accents. Do not reopen them.
- **Proposed implementation details:** Express/Vite/Zod, question-bank rubric, one bounded managed-AI call, reviewed JSON data, shared capacity ledger and the safety limits. Spec approval accepts these details.
- **Genuine uncertainty resolved:** the learner wanted unnamed “basic securities,” including rate limiting. Here the unfamiliar concepts map to concrete risks: repeated paid calls → limits/quotas; malformed input → validation; hostile answer instructions → no-tools assessment with schema/evidence checks. Teach these at their real build moments, not through an extra exercise.
- **Evidence-based product clarifications:** the five items in that section need approval and matching PRD updates before coding.
- **Early build gates:** finish each included program's detailed rules, source excerpts, timezone/funding limits; verify managed-AI activation and an actual strict-output call; audit actual dependency versions/licenses. No invented values to pass a gate.
- **Can wait:** project name, optional publishing, more programs, optional animation choice, photo parsing. The learner chooses the name; “Untitled” is not a product-name decision.
- **Related prior work:** Scout was the learner's separate internship-discovery entry. Ideas only, rebuilt fresh; no copied Scout code or visual identity. Disclose it as related inspiration. This spec is not submission text.
