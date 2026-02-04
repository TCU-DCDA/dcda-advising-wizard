# Claude Review: DCDA Advisor Mobile
**Date:** February 4, 2026  
**Reviewer:** Claude (Opus 4.5)  
**Scope:** Validation of Codex_Review_2-4-26.md + Gap Analysis

---

## Executive Summary

The Codex review correctly identified **10 valid findings** with zero false positives. However, the review has notable gaps—missing accessibility concerns, race conditions, error handling, and mobile-specific issues. Rating: **Adequate (Has Gaps)**.

---

## Part 1: Codex Findings Validation

### HIGH Severity — Both Confirmed ✅

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Import mapping ignores DC/DA electives | ✅ CONFIRMED | `getRequiredCategoryCourses()` only checks `degree.required.categories`, returns `[]` for electives defined in `degree.electives`. Imported DC/DA courses fall through with no category match. |
| 2 | "Not yet" doesn't clear DC/DA selections | ✅ CONFIRMED | `handleSelectNotYet()` writes to `dcElective`/`daElective` (singular) but `CategorySelections` uses `dcElectives`/`daElectives` (plural). Stale selections persist. |

### MEDIUM Severity — All Confirmed ✅

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 3 | Flexible courses not honored in Review | ✅ CONFIRMED | `ReviewSummaryStep` doesn't check `courseCategories` for DCDA 40273/30970 when building `scheduledByCategory`. |
| 4 | Semester planning hardcoded to Spring 2026 | ✅ CONFIRMED | `getSemestersUntilGraduation()` starts at `year=2026, season='Spring'` — not derived from `offerings.term`. |
| 5 | DCDA 40003 not excluded from general electives | ✅ CONFIRMED | `getOfferedCoursesForCategory()` only excludes `DCDA 40833`, not thesis alternative `DCDA 40003`. |
| 6 | Special credits overcounting | ✅ CONFIRMED | `calculateUnmetCategories()` uses `specialCredits.length` without filtering by `countsAs` property. |
| 7 | CSV drops `includeSummer` preference | ✅ CONFIRMED | `exportToCSV()` has no `includeSummer` line; `parseCSVImport()` has no case for it. |

### LOW Severity — All Confirmed ✅

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 8 | PDF blob URL leak on Close | ⚠️ PARTIAL | "Close" button bypasses `onOpenChange` cleanup. However, clicking outside dialog or pressing Escape does properly revoke via `onOpenChange`. Still a leak path. |
| 9 | Requirements table hardcoded | ✅ CONFIRMED | `NameStep.tsx` has static HTML table, not derived from `requirements.json`. |
| 10 | Step index not clamped | ✅ CONFIRMED | `useWizardFlow` uses `steps[0]` fallback but doesn't proactively clamp index when step list shrinks. |

---

## Part 2: Issues Codex Missed

### HIGH Severity

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 11 | **Race condition in import navigation** | `App.tsx` L509-520 | `pendingImportNav` effect may fire before `wizard.unmetCategories` updates, causing `goToStepId()` to target non-existent step. |
| 12 | **No offerings update mechanism** | `data/offerings-sp26.json` | App has no way to refresh offerings data. After Spring 2026 ends, schedule features show stale courses indefinitely. |

### MEDIUM Severity

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 13 | **No accessibility audit** | Multiple components | Missing: `role="radiogroup"` on degree/graduation buttons, `aria-describedby` on course checkboxes, proper disabled state announcements. TCU compliance risk. |
| 14 | **No React Error Boundary** | `App.tsx` | Uncaught error crashes entire wizard with no recovery. User loses all unsaved selections. |
| 15 | **localStorage quota not checked** | `useStudentData.ts` | `localStorage.setItem` can fail silently on quota exceeded (5-10MB limit). Only logs to console. |
| 16 | **Print popup blocked on mobile** | `export.ts` L282 | `window.open()` blocked by iOS/Android popup blockers. Print feature fails silently. |
| 17 | **No input validation on name** | `NameStep.tsx` | Name accepts any input, rendered unsanitized in PDF. Potential XSS if PDF viewer executes scripts. |

### LOW Severity

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 18 | **Malformed section data** | `offerings-sp26.json` | Some sections (e.g., DCDA 20833) have swapped fields—schedule in modality column, status in schedule column. |
| 19 | **InstallPrompt ignores dark mode** | `InstallPrompt.tsx` | Uses hardcoded `bg-white` instead of theme variables. |
| 20 | **No offline indicator** | PWA config | Service worker caches assets but no user-facing offline banner or retry mechanism. |
| 21 | **Print blob URL timeout too short** | `export.ts` | 60-second `setTimeout` for URL revocation may fire while print dialog still open. |
| 22 | **console.error in production** | Multiple files | Error logging goes to browser console, not proper error tracking service. |

---

## Part 3: Thoroughness Assessment

### Rating: Adequate (Has Gaps)

**Strengths of Codex Review:**
- All 10 findings are valid bugs (zero false positives)
- Accurate file/line references
- Actionable remediation steps provided
- Identified testing gaps correctly

**Weaknesses:**
- No accessibility analysis (critical for educational software)
- No security considerations (input validation, XSS)
- No mobile-specific testing (popup blocking, touch)
- No error resilience review (boundaries, quota limits)
- No data freshness strategy discussion
- Didn't catch race condition in import flow

---

## Part 4: Prioritized Fix List

### Immediate (Before Next Release)

1. **Fix "Not yet" key mismatch** — Change `handleSelectNotYet` to write to plural keys
2. **Fix import mapping for DC/DA electives** — Use `getCoursesForCategory()` instead of `getRequiredCategoryCourses()`
3. **Fix import navigation race condition** — Add proper state synchronization or use callback pattern

### Short-Term (This Sprint)

4. Remove Spring 2026 hardcoding — Derive from `offerings.term`
5. Exclude DCDA 40003 from general electives
6. Fix special credits overcounting — Filter by `countsAs`
7. Add `includeSummer` to CSV export/import
8. Add React Error Boundary wrapper

### Medium-Term (Next Sprint)

9. Accessibility audit and fixes
10. localStorage quota handling with user feedback
11. Mobile print fallback (download instead of popup)
12. Step index clamping in useWizardFlow
13. Flexible course categorization in Review steps

### Backlog

14. Fix offerings data quality issues
15. Dark mode support for InstallPrompt
16. Offline indicator UI
17. Derive requirements table from JSON
18. Production error tracking integration

---

## Part 5: Recommended Tests

Add regression tests for:

```
□ Import with DC electives → should populate dcElectives array
□ Import with DA electives → should populate daElectives array  
□ "Not yet" after selecting DC course → should clear dcElectives
□ "Not yet" after selecting DA course → should clear daElectives
□ Import with scheduledCourses → should restore to scheduledSelections
□ includeSummer round-trip through CSV export/import
□ Flexible course (DCDA 40273) categorization in Review
□ Semester plan starts from offerings.term, not hardcoded
□ DCDA 40003 excluded from general elective options
□ Special credits with countsAs='statistics' not counted as general
```

---

## Appendix: File References

| File | Key Issues |
|------|------------|
| `src/App.tsx` | #1, #2, #6, #11 |
| `src/services/courses.ts` | #4, #5 |
| `src/services/export.ts` | #7, #8, #16, #21 |
| `src/hooks/useWizardFlow.ts` | #10 |
| `src/hooks/useStudentData.ts` | #15 |
| `src/components/wizard/steps/ReviewSummaryStep.tsx` | #3 |
| `src/components/wizard/steps/NameStep.tsx` | #9, #13, #17 |
| `data/offerings-sp26.json` | #12, #18 |
