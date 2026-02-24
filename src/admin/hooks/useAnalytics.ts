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
  stepDropoffs: Record<string, number>
}

export interface CourseDemand {
  term: string
  scheduled: Record<string, number>
  completed: Record<string, number>
}

export interface SubmissionSummary {
  totalSubmissions: number
  byDegreeType: { major: number; minor: number }
  byGraduation: Record<string, number>
  recentDays: DailyStats[]
  courseDemand: CourseDemand | null
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
      const recentDays: DailyStats[] = dailySnap.docs
        .map((d) => ({
          date: d.id,
          wizardStarts: d.data().wizardStarts ?? 0,
          wizardCompletions: d.data().wizardCompletions ?? 0,
          stepDropoffs: d.data().stepDropoffs ?? {},
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30)

      // Fetch submissions for aggregate stats
      const subsRef = collection(db, 'dcda_submissions')
      const subsSnap = await getDocs(subsRef)
      let major = 0
      let minor = 0
      const byGraduation: Record<string, number> = {}
      subsSnap.docs.forEach((d) => {
        const data = d.data()
        if (data.degreeType === 'major') major++
        else minor++
        const grad = data.expectedGraduation || 'Unknown'
        byGraduation[grad] = (byGraduation[grad] || 0) + 1
      })

      // Fetch course demand for current term
      const termId = getCurrentTerm()
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

      setSummary({
        totalSubmissions: subsSnap.size,
        byDegreeType: { major, minor },
        byGraduation,
        recentDays: recentDays.reverse(),
        courseDemand,
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

function getCurrentTerm(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear().toString().slice(-2)
  if (month >= 8) return `fa${year}`
  if (month >= 5) return `su${year}`
  return `sp${year}`
}
