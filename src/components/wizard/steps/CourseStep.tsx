import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RequirementCategoryId } from '@/types'
import { getCoursesForCategory, isMutuallyExcluded } from '@/services/courses'

interface CourseStepProps {
  categoryId: RequirementCategoryId
  title: string
  hint?: string
  selectedCourse: string | null // For single-select categories
  selectedCourses: string[] // For multi-select (general electives)
  allSelectedCourses: string[] // All courses selected so far (for exclusions)
  completedRequiredCourses?: string[] // Courses used to fulfill required categories (for elective filtering)
  multiSelect?: boolean
  onSelectCourse: (courseCode: string) => void
  onDeselectCourse: (courseCode: string) => void
  onSelectNotYet: () => void
  isNotYetSelected: boolean
  degreeType: 'major' | 'minor'
}

export function CourseStep({
  categoryId,
  title,
  hint,
  selectedCourse,
  selectedCourses,
  allSelectedCourses,
  completedRequiredCourses = [],
  multiSelect = false,
  onSelectCourse,
  onDeselectCourse,
  onSelectNotYet,
  isNotYetSelected,
  degreeType,
}: CourseStepProps) {
  // Get courses for this category, excluding already selected courses
  const categoryCourses = getCoursesForCategory(categoryId, degreeType, completedRequiredCourses)
  const availableCourses = categoryCourses.filter(
    (course) =>
      !allSelectedCourses.includes(course.code) ||
      selectedCourse === course.code ||
      selectedCourses.includes(course.code)
  )

  // Filter out mutually excluded courses
  const filteredCourses = availableCourses.filter(
    (course) =>
      !isMutuallyExcluded(course.code, allSelectedCourses.filter((c) => c !== course.code))
  )

  if (multiSelect) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>

        <div className="space-y-3">
          {filteredCourses.map((course) => {
            const isSelected = selectedCourses.includes(course.code)
            return (
              <label
                key={course.code}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onSelectCourse(course.code)
                    } else {
                      onDeselectCourse(course.code)
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="font-semibold">{course.code}</div>
                  <div className="text-sm text-muted-foreground">{course.title}</div>
                </div>
              </label>
            )
          })}
        </div>

        {filteredCourses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No additional courses available.
          </p>
        )}
      </div>
    )
  }

  // Single select with radio buttons
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {!hint && (
          <p className="text-sm text-muted-foreground">
            Select the course you've completed, or "Not yet" if still needed.
          </p>
        )}
      </div>

      <RadioGroup
        value={isNotYetSelected ? 'not-yet' : (selectedCourse || '')}
        onValueChange={(value) => {
          if (value === 'not-yet') {
            onSelectNotYet()
          } else {
            onSelectCourse(value)
          }
        }}
      >
        {filteredCourses.map((course) => (
          <label
            key={course.code}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedCourse === course.code && !isNotYetSelected
                ? "border-primary bg-accent"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <RadioGroupItem value={course.code} />
            <div className="flex-1">
              <div className="font-semibold">{course.code}</div>
              <div className="text-sm text-muted-foreground">{course.title}</div>
            </div>
          </label>
        ))}

        {/* Not Yet Option */}
        <label
          className={cn(
            "flex items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            isNotYetSelected
              ? "border-primary bg-accent text-primary"
              : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          )}
        >
          <RadioGroupItem value="not-yet" className="sr-only" />
          <span className="text-sm font-medium">Not yet completed</span>
        </label>
      </RadioGroup>
    </div>
  )
}
