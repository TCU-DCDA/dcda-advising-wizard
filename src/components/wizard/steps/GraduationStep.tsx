import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import { getNextSemesterTerm } from '@/services/courses'

interface GraduationStepProps {
  value: string | null
  onChange: (graduation: string) => void
}

// Generate next semesters starting from the current offering term
function getNextSemesters(): { semester: string; year: number; value: string }[] {
  const currentTerm = getNextSemesterTerm()
  const parts = currentTerm.split(' ')
  
  // Default fallback if parse fails
  let year = new Date().getFullYear()
  let semester: 'Spring' | 'Summer' | 'Fall' = 'Spring'

  if (parts.length === 2) {
    semester = parts[0] as 'Spring' | 'Summer' | 'Fall'
    year = parseInt(parts[1])
  }

  const semesters: { semester: string; year: number; value: string }[] = []

  // Generate 3 years worth of terms (3 * 3 = 9 terms)
  for (let i = 0; i < 9; i++) {
    semesters.push({
      semester,
      year,
      value: `${semester} ${year}`,
    })

    // Cycle: Spring -> Summer -> Fall
    if (semester === 'Spring') {
      semester = 'Summer'
    } else if (semester === 'Summer') {
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

      {/* Capstone info note */}
      <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Capstone:</strong> The DCDA Capstone course will be automatically assigned to the Spring semester of your graduation year.
            </p>
            <p>
              <strong>Honors Thesis:</strong> Students interested in completing an honors thesis in lieu of the capstone should speak with their advisor about available options.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
