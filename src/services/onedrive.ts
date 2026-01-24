/**
 * OneDrive Storage Service
 *
 * Saves advising records to the user's OneDrive via Microsoft Graph API.
 * Records are stored in a DCDA_Advising_Records folder for easy organization.
 */

import { Client } from '@microsoft/microsoft-graph-client'
import { getAccessToken, getCurrentAccount } from './azure'
import type { StudentData } from '@/types'

// Folder name in OneDrive where records are stored
const RECORDS_FOLDER = 'DCDA_Advising_Records'

/**
 * Create a Microsoft Graph client with the current access token
 */
async function getGraphClient(): Promise<Client> {
  const accessToken = await getAccessToken()

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}

/**
 * Ensure the DCDA records folder exists in OneDrive
 */
async function ensureRecordsFolder(client: Client): Promise<string> {
  try {
    // Try to get the folder
    const folder = await client.api(`/me/drive/root:/${RECORDS_FOLDER}`).get()
    return folder.id
  } catch {
    // Folder doesn't exist, create it
    const newFolder = await client.api('/me/drive/root/children').post({
      name: RECORDS_FOLDER,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail',
    })
    return newFolder.id
  }
}

/**
 * Generate a structured record for program assessment
 */
export interface AdvisingRecord {
  version: string
  timestamp: string
  advisor?: string
  student: {
    name: string
    degreeType: 'major' | 'minor' | null
    expectedGraduation: string | null
  }
  coursework: {
    completed: string[]
    scheduled: string[]
    specialCredits: Array<{
      type: string
      description: string
      countsAs: string
    }>
  }
  notes?: string
  metadata: {
    appVersion: string
    savedFrom: string
  }
}

/**
 * Convert StudentData to an AdvisingRecord
 */
function toAdvisingRecord(studentData: StudentData): AdvisingRecord {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    student: {
      name: studentData.name,
      degreeType: studentData.degreeType,
      expectedGraduation: studentData.expectedGraduation,
    },
    coursework: {
      completed: studentData.completedCourses,
      scheduled: studentData.scheduledCourses,
      specialCredits: studentData.specialCredits.map((c) => ({
        type: c.type,
        description: c.description,
        countsAs: c.countsAs,
      })),
    },
    notes: studentData.notes,
    metadata: {
      appVersion: '1.0.0',
      savedFrom: window.location.origin,
    },
  }
}

/**
 * Generate filename for the advising record
 */
function generateFilename(studentData: StudentData, format: 'json' | 'csv'): string {
  const date = new Date().toISOString().split('T')[0]
  const safeName = (studentData.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_')
  return `${safeName}_${date}.${format}`
}

/**
 * Convert StudentData to CSV format (same as local export)
 */
function toCSVContent(studentData: StudentData): string {
  const lines: string[] = []

  lines.push('DCDA_MOBILE_EXPORT,v1')
  lines.push(`name,${escapeCSV(studentData.name)}`)
  lines.push(`degreeType,${studentData.degreeType || ''}`)
  lines.push(`expectedGraduation,${studentData.expectedGraduation || ''}`)
  lines.push(`completedCourses,${studentData.completedCourses.join(';')}`)
  lines.push(`scheduledCourses,${studentData.scheduledCourses.join(';')}`)

  if (studentData.specialCredits.length > 0) {
    const creditsData = studentData.specialCredits.map((c) => ({
      type: c.type,
      description: c.description,
      countsAs: c.countsAs,
    }))
    lines.push(`specialCredits,${escapeCSV(JSON.stringify(creditsData))}`)
  }

  if (studentData.courseCategories && Object.keys(studentData.courseCategories).length > 0) {
    lines.push(`courseCategories,${escapeCSV(JSON.stringify(studentData.courseCategories))}`)
  }

  if (studentData.generalElectives && studentData.generalElectives.length > 0) {
    lines.push(`generalElectives,${studentData.generalElectives.join(';')}`)
  }

  if (studentData.notes) {
    lines.push(`notes,${escapeCSV(studentData.notes)}`)
  }

  return lines.join('\n')
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export interface SaveResult {
  success: boolean
  filename: string
  webUrl?: string
  error?: string
}

/**
 * Save student data to OneDrive as JSON (for program assessment)
 */
export async function saveToOneDrive(studentData: StudentData): Promise<SaveResult> {
  const filename = generateFilename(studentData, 'json')

  try {
    const client = await getGraphClient()
    await ensureRecordsFolder(client)

    const record = toAdvisingRecord(studentData)
    const content = JSON.stringify(record, null, 2)

    const response = await client
      .api(`/me/drive/root:/${RECORDS_FOLDER}/${filename}:/content`)
      .put(content)

    return {
      success: true,
      filename,
      webUrl: response.webUrl,
    }
  } catch (error) {
    console.error('Failed to save to OneDrive:', error)
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Save student data to OneDrive as CSV (compatible with local export format)
 */
export async function saveCSVToOneDrive(studentData: StudentData): Promise<SaveResult> {
  const filename = generateFilename(studentData, 'csv')

  try {
    const client = await getGraphClient()
    await ensureRecordsFolder(client)

    const content = toCSVContent(studentData)

    const response = await client
      .api(`/me/drive/root:/${RECORDS_FOLDER}/${filename}:/content`)
      .put(content)

    return {
      success: true,
      filename,
      webUrl: response.webUrl,
    }
  } catch (error) {
    console.error('Failed to save CSV to OneDrive:', error)
    return {
      success: false,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the current user's display name (for advisor identification)
 */
export async function getSignedInUserName(): Promise<string | null> {
  try {
    const account = await getCurrentAccount()
    return account?.name || account?.username || null
  } catch {
    return null
  }
}

/**
 * List existing advising records in OneDrive
 */
export async function listRecords(): Promise<Array<{ name: string; lastModified: string; webUrl: string }>> {
  try {
    const client = await getGraphClient()
    const response = await client.api(`/me/drive/root:/${RECORDS_FOLDER}:/children`).get()

    return response.value.map((item: { name: string; lastModifiedDateTime: string; webUrl: string }) => ({
      name: item.name,
      lastModified: item.lastModifiedDateTime,
      webUrl: item.webUrl,
    }))
  } catch {
    return []
  }
}
