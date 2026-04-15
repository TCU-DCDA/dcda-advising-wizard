#!/usr/bin/env node

/**
 * Sync scraped offerings into dcda_config/offerings_{term} in Firestore.
 *
 * Reads data/offerings-{term}.json (produced by the course-scraper) and
 * writes offeredCodes + sections into the matching Firestore doc, preserving
 * any other fields on the doc via field-level merge.
 *
 * Defaults to DRY RUN. Pass --apply to actually write. Always saves a backup
 * of the current Firestore doc to /tmp before writing.
 *
 * Usage:
 *   node scripts/sync-offerings-from-scrape.mjs --terms fa26,su26
 *   node scripts/sync-offerings-from-scrape.mjs --terms fa26 --apply
 *
 * Requires: firebase-admin (uses Application Default Credentials)
 * Run: gcloud auth application-default login   (if not already authenticated)
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const { values } = parseArgs({
  options: {
    terms: { type: 'string' },
    apply: { type: 'boolean', default: false },
    help:  { type: 'boolean', short: 'h' },
  },
})

if (values.help || !values.terms) {
  console.log(`Sync scraped offerings into Firestore dcda_config/offerings_{term}.

Usage:
  node scripts/sync-offerings-from-scrape.mjs --terms fa26,su26        Dry run
  node scripts/sync-offerings-from-scrape.mjs --terms fa26,su26 --apply Write

Flags:
  --terms  Comma-separated term IDs (e.g. fa26,su26,sp27)
  --apply  Actually write to Firestore (default: dry run)
  -h       Show help

A backup of each current Firestore doc is saved to /tmp before any write.`)
  process.exit(values.help ? 0 : 1)
}

const terms = values.terms.split(',').map(t => t.trim()).filter(Boolean)
const apply = values.apply

initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
})
const db = getFirestore()

function loadScrape(termId) {
  const filename = `offerings-${termId}.json`
  const path = join(projectRoot, 'data', filename)
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    console.error(`Error reading data/${filename}: ${err.message}`)
    process.exit(1)
  }
}

function diffCodes(before, after) {
  const b = new Set(before ?? [])
  const a = new Set(after ?? [])
  return {
    added:   [...a].filter(c => !b.has(c)).sort(),
    removed: [...b].filter(c => !a.has(c)).sort(),
    kept:    [...a].filter(c => b.has(c)).length,
  }
}

async function syncTerm(termId) {
  const docId = `offerings_${termId}`
  console.log(`\n=== ${docId} ===`)

  const scrape = loadScrape(termId)
  const newCodes = scrape.offeredCodes ?? []
  const newSections = scrape.sections ?? []

  const ref = db.collection('dcda_config').doc(docId)
  const snap = await ref.get()

  if (!snap.exists) {
    console.error(`  Firestore doc ${docId} does not exist — refusing to create`)
    console.error(`  (this script only updates existing offerings docs)`)
    return false
  }

  const current = snap.data() ?? {}
  const currentCodes = current.offeredCodes ?? []
  const currentSections = current.sections ?? []

  // Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `/tmp/firestore-backup-${docId}-${timestamp}.json`
  writeFileSync(backupPath, JSON.stringify(current, null, 2))
  console.log(`  Backup:   ${backupPath}`)

  // Diff
  const codeDiff = diffCodes(currentCodes, newCodes)
  console.log(`  Codes:    ${currentCodes.length} → ${newCodes.length}`)
  console.log(`  Sections: ${currentSections.length} → ${newSections.length}`)
  if (codeDiff.added.length > 0) {
    console.log(`  + Added:`)
    for (const c of codeDiff.added) console.log(`      ${c}`)
  }
  if (codeDiff.removed.length > 0) {
    console.log(`  - Removed:`)
    for (const c of codeDiff.removed) console.log(`      ${c}`)
  }
  if (codeDiff.added.length === 0 && codeDiff.removed.length === 0) {
    console.log(`  (no code changes; sections may still differ)`)
  }

  // Preserved fields (everything other than offeredCodes and sections)
  const preservedKeys = Object.keys(current).filter(k => k !== 'offeredCodes' && k !== 'sections')
  if (preservedKeys.length > 0) {
    console.log(`  Preserved fields (not touched): ${preservedKeys.join(', ')}`)
  }

  if (!apply) {
    console.log(`  DRY RUN — no write`)
    return true
  }

  await ref.update({
    offeredCodes: newCodes,
    sections: newSections,
  })
  console.log(`  WROTE offeredCodes + sections`)
  return true
}

async function main() {
  console.log(`Sync offerings from scrape → Firestore (${apply ? 'APPLY' : 'DRY RUN'})`)
  console.log(`Project: dcda-advisor-mobile`)
  console.log(`Terms:   ${terms.join(', ')}`)

  for (const termId of terms) {
    await syncTerm(termId)
  }

  console.log(`\nDone.`)
  if (!apply) {
    console.log(`Re-run with --apply to actually write these changes.`)
  }
}

main().catch(err => {
  console.error('\nError:', err.message)
  if (err.message.includes('Could not load the default credentials')) {
    console.error('Run: gcloud auth application-default login')
  }
  process.exit(1)
})
