# Codex Review 1-27-26

## Findings
- High: Schedule steps can dead-end when no courses are offered. The “Skip for now” control only renders when `availableCourses.length > 0`, but `canProceed` still requires a selection or skip, so the Next button stays disabled with no way to set `skippedCategories`. `src/components/wizard/steps/ScheduleStep.tsx:59`, `src/components/wizard/steps/ScheduleStep.tsx:121`, `src/App.tsx:269`.
- High: Passing an empty `generalElectives` array disables the fallback inference path, which undercounts general electives and skews progress/exports. `useRequirements` treats any array as “explicit,” even when it’s empty, while `ReviewSummaryStep`/`ReviewActionsStep` always pass `categorySelections.generalElectives` (default empty). `src/hooks/useRequirements.ts:143`, `src/App.tsx:694`.
- Medium: Scheduled courses aren’t persisted to `studentData` or restored on import. Scheduling only updates local `scheduledSelections`, `handleNext` saves only completed courses, and `handleImport` ignores `data.scheduledCourses` when initializing `scheduledSelections`, so refresh/import drops schedules and review can diverge. `src/App.tsx:76`, `src/App.tsx:204`, `src/App.tsx:334`, `src/App.tsx:388`.
- Medium: Term labels and plan generation are hard-coded to “Spring 2026,” which will go stale when offerings change. Review summary label, PDF header, and plan start all use fixed text. `src/components/wizard/steps/ReviewSummaryStep.tsx:253`, `src/services/export.ts:385`, `src/services/courses.ts:166`.
- Low: PDF preview blob URLs aren’t revoked on close, so repeated previews can leak memory during a session. `src/components/wizard/steps/ReviewActionsStep.tsx:90`, `src/components/wizard/steps/ReviewActionsStep.tsx:246`.

## Open Questions / Assumptions
- Is it acceptable to allow “Skip for now” even when no courses are offered, or should the step auto-skip in that case?
- Should `generalElectives` be treated as “explicit” only when it has entries (or when a flag indicates manual selection)?
- Should scheduled courses be persisted in localStorage and re-hydrated on import to keep the review/export consistent across sessions?

## Testing Gaps
- No tests for schedule steps with zero offerings (ensuring the flow can proceed).
- No tests covering `generalElectives` empty array vs. undefined behavior in `useRequirements`.
- No tests validating import/export of scheduled courses into UI state.
