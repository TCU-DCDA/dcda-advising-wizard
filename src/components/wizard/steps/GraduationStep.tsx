import { cn } from '@/lib/utils'

interface GraduationStepProps {
  value: string | null
  onChange: (graduation: string) => void
}

// Generate next 8 semesters starting from current date
function getNextSemesters(): { semester: string; year: number; value: string }[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  const semesters: { semester: string; year: number; value: string }[] = []

  // Determine starting semester
  // Fall = Aug-Dec, Spring = Jan-May, Summer = Jun-Jul
  let startYear = currentYear
  let startSemester: 'Spring' | 'Fall'

  if (currentMonth >= 7) {
    // Aug-Dec: Start with Spring next year
    startSemester = 'Spring'
    startYear = currentYear + 1
  } else if (currentMonth >= 0 && currentMonth < 5) {
    // Jan-May: Start with Fall same year
    startSemester = 'Fall'
  } else {
    // Jun-Jul: Start with Fall same year
    startSemester = 'Fall'
  }

  let year = startYear
  let semester = startSemester

  for (let i = 0; i < 8; i++) {
    semesters.push({
      semester,
      year,
      value: `${semester} ${year}`,
    })

    // Alternate semesters
    if (semester === 'Spring') {
      semester = 'Fall'
    } else {
      semester = 'Spring'
      year++
    }
  }

  return semesters
}

export function GraduationStep({ value, onChange }: GraduationStepProps) {
  const semesters = getNextSemesters()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">When do you expect to graduate?</h2>
        <p className="text-sm text-muted-foreground">
          Select your target graduation semester.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {semesters.map((sem) => (
          <button
            key={sem.value}
            onClick={() => onChange(sem.value)}
            className={cn(
              "p-4 rounded-xl border-2 text-center transition-all",
              value === sem.value
                ? "border-primary bg-accent"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="font-semibold">{sem.semester}</div>
            <div className="text-sm text-muted-foreground">{sem.year}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
