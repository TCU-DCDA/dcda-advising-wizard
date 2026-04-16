#!/usr/bin/env node
/**
 * Seed the local Firestore emulator with data from the repo's data/ directory.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node seed-emulator.js
 *
 * Writes:
 *   dcda_config/courses       from ../data/courses.json
 *   dcda_config/requirements  from ../data/requirements.json
 *   dcda_config/offerings_*   from ../data/offerings-*.json (su26, fa26 only — sp26 skipped as past)
 *
 * Requires the emulator to be running (firebase emulators:start).
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '..', 'data');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is not set.');
  console.error('Set FIRESTORE_EMULATOR_HOST=localhost:8080 (or equivalent) before seeding.');
  process.exit(1);
}

initializeApp({ projectId: 'dcda-advisor-mobile' });
const db = getFirestore();

function loadJSON(filename) {
  return JSON.parse(readFileSync(join(dataDir, filename), 'utf-8'));
}

async function main() {
  console.log(`Seeding Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);

  const courses = loadJSON('courses.json');
  await db.collection('dcda_config').doc('courses').set({ courses });
  console.log(`  dcda_config/courses         <- ${courses.length} courses`);

  const requirements = loadJSON('requirements.json');
  await db.collection('dcda_config').doc('requirements').set(requirements);
  console.log(`  dcda_config/requirements    <- major + minor`);

  const offeringsFiles = readdirSync(dataDir).filter((f) => /^offerings-(sp|su|fa)\d{2}\.json$/.test(f));
  for (const file of offeringsFiles) {
    const match = file.match(/^offerings-(sp|su|fa)(\d{2})\.json$/);
    const docId = `offerings_${match[1]}${match[2]}`;
    const offerings = loadJSON(file);
    await db.collection('dcda_config').doc(docId).set(offerings);
    console.log(`  dcda_config/${docId}  <- ${(offerings.offeredCodes || []).length} offered codes`);
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
