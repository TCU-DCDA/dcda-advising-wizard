# DCDA Advising Wizard — Bug Fixes, UX Improvements & Audit

## Context

The DCDA Advising Wizard (dcda.digitcu.org) is a web-based advising tool for students in TCU's Digital Culture and Data Analytics program. It walks students through their degree requirements, tracks completion, calculates progress, and includes a schedule builder for future semesters.

We just completed user testing with 21 current DCDA students. Below are the specific issues surfaced in their feedback, followed by a request for a broader audit pass.

## Instructions

1. **Explore the codebase first.** The primary repo is `dcda-advising-wizard`. Familiarize yourself with the project structure, key components, routing, and state management before proposing any changes.
2. **Do not make changes directly.** For every issue below, propose the fix with an explanation of what you'd change and why. Wait for my approval before implementing.
3. **Group your proposals** by the three sections below (Critical Bugs, UX Improvements, Audit).

---

## 1. Critical Bugs (from user testing)

### 1a. Backtracking causes stale data
When a user goes back to change an answer on a previous screen, the updated selection does not propagate forward. Subsequent screens retain the old values. Identify where state is being set on navigation and propose a fix so that backtracking and re-answering correctly updates all downstream state.

### 1b. Completion percentage calculation is wrong
At least one student reported being shown 74% complete when they only needed 3 more credits. Audit the progress/completion calculation logic. Identify how credits completed vs. credits remaining are computed and flag anything that could produce inaccurate percentages.

### 1c. "Email to Advisor" button not working
The button at the end of the wizard that should open an email to the student's advisor does not function. Find the relevant handler and determine what's broken (mailto link, missing data, event not firing, etc.). NOTE: Not a universal problem; I'm wondering if it has more to do with configuration of student's machine. Check anyway.

### 1d. Graduation date options need correcting
Multiple students reported that Spring 2026 was not an option. This is actually correct behavior — advising should NOT address the current semester. Planning should begin with Fall 2026. However, students were clearly confused by its absence, which suggests the UI isn't communicating this. Find where graduation date options are generated and: (a) confirm the earliest option is Fall 2026 and options extend at least 2-3 years forward, (b) propose a brief explanatory note in the UI so students understand why the current semester isn't listed, and (c) ensure this is dynamic rather than a hardcoded list so it stays correct over time.

### 1e. Duplicate/ghost course appearing on selection
When clicking a class on one of the selection pages, another class appeared as a duplicate. Investigate the course selection UI for rendering bugs — look for issues with list keys, state mutations, or conditional rendering that could cause phantom entries.

---

## 2. UX Improvements (from user testing)

### 2a. Multi-course requirement selection
On the Multimedia Authoring requirement screen (and potentially others), students who have taken multiple qualifying courses can only select one. If a requirement can be satisfied by multiple courses and a student has taken more than one, the UI should accommodate that — or at minimum make clear that only one is needed. NOTE: A clarification needs to be made. The MM Authoring step should only allow for one selection (to show requirement has been met). Other classes from the larger MM Authoring suite can count as either the DC elective or as a general elective once the MMA requirement has been satisfied.

### 2b. Course identification is not intuitive
Students had to pull up their transcripts to match course codes. Where courses are listed for selection, ensure both the course code AND the full course name are clearly displayed together. Consider whether any additional context (e.g., semester typically offered) would help.

### 2c. Transfer credit handling
Transfer credits are not being correctly reflected in the final overview. Investigate how transfer credits are captured and whether they're included in the progress calculation and the final summary output.

### 2d. Semester plan could be more useful
A student suggested that the semester plan at the end should show more than just what the student selected — it could surface other available sections or alternatives that also fulfill requirements. Assess feasibility and propose if there's a clean way to do this.

---

## 3. General Audit Pass

With the above in mind, do a broader review and flag anything else you notice:

- **State management hygiene:** Any other places where navigation or user input could leave state inconsistent?
- **Edge cases:** Students with nearly-complete degree plans, students who have taken more courses than required in a category — does the logic handle these gracefully? (Note: a student raised a concern about double-dipping Statistics credits across DCDA and a Math major. I'm reviewing that specific complaint separately — do not attempt to solve cross-major credit logic, but flag if you see anywhere the wizard assumes a single-major path.)
- **Date/semester logic:** Beyond the Spring 2026 issue, is the semester/date handling robust and future-proof?
- **Accessibility:** Any obvious a11y issues (contrast, labels, keyboard navigation)?
- **Error handling:** Are there user-facing operations that could fail silently or show raw error messages?

---

## Output Format

For each item, provide:

1. **File(s) involved**
2. **What's happening now** (brief)
3. **Proposed change** (specific)
4. **Risk/scope** (trivial / moderate / significant)

Wait for my go-ahead before implementing anything.
