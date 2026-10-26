---
doc: prd
status: approved
---

# Untitled — Product Requirements

A roadmap tool for Indian undergrads chasing fully funded internships abroad. It helps them find a direction, see which real programs they can apply to, check how ready they are, and get a plan that runs backwards from each program's official selection stages and fits around their university timetable.
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.

## The Core Journey
Develops `scope.md > The Core Loop`.

1. **Taste test.** Answer about 10–12 real, source-grounded direction questions covering common kinds of internship work. This reusable genre-based test helps them understand research/company work and find a direction; it is not a separate project card or quiz for every internship.
2. **Search preferences.** The next screen asks questions like Scout: roles/topics, locations, Research/Company preferences, funding, remote preference, citizenship/visa needs, include/exclude keywords and organizations of interest. The student can edit the direction suggested by the taste test.
3. **Discover, check and choose.** Discover internships using those preferences, filter the results, enter academic details needed for eligibility, and explicitly select the internships to target. Results are not restricted to a hardcoded program list. Each result shows official-source evidence; passed deadlines appear under "Closed this cycle". Unknown criteria stay visibly unconfirmed.
4. **Readiness and timetable.** The already-planned short interview checks the skills needed for the student's choices, not self-ratings or a mock selection interview. Retain manual exam weeks/free hours entry before generating the roadmap.
5. **Roadmap overview.** One card per track, with **this week's one step** across everything at the top.
6. **Track timeline.** Clicking a track opens a week-by-week timeline, built backwards from each program's official selection stages and placed around exam weeks and deadlines.
7. **Coming back.** When their timetable changes or they finish a step, they come back. The roadmap updates, and deadlines are re-checked against today's date.

Success: a student sees a roadmap for internships they discovered and chose, with the same agreed grouping, source evidence, capacity-aware weekly steps and one highlighted action. Search preferences do not automatically select their targets.

## Screens and Layout
A single guided flow of steps with a visible progress indicator, ending on the roadmap. The roadmap is where returning students land.

1. **Taste test:** one source-grounded question/work scenario at a time, with direction responses and progress; ends on a "Your direction" result.
2. **Search preferences:** Scout-like questions after the taste test, with editable preferences rather than forced choices.
3. **Discover and select:** filtered internship results with selection controls, official-source evidence, eligibility reasons and closed/unconfirmed states. Academic eligibility details are collected when needed.
4. **Readiness and timetable:** retain the one-question-at-a-time level check, its per-requirement status summary, and the manual exam-week/free-hours entry before roadmap generation.
5. **Roadmap overview:** this week's step at the top, then one card per track.
6. **Track timeline:** weeks laid out in order, with deadlines, selection stages and exam weeks marked; steps placed inside weeks.

## Look and Feel
Agreed direction: **a paper planner with bold accents.** Audience is Gen Z students.
- **Base: calm and paper-like**, for trust. Off-white or grid-paper background, a clean readable body font. Official quotes look like clipped excerpts with a source tag.
- **Accents: bold, used only for what's urgent.** Chunky marker-style headings, thick outlines, flat colours, one strong highlight colour. Deadlines appear as bold stickers, exam weeks are hatched out, and this week's step is highlighted like a highlighter mark.
- **Avoid:** generic "AI app" styling (purple gradients, glow, glassmorphism) and anything resembling Scout (`scope.md > Inspiration & Identity`).
- **Components:** the learner wants ready-made animation/interaction components (e.g. React Bits) rather than building everything from scratch. Licence to be checked in `4-spec`.
- The learner will fine-tune UI details by hand after the build.

## Features and Behavior

### Taste Test
Develops `scope.md > The Core Loop` step 1. A **general direction test**, not a list of projects to apply to or a skills examination.
- About 10–12 reusable questions about common genres of real internship work (e.g. ML/data, web/software, robotics/hardware, core engineering, research versus company work). Many internships share those genres; the test does not grow one-for-one with discovered internships.
- Ground each question/work scenario in an accessible official description. Clearly label the actual source; do not imply it is an interview question published by an employer unless that is evidenced.
- Each question helps the student understand the work in plain language and exposes its source.
- Direction responses include **interested**, **not for me**, and **don't understand this one**, as appropriate to the question.
- Result: the fields they lean towards, research vs company lean, and skills relevant to their preferred work genres.
- The result feeds editable preferences on the next screen and later focuses **which skills to prove**. It neither silently filters out programs nor selects internships for the student.

Acceptance criteria:
- [ ] Each question/work scenario links to the real official description grounding it.
- [ ] After the last question, a "Your direction" result lists the leaning fields, research/company lean and relevant skills.
- [ ] "Don't understand this one" reactions show up in the result as things to explore.

### Search Preferences, Discovery and Selection
Develops `scope.md > The Core Loop` steps 2–3. Scout is a functional reference, not a code dependency.
- The learner explicitly chose **TinyFish**, as in Scout, and wants the relevant discovery functionality replicated fresh. Do not replace it with a fixed dataset or a different discovery provider.
- After the taste test, ask for roles/topics, locations, Research/Company preference, funding, remote preference, citizenship/visa needs, include/exclude keywords and preferred organizations.
- The taste-test direction can prefill suggestions, but the student can change them.
- Discover internships using those preferences. A few familiar programs or taste-test sources do not define the searchable pool.
- Show filters, result evidence and eligibility/cycle status; let the student explicitly select and deselect targets.
- Preserve Scout-style explainable ranking, search within results, Research/Company and visa/funding/unknown filters, fit/newest/deadline sorting, save/hide controls and visible search/source progress. Bookmarking is separate from choosing a roadmap target.
- Only selected targets feed readiness and grouped roadmap generation. Filtering results must not silently remove a saved target or change its roadmap.
- Treat visa support as a quoted posting fact, never a visa-approval probability. Keep this product focused on internships.

Acceptance criteria:
- [ ] The Scout-like questions screen follows the taste test.
- [ ] Changing preferences changes the discovery request/results, not merely the ordering of a fixed named program list.
- [ ] A discovered internship outside the taste-test examples can be selected and used for planning when the official evidence supports it.
- [ ] Selecting/deselecting a target changes the programs included in readiness and roadmaps.
- [ ] Empty or failed searches show an honest state and allow editing preferences/retrying, rather than pretending a static catalog is a live result.
- [ ] Save/hide, result filtering and explicit target selection are distinct; a display filter cannot silently change a roadmap's targets.
- [ ] Fit rankings explain preference match, not a fabricated likelihood of selection.

### Eligibility Check
Develops `scope.md > The POC Boundary`.
- Inputs: nationality, year of study, grade value and scale, branch, plus conditional follow-ups when sourced rules require institute/degree dates/remaining semesters/English or other facts.
- Each discovered internship is checked against its extracted official criteria. Results: **Meets extracted criteria based on your details**, **Not eligible** (failed criterion and quoted source), or **Needs confirmation** when required facts are missing or unsupported. This is a preliminary check, not certification that every official condition has been independently verified.
- Selected programs are grouped into **Research** and **Company** tracks; unconfirmed conditions stay visible. Confirmed ineligible programs have no active application schedule, though general skill preparation can remain available.

Acceptance criteria:
- [ ] Changing CGPA or year visibly changes which programs are eligible.
- [ ] Each "Not eligible" program names the exact criterion and links its official quote.

### Timetable Entry
Develops `scope.md > The Unique Kernel` (input 3). Entered by hand.
- Mark exam weeks; set free hours per week.
- The conservative first implementation gives exam weeks zero preparation capacity: no heavy or light preparation is allocated there. This preserves the no-heavy-steps rule without guessing how much study time is left.

Acceptance criteria:
- [ ] Marking a week as an exam week moves heavy steps out of that week on the timeline.
- [ ] Lowering free hours spreads steps over more weeks.

### Readiness Interview
Develops `scope.md > The Core Loop` step 4. A **level check**, not a mock interview.
- A short set of questions, focused on the skills required by the student's direction and their selected internships.
- Output: each tested skill gets a status (**ready**, **partly**, **not yet**) with a one-line reason drawn from the answers. Required skills not covered responsibly by the short interview show **Not assessed**, never an invented verdict.
- Document and external-action requirements have checklists/confirmation states, not AI-certified skill scores. A student's answer cannot prove a recommendation letter was submitted.
- Statuses feed the roadmap: "not yet" and "partly" become preparation; "ready" skills are not re-taught. "Not assessed" remains an explicit coverage gap, with an appropriate assessment/general-preparation next action rather than an inferred lack of ability.

Acceptance criteria:
- [ ] The questions visibly differ for a student leaning ML/data versus one leaning company/software.
- [ ] Every tested skill has a sourced question/rubric, status and reason; uncovered skills and document/external-action requirements show their distinct honest states.

### Roadmap Overview
Develops `scope.md > What "Working" Looks Like`.
- **This week's one step** at the top when a feasible, dependency-ready action exists, chosen across all tracks by its nearest due date. Otherwise explain the empty/exam/waiting/confirmation state.
- One card per track: selected programs, nearest known official deadline or explicitly labelled personal target, and readiness/uncertainty summary.

Acceptance criteria:
- [ ] Exactly one feasible step is highlighted when one exists; no fake step in an exam, waiting or empty week.
- [ ] Each track card lists its programs and distinguishes official deadlines, personal targets and unknown dates.

### Track Timeline
Develops `scope.md > The Core Loop` step 5.
- **Built backwards from evidenced official selection stages.** A professor's acceptance is included only when that program explicitly requires it; it is not a generic research-internship step. App-authored preparation is labelled separately from actual official stages.
- Weeks from now until the latest relevant known deadline or personal target. Undated later stages remain conditional; unknown official dates are never invented. Exam weeks are hatched out.
- **Shared steps appear once**, tagged with every program they serve (e.g. "SOP core story → MITACS, DAAD WISE, Charpak"). Program-specific steps are tagged with one program.
- A shared step is scheduled **before the earliest deadline it serves.**
- Each step shows: what to do, why (linked quoted requirement and separately labelled preparation guidance), program tags, estimated hours vs free hours, and done / not done. Waiting for another person is a dependency, not compressible study hours.

Acceptance criteria:
- [ ] A shared research step appears once with all its program tags, not once per program.
- [ ] No step is placed after the deadline of any program it serves.
- [ ] Every requirement and selection stage links to its official source.
- [ ] Marking a step done updates the timeline and this week's step.

### Deadline Handling
Raised by the learner: a deadline in a grouped track must never expire unnoticed.
- **Official deadline passed:** the cycle leaves active allocations and moves to "Closed this cycle", preserving history and the source. Show a next opening only if official evidence supports it; otherwise say "Next call not announced."
- **Personal target passed:** show an overdue target and request an updated target. Do not label a rolling program closed without official evidence. Early closure when slots fill is possible and cannot be predicted.
- **Not enough time left:** if the hours its steps need exceed the student's free hours before the deadline (excluding exam weeks), the program stays visible but is marked **At risk** with a plain reason (e.g. "needs ~30 hrs, you have ~12 free hrs before Nov 10"). The student decides whether to push for it.
- Deadlines are re-checked against the clock on roadmap load, tab return and day change. This is distinct from re-fetching official pages and cannot notify someone while the app is closed.

Acceptance criteria:
- [ ] A passed official cycle has no active application allocations, shows "Closed this cycle" and retains history. A missed personal target does not falsely close the program.
- [ ] Reducing free hours until a program can't fit shows "At risk" with the hours comparison.

### Official Sources
Develops `scope.md > Inspiration & Identity` ("every requirement shows where it came from").
- Every claimed official requirement, eligibility criterion, deadline and selection stage shows a quote, link and retrieval/freshness label. Unsupported information stays unknown. Cached content is not claimed to be live-verified; preparation advice and estimated hours are app guidance, not official quotations.
- Funding filters default to the fully funded focus but may be broadened explicitly. “Fully funded” does not promise zero out-of-pocket costs: show sourced support, exclusions, caps and application fees; uncertain coverage remains unknown.
- Official sources are preferred and labelled. Revised in final review at the learner's request (“i want … to view not only on official sources but see others also … for more info of same internships”): readable third-party pages (announcement/news sites, job-board pages not linked from the organization's site) are shown as **Other source · unverified**, with quotes still checked against the page. When an official page for the same internship is found, it becomes the primary source and the others are attached for extra detail. A target whose primary source is unverified carries an explicit gap telling the student to confirm everything on the official page. Login-walled job boards and student-report/social sites (LinkedIn, Glassdoor, Indeed, Reddit, etc.) remain excluded.

Acceptance criteria:
- [ ] Clicking an official requirement's source tag shows the quote, link and honest retrieval/cache metadata.

## States and Boundaries
- **First use:** starts at the taste test.
- **Coming back:** restore the last completed/in-progress screen and browser-held progress. A generated roadmap returns to its overview; an interrupted search/interview does not jump to a nonexistent roadmap. Re-check dates; revalidate expired server records when necessary. No cross-device/sync promise.
- **No eligible programs:** name sourced failure/confirmation reasons; allow revising preferences and discovering other opportunities. No invented future call.
- **Every eligible program closed:** show closed-cycle history, any officially evidenced future call, and clearly labelled general preparation. No fabricated opening month.
- **Taste test with nothing marked interested:** say so and allow continuing with editable open preferences.
- **Interview can't be scored** (e.g. service failure): the student sees an honest error and can retry. The app never shows a made-up status.
- **At risk program:** stays on the timeline with the reason visible.

## Product Decisions
- **First taste test, then Scout-like questions, then the already-planned readiness/timetable/roadmap experience.** The learner clarified this order; do not redesign the downstream product.
- **A reusable genre-based taste test grounded in real work**, not one test or project card per internship.
- **Preference-driven discovery and student-selected targets**, rebuilt fresh without Scout integration or copied code. A fixed program catalog is not an agreed substitute.
- **TinyFish is the chosen discovery engine.** Scout's search/filter/ranking/evidence functionality is central, not an optional external integration.
- **Roadmaps grouped by track (Research / Company)** rather than one per program. Same-type programs need much of the same prep, so grouping avoids planning the same work several times.
- **Two-level roadmap:** overview with this week's step, then a timeline per track.
- **Shared steps scheduled before the earliest deadline they serve.** Simple and safe, even if some steps land earlier than strictly needed.
- **Expired and at-risk deadlines handled explicitly** (learner raised it: "it should not happen like deadline of one or more internship in that group expire").
- **Taste test is a general direction test**, not tied to specific programs. Not every program publishes projects, and the test's job is to show what the work is like.
- **Direction informs editable search preferences and skills preparation; the student chooses targets.** Eligibility assesses the choices rather than choosing on their behalf.
- **Roadmap built from official selection stages.** The learner's point: students need to get through the actual selection process, not just learn skills.
- **Readiness interview stays a level check** for now; a mock interview is later.
- **Official sources first, other sources labelled.** Glassdoor/Reddit-style reports were considered and left out: sparse for these programs, unverifiable, and scraping-restricted. Learner: "i think official is ok". Revised in final review: readable third-party pages are now shown as unverified other sources (see Official Sources).
- **Look: paper planner with bold accents**, using ready-made components where possible.

## What We're Building
- Taste test with ~10–12 reusable, source-grounded genre questions and a direction result.
- Scout-like preferences screen, internship discovery, filters and explicit target selection.
- Eligibility check against discovered internships' official requirements, with quoted sources and unconfirmed states.
- Manual timetable entry (exam weeks, free hours).
- Short readiness interview producing per-requirement statuses.
- Roadmap overview with one highlighted step for this week.
- Track timeline built from official selection stages, with shared steps, deadline markers, exam weeks, and done/not done.
- Closed and at-risk deadline handling.
- Source tag (quote, link, last checked) on every requirement.

## Deferred From the POC
- **Accounts / sync across devices:** progress stays on the device; accounts aren't needed to prove the idea (`scope.md > Explicitly Cut`).
- **Per-program filter on the timeline:** step tags are enough for now.
- **Mock interview** simulating real selection rounds: valuable, but a second product.
- **Student-reported interview experiences** (Glassdoor, Reddit, seniors): unverifiable; official-only for now.
- **Timetable from a photo:** stretch goal, decided at the Oct 17 checkpoint (`scope.md > Later`).

## Possible Later Enhancements
- A dedicated per-program re-check control with honest provider retrieval/cache labels.
- Additional specialized source adapters and universities' calendars; a broader reusable genre-question set. Preference-driven discovery is not deferred.
- A public launch beyond the hackathon (learner's interest).

## Non-Goals
- **Visa-approval odds:** no reliable data; official visa notes only.
- **SOP drafting:** not the problem being solved; honesty issues.
- **Professor finder / cold-email tool:** a separate, large problem, even though some programs need a professor's acceptance (the roadmap shows it as a stage; it doesn't find professors).
- **Reminders and notifications:** not needed to prove the core idea.
- **Scraping review sites:** see Product Decisions.

## Open Questions
- **Project name:** the learner's choice. Can wait until before submission; doesn't block `4-spec`.
- **Provider/account setup:** TinyFish is chosen; actual account limits, paid Agent authorization and managed-AI access are build-time gates in the approved spec, not missing provider choices.
- **React Bits licence:** reviewed in the spec; vet the exact chosen components/versions before installation.
- Final consistency review reconciled readiness coverage, empty weeks, unknown/reopening dates, rolling targets, funding labels and return behavior with the spec.
