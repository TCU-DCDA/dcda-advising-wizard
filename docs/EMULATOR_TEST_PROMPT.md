# Emulator Test Prompt for Claude Code (VS Code)

Copy everything below the line into Claude Code in VS Code.

---

## Context

I'm testing a change to the DCDA advising wizard's admin analytics. The change splits the step funnel by degree type (major vs minor) so dropoff percentages reflect real abandonment rather than step-skipping noise from the major/minor branching.

### What was changed (already in the working tree — do NOT modify these files)

1. **`src/services/analytics.ts`** — `trackStepVisit(stepId, degreeType?)` now writes to `stepVisits_major` or `stepVisits_minor` alongside the existing aggregate `stepVisits` counter.

2. **`src/App.tsx`** (line ~65) — passes `studentData.degreeType ?? undefined` as the second argument to `trackStepVisit`.

3. **`src/admin/hooks/useAnalytics.ts`** — aggregates `stepVisits_major` and `stepVisits_minor` from Firestore daily docs. Builds `stepFunnelMajor` (all 15 steps) and `stepFunnelMinor` (12 steps, skipping intro/dcElective/daElective). Both added to the `SubmissionSummary` interface.

4. **`src/admin/components/AnalyticsDashboard.tsx`** — extracted a `FunnelChart` helper component. Renders two side-by-side funnels (blue for major, violet for minor) when split data exists. Falls back to the original aggregate funnel for pre-split historical data.

### The problem to solve

`trackStepVisit` has an `isLocal` guard (line 71 of `analytics.ts`) that returns early on localhost, so the Firebase emulator won't receive any step visit data when walking through the wizard locally. I need to bypass this for the emulator test without removing the guard permanently.

### What I need you to do

1. **Check if `src/services/firebase.ts` already has a `connectFirestoreEmulator` call.** If not, add one that activates when running on localhost (e.g., behind an env var like `VITE_USE_EMULATOR=true` or by detecting localhost). This should point to `127.0.0.1:8080`.

2. **Temporarily bypass the `isLocal` guard in `trackStepVisit`** so analytics writes go to the emulated Firestore. Preferred approach: check for an env var (e.g., `VITE_USE_EMULATOR`) that, when set, allows tracking even on localhost. Do NOT remove the `isLocal` guard — it must remain for normal local dev.

3. **Build and run the emulator test:**
   - `npm run build`
   - `firebase emulators:start`
   - Walk through the wizard at `localhost:5003` (or whatever port hosting picks) once as a **major** and once as a **minor** — just get past the `name` step where `degreeType` is set, then proceed through a few more steps.
   - Open the Firestore emulator UI at `localhost:4000/firestore` and verify that the daily stats document contains `stepVisits`, `stepVisits_major`, and `stepVisits_minor` maps.
   - Open the admin panel (`localhost:5003/admin`) and verify the Step Funnel section renders two lanes (Major / Minor) once both data sets exist.

4. **After verifying, revert the `isLocal` bypass** so it's not in the production code. The `connectFirestoreEmulator` setup can stay if it's properly gated behind localhost/env detection.

5. **Do NOT deploy.** Do NOT push. Do NOT commit. Just report results.

### Important constraints

- Make no assumptions. Ask questions if anything is unclear.
- No code changes beyond what's described above (emulator connection + isLocal bypass for testing).
- The sketch document is at `docs/SPLIT_FUNNEL_SKETCH.md` if you need full context on the design.
