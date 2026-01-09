import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { RequirementCategoryId } from '@/types'
import { getOfferedCoursesForCategory, categoryNames, getEnrollmentWarning, getSectionsForCourse } from '@/services/courses'
import { AlertTriangle } from 'lucide-react'

interface ScheduleStepProps {
  categoryId: RequirementCategoryId
  selectedCourse: string | null
  allSelectedCourses: string[]
  allScheduledCourses: string[]
  completedRequiredCourses: string[]
  onSelectCourse: (courseCode: string) => void
  onSkip: () => void
  isSkipped: boolean
  degreeType: 'major' | 'minor'
}

export function ScheduleStep({
  categoryId,
  selectedCourse,
  allSelectedCourses,
  allScheduledCourses,
  completedRequiredCourses,
  onSelectCourse,
  onSkip,
  isSkipped,
  degreeType,
}: ScheduleStepProps) {
  // Get courses offered next semester for this category
  const excludeCourses = [...allSelectedCourses, ...allScheduledCourses.filter((c) => c !== selectedCourse)]
  const availableCourses = getOfferedCoursesForCategory(categoryId, degreeType, excludeCourses, completedRequiredCourses)

  const categoryName = categoryNames[categoryId]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Which {categoryName} course for Spring 2026?
        </h2>
        <p className="text-sm text-muted-foreground">
          These courses are offered next semester and fulfill your {categoryName} requirement.
        </p>
      </div>

      {availableCourses.length > 0 ? (
        <RadioGroup
          value={isSkipped ? 'skip' : (selectedCourse || '')}
          onValueChange={(value) => {
            if (value === 'skip') {
              onSkip()
            } else {
              onSelectCourse(value)
            }
          }}
        >
          {availableCourses.map((course) => {
            const warning = getEnrollmentWarning(course.code)
            const sections = getSectionsForCourse(course.code)
            const sectionInfo = sections.length > 0 ? sections[0] : null

            return (
              <label
                key={course.code}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  selectedCourse === course.code && !isSkipped
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={course.code} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold">{course.code}</div>
                  <div className="text-sm text-muted-foreground">{course.title}</div>
                  {sectionInfo && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {sectionInfo.schedule} • {sectionInfo.modality}
                    </div>
                  )}
                  {warning && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                      <AlertTriangle className="size-3.5" />
                      <span>{warning}</span>
                    </div>
                  )}
                </div>
              </label>
            )
          })}

          {/* Skip Option */}
          <label
            className={cn(
              "flex items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              isSkipped
                ? "border-primary bg-accent text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            )}
          >
            <RadioGroupItem value="skip" className="sr-only" />
            <span className="text-sm font-medium">Skip for now</span>
          </label>
        </RadioGroup>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            No courses for this category are offered in Spring 2026.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll need to take this requirement in a future semester.
          </p>
        </div>
      )}
    </div>
  )
}
