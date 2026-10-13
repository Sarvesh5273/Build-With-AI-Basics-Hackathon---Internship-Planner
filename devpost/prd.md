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
- Inputs: nationality, year of study, CGPA, branch.
- Each discovered internship is checked against its official criteria. Results: **Eligible based on entered details**, **Not eligible** (failed criterion and quoted source), or **Needs confirmation** when required facts are missing. Cycle status separately shows **Closed this cycle** for a passed deadline.
- Eligible programs are grouped into **Research** and **Company** tracks.

Acceptance criteria:
- [ ] Changing CGPA or year visibly changes which programs are eligible.
- [ ] Each "Not eligible" program names the exact criterion and links its official quote.

### Timetable Entry
Develops `scope.md > The Unique Kernel` (input 3). Entered by hand.
- Mark exam weeks; set free hours per week.
- Exam weeks get no heavy steps.

Acceptance criteria:
- [ ] Marking a week as an exam week moves heavy steps out of that week on the timeline.
- [ ] Lowering free hours spreads steps over more weeks.

### Readiness Interview
Develops `scope.md > The Core Loop` step 4. A **level check**, not a mock interview.
- A short set of questions, focused on the skills required by the student's direction and their selected internships.
- Output: each requirement gets a status (**ready**, **partly**, **not yet**) with a one-line reason drawn from their answers.
- Statuses feed the roadmap: "not yet" and "partly" become steps; "ready" skills are not re-taught.

Acceptance criteria:
- [ ] The questions visibly differ for a student leaning ML/data versus one leaning company/software.
- [ ] Every requirement in the summary has a status and a reason, and none is a self-rating.

### Roadmap Overview
Develops `scope.md > What "Working" Looks Like`.
- **This week's one step** at the top, chosen across all tracks by the nearest deadline it serves.
- One card per track: the programs in it, the nearest deadline, and a one-line readiness summary.

Acceptance criteria:
- [ ] Exactly one step is highlighted as this week's step.
- [ ] Each track card lists its programs and nearest deadline.

### Track Timeline
Develops `scope.md > The Core Loop` step 5.
- **Built backwards from each program's official selection stages.** Each stage (e.g. securing a professor's acceptance, documents, coding test, interview) is a milestone quoted from the official source. Prep steps land in free weeks before it.
- Weeks from now until the last deadline. Exam weeks hatched out; each program's deadline marked.
- **Shared steps appear once**, tagged with every program they serve (e.g. "SOP core story → MITACS, DAAD WISE, Charpak"). Program-specific steps are tagged with one program.
- A shared step is scheduled **before the earliest deadline it serves.**
- Each step shows: what to do, why (quoted requirement + official link), which programs it counts toward, estimated hours vs free hours that week, and done / not done.

Acceptance criteria:
- [ ] A shared research step appears once with all its program tags, not once per program.
- [ ] No step is placed after the deadline of any program it serves.
- [ ] Every requirement and selection stage links to its official source.
- [ ] Marking a step done updates the timeline and this week's step.

### Deadline Handling
Raised by the learner: a deadline in a grouped track must never expire unnoticed.
- **Deadline passed:** the program leaves the timeline and moves to "Closed this cycle" with its usual opening month and source link. It no longer affects scheduling.
- **Not enough time left:** if the hours its steps need exceed the student's free hours before the deadline (excluding exam weeks), the program stays visible but is marked **At risk** with a plain reason (e.g. "needs ~30 hrs, you have ~12 free hrs before Nov 10"). The student decides whether to push for it.
- Deadlines are re-checked against today's date every time the roadmap opens.

Acceptance criteria:
- [ ] A program with a past deadline never appears on a timeline and shows in "Closed this cycle".
- [ ] Reducing free hours until a program can't fit shows "At risk" with the hours comparison.

### Official Sources
Develops `scope.md > Inspiration & Identity` ("every requirement shows where it came from").
- Every requirement, eligibility criterion, deadline and selection stage shows a quoted line from the official page, a link, and a "last checked" date.
- Only official sources drive eligibility, scheduling and status. No student-report sites.

Acceptance criteria:
- [ ] Clicking any requirement's source tag shows the quote, link and last-checked date.

## States and Boundaries
- **First use:** starts at the taste test.
- **Coming back:** lands on the roadmap overview with their previous answers kept; deadlines re-checked. *(Assumption: progress is kept on the same device/browser, since there are no accounts. Confirm in `4-spec`.)*
- **No eligible programs:** a clear message naming the criteria that ruled each program out, and listing programs that are closed but reopen next cycle. *(Assumption: not raised by the learner; flagged for review.)*
- **Every eligible program closed:** the roadmap shows only "Closed this cycle" with opening months, plus skill steps from the readiness interview so the student can prepare for next cycle. *(Assumption, flagged for review.)*
- **Taste test with nothing marked interested:** the result says so and suggests continuing with all fields open. *(Assumption, flagged for review.)*
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
- **Official sources only.** Glassdoor/Reddit-style reports were considered and left out: sparse for these programs, unverifiable, and scraping-restricted. Learner: "i think official is ok".
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
- A "re-check this program" button that reads the official page live and shows "verified today".
- Broader source coverage and universities' calendars; a broader reusable genre-question set.
- A public launch beyond the hackathon (learner's interest).

## Non-Goals
- **Visa-approval odds:** no reliable data; official visa notes only.
- **SOP drafting:** not the problem being solved; honesty issues.
- **Professor finder / cold-email tool:** a separate, large problem, even though some programs need a professor's acceptance (the roadmap shows it as a stage; it doesn't find professors).
- **Reminders and notifications:** not needed to prove the core idea.
- **Scraping review sites:** see Product Decisions.

## Open Questions
- **Project name:** the learner's choice. Can wait until before submission; doesn't block `4-spec`.
- **Discovery provider, bounded search behavior and verification of selected internships' official selection stages:** define in `4-spec`; do not revert to a fixed program list.
- **React Bits licence:** check in `4-spec` before relying on it.
- **Assumptions under States and Boundaries:** confirm during review.
