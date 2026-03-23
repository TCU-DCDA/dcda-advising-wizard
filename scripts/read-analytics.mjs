#!/usr/bin/env node

/**
 * Read DCDA analytics data from Firestore.
 *
 * Usage:
 *   node scripts/read-analytics.mjs                # full summary
 *   node scripts/read-analytics.mjs --days 7       # last 7 days only
 *   node scripts/read-analytics.mjs --raw           # dump raw documents
 *
 * Requires: firebase-admin (uses Application Default Credentials)
 * Run: gcloud auth application-default login   (if not already authenticated)
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    days: { type: 'string', short: 'd' },
    raw: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(`Read DCDA analytics from Firestore.

Usage:
  node scripts/read-analytics.mjs                Full summary
  node scripts/read-analytics.mjs --days 7       Last 7 days
  node scripts/read-analytics.mjs --raw          Raw document dump`)
  process.exit(0)
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
})

const db = getFirestore()

// ── Helpers ──────────────────────────────────────────────────────────

function daysAgoId(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function printTable(rows, headers) {
  if (rows.length === 0) return console.log('  (none)')
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length))
  )
  const sep = widths.map((w) => '─'.repeat(w + 2)).join('┼')
  const fmt = (row) => row.map((c, i) => String(c).padEnd(widths[i])).join(' │ ')
  console.log('  ' + fmt(headers))
  console.log('  ' + sep)
  rows.forEach((r) => console.log('  ' + fmt(r)))
}

// ── Read data ────────────────────────────────────────────────────────

async function main() {
  const daysLimit = values.days ? parseInt(values.days) : null
  const cutoff = daysLimit ? daysAgoId(daysLimit) : null

  // Daily stats
  const statsRef = db.collection('dcda_analytics').doc('daily').collection('stats')
  let query = statsRef.orderBy('__name__')
  if (cutoff) query = query.where('__name__', '>=', cutoff)
  const statsSnap = await query.get()

  if (statsSnap.empty) {
    console.log('\nNo analytics data found.')
    return
  }

  const days = statsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  if (values.raw) {
    console.log('\n=== Raw daily stats ===\n')
    for (const day of days) {
      console.log(`── ${day.id} ──`)
      console.log(JSON.stringify(day, null, 2))
      console.log()
    }
    return
  }

  // ── Summary ──────────────────────────────────────────────────────

  const range = daysLimit ? `last ${daysLimit} days` : 'all time'
  console.log(`\n=== DCDA Analytics Summary (${range}) ===\n`)

  // Totals
  let totalStarts = 0
  let totalCompletions = 0
  let totalUniqueSessions = 0
  const exportTotals = {}
  const hourlyTotals = {}

  for (const day of days) {
    totalStarts += day.wizardStarts || 0
    totalCompletions += day.wizardCompletions || 0
    totalUniqueSessions += Array.isArray(day.sessions) ? day.sessions.length : 0
    for (const [method, count] of Object.entries(day.exports || {})) {
      exportTotals[method] = (exportTotals[method] || 0) + count
    }
    for (const [hour, count] of Object.entries(day.hourlyStarts || {})) {
      hourlyTotals[hour] = (hourlyTotals[hour] || 0) + count
    }
  }

  console.log(`  Days tracked:        ${days.length}`)
  console.log(`  Wizard starts:       ${totalStarts}`)
  console.log(`  Unique sessions:     ${totalUniqueSessions || '— (tracking starts now)'}`)
  console.log(`  Wizard completions:  ${totalCompletions}`)
  console.log(`  Completion rate:     ${totalStarts ? Math.round((totalCompletions / totalStarts) * 100) : 0}%`)
  console.log()

  // Export methods
  console.log('Export Methods:')
  const exportRows = Object.entries(exportTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([method, count]) => [method, count])
  printTable(exportRows, ['Method', 'Count'])
  console.log()

  // Daily breakdown
  console.log('Daily Breakdown:')
  const dayRows = days.map((d) => [
    d.id,
    d.wizardStarts || 0,
    Array.isArray(d.sessions) ? d.sessions.length : '—',
    d.wizardCompletions || 0,
    Object.entries(d.exports || {}).map(([m, c]) => `${m}:${c}`).join(', ') || '—',
  ])
  printTable(dayRows, ['Date', 'Starts', 'Unique', 'Completions', 'Exports'])
  console.log()

  // Peak hours
  const sortedHours = Object.entries(hourlyTotals).sort(([, a], [, b]) => b - a)
  if (sortedHours.length > 0) {
    console.log('Peak Hours (top 5):')
    const hourRows = sortedHours.slice(0, 5).map(([h, c]) => [`${h}:00`, c])
    printTable(hourRows, ['Hour', 'Starts'])
    console.log()
  }

  // Submissions
  const subsSnap = await db.collection('dcda_submissions').get()
  console.log(`Anonymous submissions: ${subsSnap.size}`)

  // Course demand
  const termsSnap = await db.collection('dcda_analytics').doc('course_demand').collection('terms').get()
  if (!termsSnap.empty) {
    console.log('\nCourse Demand by Term:')
    for (const termDoc of termsSnap.docs) {
      const data = termDoc.data()
      const scheduled = Object.entries(data.scheduled || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
      if (scheduled.length > 0) {
        console.log(`\n  ${termDoc.id} — top scheduled:`)
        for (const [code, count] of scheduled) {
          console.log(`    ${code}: ${count}`)
        }
      }
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
