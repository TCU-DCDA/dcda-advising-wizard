import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/services/firebase'

export interface DailyStats {
  date: string
  wizardStarts: number
  wizardCompletions: number
  uniqueSessions: number
  stepDropoffs: Record<string, number>
  hourlyStarts: Record<string, number>
  exports: Record<string, number>
}

export interface CourseDemand {
  term: string
  scheduled: Record<string, number>
  completed: Record<string, number>
}

export interface SubmissionInsights {
  summerOptInCount: number
  hasNotesCount: number
  avgDegreeProgress: number
  specialCreditsCount: number
}

export interface StepFunnel {
  stepId: string
  visits: number
}

export interface SubmissionSummary {
  totalSubmissions: number
  totalUniqueSessions: number
  byDegreeType: { major: number; minor: number }
  byGraduation: Record<string, number>
  recentDays: DailyStats[]
  courseDemand: CourseDemand | null
  insights: SubmissionInsights
  stepFunnel: StepFunnel[]
  stepFunnelMajor: StepFunnel[]
  stepFunnelMinor: StepFunnel[]
  peakHours: Record<string, number>
  exportCounts: Record<string, number>
}

export function useAnalytics() {
  const [summary, setSummary] = useState<SubmissionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch daily stats (all days, sort client-side, take last 30)
      const dailyRef = collection(db, 'dcda_analytics', 'daily', 'stats')
      const dailySnap = await getDocs(dailyRef)
      const allDays: DailyStats[] = dailySnap.docs
        .map((d) => ({
          date: d.id,
          wizardStarts: d.data().wizardStarts ?? 0,
          wizardCompletions: d.data().wizardCompletions ?? 0,
          uniqueSessions: Array.isArray(d.data().sessions) ? d.data().sessions.length : 0,
          stepDropoffs: d.data().stepDropoffs ?? {},
          hourlyStarts: d.data().hourlyStarts ?? {},
          exports: d.data().exports ?? {},
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
      const recentDays = allDays.slice(0, 30)

      // Aggregate peak hours, export counts, and unique sessions across all days
      const peakHours: Record<string, number> = {}
      const exportCounts: Record<string, number> = {}
      let totalUniqueSessions = 0
      for (const day of allDays) {
        totalUniqueSessions += day.uniqueSessions
        for (const [hour, count] of Object.entries(day.hourlyStarts)) {
          peakHours[hour] = (peakHours[hour] || 0) + count
        }
        for (const [method, count] of Object.entries(day.exports)) {
          exportCounts[method] = (exportCounts[method] || 0) + count
        }
      }

      // Aggregate step funnel from stepVisits across all days
      const stepTotals: Record<string, number> = {}
      const stepTotalsMajor: Record<string, number> = {}
      const stepTotalsMinor: Record<string, number> = {}
      for (const d of dailySnap.docs) {
        const data = d.data()
        const stepVisits = data.stepVisits ?? {}
        for (const [stepId, count] of Object.entries(stepVisits)) {
          stepTotals[stepId] = (stepTotals[stepId] || 0) + (count as number)
        }
        const majorVisits = data.stepVisits_major ?? {}
        for (const [stepId, count] of Object.entries(majorVisits)) {
          stepTotalsMajor[stepId] = (stepTotalsMajor[stepId] || 0) + (count as number)
        }
        const minorVisits = data.stepVisits_minor ?? {}
        for (const [stepId, count] of Object.entries(minorVisits)) {
          stepTotalsMinor[stepId] = (stepTotalsMinor[stepId] || 0) + (count as number)
        }
      }

      // Fetch submissions for aggregate stats
      const subsRef = collection(db, 'dcda_submissions')
      const subsSnap = await getDocs(subsRef)
      let major = 0
      let minor = 0
      let summerOptInCount = 0
      let hasNotesCount = 0
      let specialCreditsCount = 0
      let totalProgress = 0
      const byGraduation: Record<string, number> = {}
      subsSnap.docs.forEach((d) => {
        const data = d.data()
        if (data.degreeType === 'major') major++
        else minor++
        const grad = data.expectedGraduation || 'Unknown'
        byGraduation[grad] = (byGraduation[grad] || 0) + 1
        // Phase 1 enriched fields
        if (data.includeSummer) summerOptInCount++
        if (data.hasNotes) hasNotesCount++
        if (data.specialCreditCount > 0) specialCreditsCount++
        if (typeof data.degreeProgressPct === 'number') totalProgress += data.degreeProgressPct
      })

      // Fetch course demand for current term
      const termId = getNextTerm()
      let courseDemand: CourseDemand | null = null
      try {
        const demandRef = collection(db, 'dcda_analytics', 'course_demand', 'terms')
        const demandSnap = await getDocs(demandRef)
        const termDoc = demandSnap.docs.find((d) => d.id === termId)
        if (termDoc) {
          courseDemand = {
            term: termId,
            scheduled: termDoc.data().scheduled ?? {},
            completed: termDoc.data().completed ?? {},
          }
        }
      } catch {
        // Course demand collection may not exist yet
      }

      // Build ordered step funnels — aggregate + split by degree type
      const stepOrder = [
        'welcome', 'name', 'graduation', 'intro', 'statistics', 'coding',
        'mmAuthoring', 'dcElective', 'daElective', 'generalElectives',
        'specialCredits', 'transition', 'schedule', 'reviewSummary', 'reviewActions',
      ]
      const minorStepOrder = [
        'welcome', 'name', 'graduation', 'statistics', 'coding',
        'mmAuthoring', 'generalElectives',
        'specialCredits', 'transition', 'schedule', 'reviewSummary', 'reviewActions',
      ]
      const stepFunnel: StepFunnel[] = stepOrder
        .filter((id) => stepTotals[id])
        .map((id) => ({ stepId: id, visits: stepTotals[id] }))
      const stepFunnelMajor: StepFunnel[] = stepOrder
        .filter((id) => stepTotalsMajor[id])
        .map((id) => ({ stepId: id, visits: stepTotalsMajor[id] }))
      const stepFunnelMinor: StepFunnel[] = minorStepOrder
        .filter((id) => stepTotalsMinor[id])
        .map((id) => ({ stepId: id, visits: stepTotalsMinor[id] }))

      const total = subsSnap.size

      setSummary({
        totalSubmissions: total,
        totalUniqueSessions,
        byDegreeType: { major, minor },
        byGraduation,
        recentDays: recentDays.reverse(),
        courseDemand,
        insights: {
          summerOptInCount,
          hasNotesCount,
          avgDegreeProgress: total > 0 ? Math.round(totalProgress / total) : 0,
          specialCreditsCount,
        },
        stepFunnel,
        stepFunnelMajor,
        stepFunnelMinor,
        peakHours,
        exportCounts,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, loading, error, refresh }
}

function getNextTerm(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const yy = (y: number) => y.toString().slice(-2)
  if (month >= 8) return `sp${yy(year + 1)}`
  return `fa${yy(year)}`
}
