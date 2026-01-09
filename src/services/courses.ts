import type { Course, CourseSection, RequirementCategoryId } from '@/types'
import coursesData from '../../data/courses.json'
import offeringsData from '../../data/offerings-sp26.json'
import requirementsData from '../../data/requirements.json'

const courses = coursesData as Course[]
const offerings = offeringsData as { term: string; offeredCodes: string[]; sections: CourseSection[] }
const requirements = requirementsData as typeof requirementsData

// Get all courses for a specific requirement category
export function getCoursesForCategory(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major',
  completedRequiredCourses: string[] = []
): Course[] {
  const degree = requirements[degreeType]

  // Check required categories first
  const requiredCat = degree.required.categories.find((c) => c.id === categoryId)
  if (requiredCat?.courses) {
    return requiredCat.courses
      .map((code) => courses.find((c) => c.code === code))
      .filter((c): c is Course => c !== undefined)
  }

  // Check elective categories (major only)
  if (degreeType === 'major' && 'electives' in degree && degree.electives) {
    const electiveCat = degree.electives.categories.find((c: { id: string }) => c.id === categoryId)
    if (electiveCat?.category) {
      // Get all courses in this category
      // Only exclude courses that are ACTUALLY being used to fulfill required categories
      // (not just courses that COULD fulfill required categories)
      return courses.filter(
        (c) => c.category === electiveCat.category && !completedRequiredCourses.includes(c.code)
      )
    }
  }

  // General electives - return all courses
  if (categoryId === 'generalElectives') {
    return courses
  }

  return []
}

// Get courses offered next semester for a specific category
export function getOfferedCoursesForCategory(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major',
  excludeCourses: string[] = [],
  completedRequiredCourses: string[] = []
): Course[] {
  const categoryCourses = getCoursesForCategory(categoryId, degreeType, completedRequiredCourses)

  return categoryCourses.filter(
    (course) =>
      offerings.offeredCodes.includes(course.code) &&
      !excludeCourses.includes(course.code)
  )
}

// Get all courses not yet selected (for general electives multi-select)
export function getUnselectedCourses(selectedCourses: string[]): Course[] {
  return courses.filter((c) => !selectedCourses.includes(c.code))
}

// Get section info for a course
export function getSectionsForCourse(courseCode: string): CourseSection[] {
  return offerings.sections.filter((s) => s.code === courseCode)
}

// Check if a course is offered next semester
export function isCourseOffered(courseCode: string): boolean {
  return offerings.offeredCodes.includes(courseCode)
}

// Get course by code
export function getCourseByCode(code: string): Course | undefined {
  return courses.find((c) => c.code === code)
}

// Get all courses
export function getAllCourses(): Course[] {
  return courses
}

// Get term info
export function getNextSemesterTerm(): string {
  return offerings.term
}

// Check enrollment warnings for a course
export function getEnrollmentWarning(courseCode: string): string | undefined {
  const prefix = courseCode.split(' ')[0]
  const warning = requirements.enrollmentWarnings[prefix as keyof typeof requirements.enrollmentWarnings]
  if (warning?.courses.includes(courseCode)) {
    return warning.message
  }
  return undefined
}

// Check if a course is blocked by a mutually exclusive rule
export function isMutuallyExcluded(courseCode: string, selectedCourses: string[]): boolean {
  for (const rule of requirements.mutuallyExclusive) {
    if (rule.courses.includes(courseCode)) {
      const otherCourse = rule.courses.find(c => c !== courseCode && selectedCourses.includes(c))
      if (otherCourse) {
        return true
      }
    }
  }
  return false
}

// Parse expected graduation to determine capstone semester
export function getCapstoneTargetSemester(expectedGraduation: string | null): string | null {
  if (!expectedGraduation) return null

  const match = expectedGraduation.match(/(Spring|Fall|Summer)\s+(\d{4})/)
  if (!match) return null

  const year = parseInt(match[2])
  // Capstone is only offered in Spring
  return `Spring ${year}`
}

// Check if capstone should be taken this semester (Spring 2026)
export function shouldTakeCapstoneNow(expectedGraduation: string | null): boolean {
  const target = getCapstoneTargetSemester(expectedGraduation)
  return target === 'Spring 2026'
}

// Category display names
export const categoryNames: Record<RequirementCategoryId, string> = {
  intro: 'Intro/Req\'d English',
  statistics: 'Statistics',
  coding: 'Coding',
  mmAuthoring: 'MM Authoring',
  capstone: 'Capstone',
  dcElective: 'DC Elective',
  daElective: 'DA Elective',
  generalElectives: 'General Electives',
}
