#!/usr/bin/env node

/**
 * One-time script to clear test submissions and analytics data
 * from both DCDA and English wizard Firestore collections.
 *
 * Usage:
 *   node scripts/reset-analytics.mjs --dry-run   # preview what would be deleted
 *   node scripts/reset-analytics.mjs              # actually delete
 *
 * Requires: firebase-admin (uses Application Default Credentials)
 * Run: gcloud auth application-default login   (if not already authenticated)
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(`Reset test analytics data from Firestore.

Usage:
  node scripts/reset-analytics.mjs --dry-run   Preview deletions
  node scripts/reset-analytics.mjs              Delete for real`)
  process.exit(0)
}

const dryRun = values['dry-run']

initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
})

const db = getFirestore()

const COLLECTIONS_TO_CLEAR = [
  // DCDA wizard
  'dcda_submissions',
  'dcda_analytics/daily/stats',
  'dcda_analytics/course_demand/terms',

  // English wizard
  'english_submissions',
  'english_analytics/daily/stats',
  'english_analytics/course_demand/terms',
]

async function deleteCollection(path) {
  const parts = path.split('/')
  let ref
  if (parts.length === 1) {
    ref = db.collection(parts[0])
  } else if (parts.length === 3) {
    // subcollection: e.g. dcda_analytics/daily/stats
    ref = db.collection(parts[0]).doc(parts[1]).collection(parts[2])
  } else {
    console.error(`  Unexpected path format: ${path}`)
    return 0
  }

  const snapshot = await ref.get()
  if (snapshot.empty) {
    console.log(`  ${path}: empty (nothing to delete)`)
    return 0
  }

  console.log(`  ${path}: ${snapshot.size} documents`)

  if (dryRun) {
    snapshot.docs.slice(0, 5).forEach((doc) => {
      console.log(`    - ${doc.id}`)
    })
    if (snapshot.size > 5) {
      console.log(`    ... and ${snapshot.size - 5} more`)
    }
    return snapshot.size
  }

  // Batch delete (max 500 per batch)
  const batches = []
  let batch = db.batch()
  let count = 0
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref)
    count++
    if (count % 500 === 0) {
      batches.push(batch)
      batch = db.batch()
    }
  }
  if (count % 500 !== 0) batches.push(batch)

  for (const b of batches) {
    await b.commit()
  }

  console.log(`    Deleted ${count} documents`)
  return count
}

async function main() {
  console.log(dryRun ? '\n=== DRY RUN (no deletions) ===' : '\n=== RESETTING TEST DATA ===')
  console.log(`Project: dcda-advisor-mobile\n`)

  let total = 0
  for (const path of COLLECTIONS_TO_CLEAR) {
    total += await deleteCollection(path)
  }

  console.log(
    dryRun
      ? `\nWould delete ${total} documents total. Run without --dry-run to execute.`
      : `\nDone. Deleted ${total} documents total.`
  )
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
