# Codex Review 2-4-26

## Assessment
The app is well-structured around a wizard flow with local persistence and export tooling. Core domain logic is centralized in `src/services/` and `src/hooks/`, which is good. The highest risks are correctness issues in import and "Not yet" handling, plus time-sensitive logic hardcoded to Spring 2026. There are data-consistency gaps (flexible course categorization, special credit counting) that can lead to inaccurate plans or misleading summaries. Tests were not run.

## Findings (Ordered by Severity)
- High: Import mapping ignores DC/DA electives because it uses `getRequiredCategoryCourses` (which returns empty for elective categories). Imported completed/scheduled DC/DA electives are misclassified or dropped, driving false "unmet" requirements and wrong schedules. `src/App.tsx:438-513`.
- High: "Not yet" for DC/DA electives does not clear prior selections because `CategorySelections` uses `dcElectives/daElectives` but `handleSelectNotYet` writes to `dcElective/daElective`. Stale selections remain and are counted as completed/overflow even after "Not yet." `src/App.tsx:153-158`.
- Medium: Flexible course assignments are not honored when grouping scheduled courses for review. This can mislabel scheduled flexible courses (DCDA 40273/30970) in Review Summary/Actions. `src/components/wizard/steps/ReviewSummaryStep.tsx:184-193`, `src/components/wizard/steps/ReviewActionsStep.tsx:65-73`. There is no UI to set `courseCategories` even though it exists. `src/hooks/useStudentData.ts:104-112`.
- Medium: Semester planning logic is hardcoded to Spring 2026, which will go stale as offerings advance. `src/services/courses.ts:148-188`.
- Medium: General electives in scheduling only exclude `DCDA 40833` but not the thesis alternative `DCDA 40003`, so capstone can appear as a general elective. `src/services/courses.ts:61-64` plus `data/requirements.json`.
- Medium: General-elective unmet calculation counts all special credits, regardless of `countsAs`, which will miscount if imports include special credits assigned to non-general categories. `src/App.tsx:307-321`.
- Medium: CSV export/import drops the `includeSummer` preference, so the plan can change after re-import. `src/services/export.ts:29-63`, `src/services/export.ts:84+`.
- Low: PDF preview "Close" button does not revoke the blob URL; repeated previews can leak memory. `src/components/wizard/steps/ReviewActionsStep.tsx:270-271`.
- Low: Requirements comparison table is hardcoded and can drift from `requirements.json`. `src/components/wizard/steps/NameStep.tsx:96-139`.
- Low: `useWizardFlow` does not clamp `currentStepIndex` when the step list changes (degree type/unmet categories), which can leave navigation in a weird state if steps shrink. `src/hooks/useWizardFlow.ts`.

## Suggested Actionable Steps (Priority Order)
1. Fix "Not yet" for DC/DA electives to clear `dcElectives/daElectives`, then add a regression test for toggling "Haven't taken any" after selecting a course.
2. Correct import mapping for DC/DA electives by using `getCoursesForCategory` (or a dedicated helper that considers electives and flexible course assignments). Verify both completed and scheduled import paths.
3. Remove Spring 2026 hardcoding: derive the start term for `getSemestersUntilGraduation` from `offerings.term` (or current date) and either delete `shouldTakeCapstoneNow` or make it term-aware.
4. Align general-elective accounting with `countsAs` for special credits and update CSV export/import to include `includeSummer`.
5. Decide how flexible courses should be categorized in the UI: either add a selector (when a flexible course is chosen) or explicitly document/import the category and use it consistently in Review Summary/Actions.
6. Expand tests around import, general electives, flexible course assignment, and semester-plan generation so future term updates do not regress plan logic.

## Testing Gaps
- CSV import of DC/DA electives and scheduled electives (`src/App.tsx:438-513`).
- "Not yet" toggling after a DC/DA elective has been selected (`src/App.tsx:153-158`).
- Flexible course assignment appearing in Review Summary/Actions (`src/components/wizard/steps/ReviewSummaryStep.tsx`, `src/components/wizard/steps/ReviewActionsStep.tsx`).
- `includeSummer` persistence through CSV export/import (`src/services/export.ts`).
- `generalElectives` empty array vs. fallback inference in `useRequirements` (`src/hooks/useRequirements.ts`).
- Term-base correctness for semester plans as offerings change (`src/services/courses.ts`).
