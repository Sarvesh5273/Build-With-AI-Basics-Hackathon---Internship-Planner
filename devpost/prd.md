---
doc: prd
status: approved
---

# Untitled — Product Requirements

A roadmap tool for Indian undergrads chasing fully funded internships abroad. It helps them find a direction, see which real programs they can apply to, check how ready they are, and get a plan that runs backwards from each program's official selection stages and fits around their university timetable.
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.

## The Core Journey
Develops `scope.md > The Core Loop`.

1. **Taste test.** The student opens the app and reacts to about 10–12 real descriptions of funded work (research projects and company internships). They leave with a **direction**: which fields they lean towards and whether they lean research, company, or both.
2. **Your details.** They enter nationality, year of study, CGPA and branch, plus their timetable: exam weeks and free hours per week.
3. **Eligible programs.** They see which curated programs they can actually apply to, grouped into **Research** and **Company** tracks. Each program shows its official source. Programs whose deadline has passed appear under "Closed this cycle".
4. **Readiness interview.** A short interview checks their actual level on the skills their direction and their eligible programs need. For each requirement they get a status, not a self-rating.
5. **Roadmap overview.** One card per track, with **this week's one step** across everything at the top.
6. **Track timeline.** Clicking a track opens a week-by-week timeline, built backwards from each program's official selection stages and placed around exam weeks and deadlines.
7. **Coming back.** When their timetable changes or they finish a step, they come back. The roadmap updates, and deadlines are re-checked against today's date.

Success: a student sees a roadmap for their eligible programs where every step lands in a week they can actually do it, every requirement links to its official source, and one step is highlighted for this week.

## Screens and Layout
A single guided flow of steps with a visible progress indicator, ending on the roadmap. The roadmap is where returning students land.

1. **Taste test:** one card at a time, three reaction buttons, progress count; ends on a "Your direction" result.
2. **Your details:** one form with eligibility fields and a timetable section (mark exam weeks on a week strip; free hours per week).
3. **Eligible programs:** program cards grouped by track, plus a collapsed "Closed this cycle" list and, if any, a "Not eligible" list with the reason.
4. **Readiness interview:** one question at a time; ends on a per-requirement status summary.
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
Develops `scope.md > The Core Loop` step 1. A **general direction test**, not a list of projects to apply to.
- A hand-picked set of about 10–12 real descriptions covering different kinds of work (e.g. ML/data, web/software, robotics/hardware, core engineering) plus a couple of company internships.
- Research cards come from the MITACS Globalink public project catalogue and are labelled as MITACS projects with their real link. A card is never presented as a DAAD or Charpak project. Company cards come from real company-program pages (e.g. HENNGE).
- Each card shows: title, plain-language "what you'd actually do day to day", skills it asks for, and source link.
- Reactions: **interested**, **not for me**, **don't understand this one**.
- Result: the fields they lean towards, research vs company lean, and the skills their liked cards keep asking for.
- The direction decides **which skills to prove**: it focuses the readiness interview and adds skill-building steps to the roadmap. It does **not** decide which programs appear; eligibility does that.

Acceptance criteria:
- [ ] Every card shows a working link to its real source; no invented descriptions.
- [ ] After the last card, a "Your direction" result lists the leaning fields, the research/company lean, and repeated skills.
- [ ] "Don't understand this one" reactions show up in the result as things to explore.

### Eligibility Check
Develops `scope.md > The POC Boundary`.
- Inputs: nationality, year of study, CGPA, branch.
- Each curated program is checked against its official criteria. Results: **Eligible**, **Not eligible** (with the failed criterion and its quoted source), or **Closed this cycle** (deadline passed).
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
Develops `scope.md > The Core Loop` step 3. A **level check**, not a mock interview.
- A short set of questions, focused on the skills required by the student's direction and their eligible programs.
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
Develops `scope.md > The Core Loop` step 4.
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
- **Roadmaps grouped by track (Research / Company)** rather than one per program. Same-type programs need much of the same prep, so grouping avoids planning the same work several times.
- **Two-level roadmap:** overview with this week's step, then a timeline per track.
- **Shared steps scheduled before the earliest deadline they serve.** Simple and safe, even if some steps land earlier than strictly needed.
- **Expired and at-risk deadlines handled explicitly** (learner raised it: "it should not happen like deadline of one or more internship in that group expire").
- **Taste test is a general direction test**, not tied to specific programs. Not every program publishes projects, and the test's job is to show what the work is like.
- **Direction focuses skills, not programs.** Eligibility decides programs.
- **Roadmap built from official selection stages.** The learner's point: students need to get through the actual selection process, not just learn skills.
- **Readiness interview stays a level check** for now; a mock interview is later.
- **Official sources only.** Glassdoor/Reddit-style reports were considered and left out: sparse for these programs, unverifiable, and scraping-restricted. Learner: "i think official is ok".
- **Look: paper planner with bold accents**, using ready-made components where possible.

## What We're Building
- Taste test with ~10–12 real, linked cards and a direction result.
- Eligibility check against a small curated set of programs with quoted sources.
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
- More programs, countries and universities' calendars; a larger taste-test card set.
- A public launch beyond the hackathon (learner's interest).

## Non-Goals
- **Visa-approval odds:** no reliable data; official visa notes only.
- **SOP drafting:** not the problem being solved; honesty issues.
- **Professor finder / cold-email tool:** a separate, large problem, even though some programs need a professor's acceptance (the roadmap shows it as a stage; it doesn't find professors).
- **Reminders and notifications:** not needed to prove the core idea.
- **Scraping review sites:** see Product Decisions.

## Open Questions
- **Project name:** the learner's choice. Can wait until before submission; doesn't block `4-spec`.
- **Exact program list and which official pages state each selection stage:** verify in `4-spec`.
- **React Bits licence:** check in `4-spec` before relying on it.
- **Assumptions under States and Boundaries:** confirm during review.
