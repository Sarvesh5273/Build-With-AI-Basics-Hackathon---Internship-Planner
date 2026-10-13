---
doc: scope
status: approved
---

# Untitled (name is the learner's call; decided before submission)

A roadmap tool for Indian undergrads chasing fully funded internships abroad. It shows which real programs you can actually apply to, how ready you really are for each, and a plan that fits around your university timetable.

## The Unique Kernel
Your roadmap is built from three real things, not generic advice:
1. **The programs' actual requirements**, quoted from their official pages.
2. **Your verified level**, from a short interview, not a self-rating.
3. **Your university timetable**, meaning exam weeks and free hours.

Study planners don't know the programs, program lists don't know your level, and neither knows your semester. Funded programs also ask for very different things: skills, documents like an SOP or recommendation letters, and in some cases a professor's acceptance. The roadmap puts all of that into one plan.

## Who It's For
A 3rd-year B.Tech student at an Indian university applying this cycle to funded research or company internships abroad. The programs are discovered from the student's preferences, not restricted to a fixed list of familiar names. They've finished a language like Python and don't know what to learn next or which programs to target. They don't really know what "research" work involves. Today they piece it together from scattered official pages, seniors' advice, and YouTube, then guess at what to do in which week around exams.

## The Core Loop
1. Start with a general taste test: real, source-grounded questions covering common kinds of internship work. Similar internships share genres; the test is not generated separately for every opportunity.
2. On the next screen, answer Scout-like search-preference questions: topics/roles, locations, Research/Company interests, funding and other relevant filters. The taste-test result helps but does not dictate these preferences.
3. Discover internships from those preferences, check eligibility (nationality, year, CGPA, branch and any required follow-ups), and choose the internships to target. The student chooses; a fixed program catalog does not.
4. Answer the short readiness interview for those choices and enter the university timetable: exam weeks and free hours.
5. Get the agreed Research/Company roadmaps, with shared preparation appearing once, program-specific steps tagged, and the one next step to do this week.

You come back when the timetable changes (exams, new semester) or after finishing a step, and the roadmap updates.

## Inspiration & Identity
Must look like its own product, with its own visual identity. It should not resemble the learner's earlier tool Scout (https://scout-careers.replit.app/) and should avoid generic "AI app" styling. It should feel honest and trustworthy: every requirement shows where it came from. Visual direction gets decided in the PRD.

## Why This Matters to the Learner
They're applying to these internships this cycle and hit this exact problem themselves: "i was facing the problems as described". They also want to win the hackathon.

## What "Working" Looks Like
In the learner's words: "see that roadmap and plan according to my internships and my university timetable."

The demo moment: a student takes the general taste test, answers search-preference questions, discovers and chooses internships, and sees the agreed roadmap after the readiness interview and timetable entry. Each step is placed around their exam weeks and real application deadlines, shared work appears once before the earliest deadline it serves, each requirement links to its official source, and one next step is highlighted for this week.

## The POC Boundary
- A small reusable taste test of real, source-grounded questions spanning common work genres. It is independent of the number of internships discovered.
- Scout-like preference questions and fresh, preference-driven internship discovery with filters and student selection. Rebuild the functionality; do not call Scout or copy its code. Search is not restricted to a fixed list of programs.
- Official-source evidence for the selected internships: each requirement has its official source and a quoted line. Missing information is visibly unconfirmed, not invented.
- An eligibility check on nationality, year, CGPA and branch.
- A short AI readiness interview that checks your level against what the programs need.
- Timetable entered by hand: exam weeks and free hours per week.
- Grouped Research/Company roadmaps for the student's choices, scheduled around the timetable and deadlines, with shared steps placed before the earliest deadline they serve, closed/at-risk handling, and one highlighted next step.

## Later
- Reading a timetable from a photo. This is a stretch goal, decided at the Oct 17 build checkpoint.
- A "re-check this program" button that reads the official page live and shows "verified today".
- Broader source coverage and other Indian universities' calendars.

## Explicitly Cut
- **Visa-approval odds:** there's no reliable public data, and a made-up probability wouldn't hold up. Official visa notes are shown instead.
- **SOP drafting:** writing the student's application for them isn't the problem being solved, and it raises honesty issues.
- **Professor finder / cold-email tool:** it's a separate, large problem.
- **Reminders and notifications:** not needed to prove the core idea.
- **Accounts and login:** not needed for a proof of concept.

## If We Fall Behind (decided at the Oct 17 checkpoint)
The readiness interview becomes a simple self-check first. The taste test, eligibility check, and timetable-fitted roadmap stay.

## Prior Related Work (disclosure)
The learner built Scout, a live internship-discovery tool for a separate bounty, the week of Oct 6, 2026, without this skill pack. No Scout code is used here. Only ideas carry over, such as quoting the source for every fact.
