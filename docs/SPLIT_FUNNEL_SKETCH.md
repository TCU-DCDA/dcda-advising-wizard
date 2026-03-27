# Split Funnel + Course Demand — Implementation Sketch

**Date:** 2026-03-27
**Status:** Proposed (not yet implemented)

## Part A: Split Funnel by Degree Type

### Problem

The step funnel in the admin dashboard mixes major and minor students into a single lane. Three steps — intro, dcElective, daElective — are major-only, so minors skipping them shows as steep drop-offs (e.g., -59% at intro) that don't represent real abandonment. The current `trackStepVisit()` writes a flat counter per step with no degree type attached, so the data can't be split retroactively.

### Approach

Layer degree-specific counters alongside the existing aggregate counters. Render two funnel lanes (major / minor) in the admin dashboard, each with its own step order and dropoff calculations. Existing historical data is preserved as-is.

### Files Changed (3)

#### 1. `src/services/analytics.ts` — enrich `trackStepVisit`

**Current:**
```ts
export async function trackStepVisit(stepId: string): Promise<void> {
  if (isLocal) return
  try {
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    await setDoc(
      dayRef,
      { stepVisits: { [stepId]: increment(1) } },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}
```

**Proposed:**
```ts
export async function trackStepVisit(stepId: string, degreeType?: string): Promise<void> {
  if (isLocal) return
  try {
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    await setDoc(
      dayRef,
      {
        stepVisits: { [stepId]: increment(1) },                                    // preserve aggregate
        ...(degreeType && { [`stepVisits_${degreeType}`]: { [stepId]: increment(1) } }), // new
      },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}
```

Notes:
- Before the student picks major/minor (welcome, name steps), `degreeType` is `undefined` — only the aggregate counter increments.
- After selection, both aggregate and degree-specific counters increment.
- Firestore fields created: `stepVisits_major`, `stepVisits_minor` (maps, same shape as `stepVisits`).

#### 2. `src/App.tsx` — pass degree type through

**Current (line ~65):**
```ts
useEffect(() => {
  trackStepVisit(wizard.currentStep.id)
}, [wizard.currentStep.id])
```

**Proposed:**
```ts
useEffect(() => {
  trackStepVisit(wizard.currentStep.id, studentData.degreeType)
}, [wizard.currentStep.id])
```

`studentData.degreeType` is `undefined` until the name step is completed, so early shared steps naturally fall back to aggregate-only.

#### 3. `src/admin/hooks/useAnalytics.ts` + `src/admin/components/AnalyticsDashboard.tsx` — split funnel

**useAnalytics.ts changes:**

Add two new aggregation loops alongside the existing `stepTotals`:

```ts
const stepTotalsMajor: Record<string, number> = {}
const stepTotalsMinor: Record<string, number> = {}
for (const d of dailySnap.docs) {
  const majorVisits = d.data().stepVisits_major ?? {}
  for (const [stepId, count] of Object.entries(majorVisits)) {
    stepTotalsMajor[stepId] = (stepTotalsMajor[stepId] || 0) + (count as number)
  }
  const minorVisits = d.data().stepVisits_minor ?? {}
  for (const [stepId, count] of Object.entries(minorVisits)) {
    stepTotalsMinor[stepId] = (stepTotalsMinor[stepId] || 0) + (count as number)
  }
}
```

Build two funnel arrays with degree-appropriate step orders:

```ts
const majorStepOrder = [
  'welcome', 'name', 'graduation', 'intro', 'statistics', 'coding',
  'mmAuthoring', 'dcElective', 'daElective', 'generalElectives',
  'specialCredits', 'transition', 'schedule', 'reviewSummary', 'reviewActions',
]
const minorStepOrder = [
  'welcome', 'name', 'graduation', 'statistics', 'coding',
  'mmAuthoring', 'generalElectives',
  'specialCredits', 'transition', 'schedule', 'reviewSummary', 'reviewActions',
]

const stepFunnelMajor = majorStepOrder
  .filter((id) => stepTotalsMajor[id])
  .map((id) => ({ stepId: id, visits: stepTotalsMajor[id] }))

const stepFunnelMinor = minorStepOrder
  .filter((id) => stepTotalsMinor[id])
  .map((id) => ({ stepId: id, visits: stepTotalsMinor[id] }))
```

Add `stepFunnelMajor` and `stepFunnelMinor` to the `SubmissionSummary` interface and return value. Keep the existing `stepFunnel` (aggregate) for backward compatibility.

**AnalyticsDashboard.tsx changes:**

Replace the single funnel section with two side-by-side (or stacked) funnels:
- **Major funnel** — all 15 steps, dropoffs calculated within major data only
- **Minor funnel** — 12 steps (no intro, dcElective, daElective), dropoffs within minor data only

The existing aggregate funnel can be retained as a third "All Students" view or removed once the split funnels are populated.

---

## Part B: Early Course Demand Tracking

### Problem

Course demand counters currently only fire inside `recordAnonymousSubmission()`, which requires full wizard completion + export. The funnel shows 32 students reached scheduling but only 8 reached reviewActions — most demand signal is lost. The "Course Demand" section in the dashboard shows "No course demand data yet" because too few students complete the full flow.

### Goals (priority order)

1. **Scheduled courses** — what students plan to take next semester (bottleneck anticipation)
2. **Completed courses by category** — what students have taken for each requirement (historical scheduling patterns)

### Approach: Fire demand on each scheduling step

Track course selections at the point they happen rather than waiting for final export. Two new tracking functions, fired from existing step-completion handlers in `App.tsx`.

### New function in `src/services/analytics.ts`

```ts
/**
 * Track a course selection during the scheduling phase.
 * Fires per-step so we capture demand even if the student abandons before export.
 * Deduped per session to avoid double-counting on back-navigation.
 */
const trackedScheduled = new Set<string>()

export async function trackCourseDemand(
  courseCode: string,
  categoryId: string,
  degreeType?: string
): Promise<void> {
  if (isLocal) return
  const key = `${courseCode}:${categoryId}`
  if (trackedScheduled.has(key)) return  // dedupe within session
  trackedScheduled.add(key)
  try {
    const termId = getCurrentTerm()
    const demandRef = doc(db, 'dcda_analytics', 'course_demand', 'terms', termId)
    await setDoc(
      demandRef,
      {
        [`selected.${courseCode}`]: increment(1),
        [`selectedByCategory.${categoryId}.${courseCode}`]: increment(1),
        ...(degreeType && { [`selectedByDegree.${degreeType}.${courseCode}`]: increment(1) }),
      },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}
```

Similarly for completed courses picked during the history phase:

```ts
const trackedCompleted = new Set<string>()

export async function trackCourseCompleted(
  courseCode: string,
  categoryId: string,
  degreeType?: string
): Promise<void> {
  if (isLocal) return
  const key = `${courseCode}:${categoryId}`
  if (trackedCompleted.has(key)) return
  trackedCompleted.add(key)
  try {
    const termId = getCurrentTerm()
    const demandRef = doc(db, 'dcda_analytics', 'course_demand', 'terms', termId)
    await setDoc(
      demandRef,
      {
        [`completed.${courseCode}`]: increment(1),
        [`completedByCategory.${categoryId}.${courseCode}`]: increment(1),
      },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}
```

### Call sites in `src/App.tsx`

**Scheduling step** — fire `trackCourseDemand` when a student selects a course in Part 2:

```ts
// Inside the scheduling course selection handler
trackCourseDemand(courseCode, categoryId, studentData.degreeType)
```

**History step** — fire `trackCourseCompleted` when a student selects a completed course in Part 1:

```ts
// Inside handleSelectCourse (for single-select steps: intro, statistics, coding, mmAuthoring)
trackCourseCompleted(courseCode, currentStep.id, studentData.degreeType)

// Inside multi-select handlers (dcElective, daElective, generalElectives)
trackCourseCompleted(courseCode, categoryId, studentData.degreeType)
```

### Dedupe strategy

- `Set<string>` per session prevents double-counting if a student navigates back and re-selects the same course.
- Sets reset naturally on page reload (new session).
- The existing `recordAnonymousSubmission()` demand tracking can remain as a "confirmed" layer — students who complete the full flow get counted in both `selected.*` and the existing `scheduled.*` fields.

### Firestore document shape (per term)

```
dcda_analytics/course_demand/terms/{termId}
{
  // Existing (from recordAnonymousSubmission — confirmed exports only)
  scheduled: { "DCDA 30853": 2, ... },
  completed: { "ENGL 20813": 3, ... },

  // New — early tracking (all students who reach each step)
  selected: { "DCDA 30853": 5, ... },
  selectedByCategory: {
    daElective: { "DCDA 30853": 3, ... },
    coding: { "DCDA 20453": 4, ... },
  },
  selectedByDegree: {
    major: { "DCDA 30853": 3, ... },
    minor: { "DCDA 20453": 2, ... },
  },
  completedByCategory: {
    intro: { "ENGL 20813": 2, "WRIT 20303": 1, ... },
    statistics: { "DCDA 20233": 4, ... },
  },
}
```

### Dashboard updates (`AnalyticsDashboard.tsx`)

Update the Course Demand section to show:
- **Scheduled (interest):** `selected.*` counts — courses students chose during planning, sorted by count
- **Scheduled (confirmed):** existing `scheduled.*` counts — courses from completed exports
- **Completed by category:** `completedByCategory.*` — which courses students took for each requirement, useful for predicting future demand patterns

Each course row could show both interest and confirmed counts side by side so you can see the gap.

---

## Firestore Impact (both parts)

- No schema migrations — all new fields added via `setDoc` with `merge: true`.
- Part A adds `stepVisits_major` and `stepVisits_minor` maps to daily stats docs.
- Part B adds `selected`, `selectedByCategory`, `selectedByDegree`, and `completedByCategory` maps to term demand docs.
- Existing fields (`stepVisits`, `scheduled`, `completed`) continue to populate unchanged.

## Limitations

- Historical data (pre-change) cannot be split or enriched. Current sample (~50 sessions) is small enough to treat as a clean break.
- Shared steps (welcome, name) won't have degree-specific counts since `degreeType` isn't set yet.
- Early demand tracking captures interest, not commitment — dashboard labeling should make this distinction clear.
- Back-navigation dedupe uses an in-memory Set, so a page reload starts a fresh session and could double-count if the same student restarts. This is acceptable at current scale.
