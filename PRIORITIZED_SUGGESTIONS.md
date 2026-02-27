# DCDA Advising Wizard: Prioritized Suggestions

Date: 2026-02-27
Scope: Project evaluation with no source code modifications.

## Priority 0 (Fix Immediately)

1. Fix new-term creation overwrite risk in admin offerings editor
   - Problem: Creating a new term can save data to the previously selected Firestore document because `setTermId(...)` is async while `save(...)` uses the current hook binding.
   - Impact: Potential data loss or accidental overwrite of existing term offerings.
   - References:
     - `src/admin/components/OfferingsEditor.tsx` (term state + `handleCreateTerm`)
     - `src/admin/hooks/useFirestoreData.ts` (`save` closure bound to `docId`)
   - Suggested approach:
     - Write directly to `doc(db, 'dcda_config', newTermId)` inside `handleCreateTerm`, then switch `termId`.
     - Or, defer save until after `termId` update has propagated and hook rebinds (less robust).
   - Validation:
     - Add a test that starts on `offerings_fa26`, creates `offerings_sp27`, and verifies only `offerings_sp27` is written.

## Priority 1 (High Value, Short Horizon)

1. Make lint pass in CI/local by fixing `react-refresh/only-export-components`
   - Problem: `npm run lint` fails at `src/main.tsx`.
   - Impact: Reduces release confidence and can mask other lint issues.
   - Suggested approach:
     - Move `Root` component into a separate module and keep `main.tsx` as pure bootstrap; or adjust lint config only if architecture requires current shape.
   - Validation:
     - `npm run lint` returns exit code 0.

2. Harden Firestore write rules for anonymous analytics/submissions
   - Problem: `allow create, update: if true` for analytics enables abuse/data poisoning.
   - Impact: Integrity and cost risk in production telemetry.
   - Suggested approach:
     - Restrict writes to expected document paths and field shapes.
     - Add guardrails (types/ranges/length checks, deny unknown keys where practical).
     - Consider routing write-heavy tracking through callable/cloud function if abuse appears.
   - Validation:
     - Emulator tests for valid vs invalid payloads.

## Priority 2 (Quality and Reliability)

1. Add targeted tests for untested critical flows
   - Current signal: ~5.57% statement coverage, with 0% in admin/auth/analytics/export modules.
   - Highest-leverage areas:
     - `OfferingsEditor` create/edit/delete term+section workflows.
     - `useFirebaseAuth` whitelist enforcement.
     - `recordAnonymousSubmission` payload shape and counter updates.
     - PDF/email submission flow guards in `ReviewActionsStep`.
   - Validation:
     - Add tests for these flows and raise practical coverage floor for critical modules.

2. Improve analytics aggregation resilience
   - Problem: Unknown `degreeType` values are currently counted as `minor`.
   - Impact: Distorted admin reporting over time.
   - Suggested approach:
     - Explicitly count only known values (`major`, `minor`) and bucket others as `unknown`.
   - Validation:
     - Unit test with malformed/legacy records.

## Priority 3 (Operational Hygiene)

1. Keep generated artifacts out of review noise
   - Observation: Running build/coverage updates `public/advising-manifest.json` timestamp and creates `coverage/`.
   - Suggested approach:
     - Decide and document whether manifest timestamp-only diffs should be committed.
     - Keep coverage output ignored/untracked unless explicitly needed.

2. Stabilize schema version check behavior across environments
   - Observation: `npm run check-schema` currently exits success when remote fetch is unavailable.
   - Suggested approach:
     - In CI with network access, fail on fetch errors (or use a mirrored local source in mono-repo checks).
     - Keep local/dev fallback non-blocking if desired.

## Suggested Execution Order

1. Priority 0 fix (`OfferingsEditor` term creation write target) + regression test.
2. Lint blocker in `main.tsx`.
3. Firestore rule hardening with emulator tests.
4. Targeted test additions for admin/auth/analytics/export.
5. Analytics robustness and operational cleanup items.
