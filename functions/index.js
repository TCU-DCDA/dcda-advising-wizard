import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { assembleManifest, validateManifest } from './manifest-assembly.js';

initializeApp();
const db = getFirestore();

export const advisingManifest = onRequest(
  {
    region: 'us-central1',
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).set('Allow', 'GET, HEAD').send('Method Not Allowed');
      return;
    }

    try {
      const manifest = await assembleManifest(db);
      const { valid, errors } = validateManifest(manifest);

      if (!valid) {
        logger.error('Manifest failed schema validation', { errors });
        res.status(500).json({
          error: 'Manifest failed schema validation',
          details: errors,
        });
        return;
      }

      res
        .status(200)
        .set('Cache-Control', 'public, max-age=60, must-revalidate')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(JSON.stringify(manifest));
    } catch (err) {
      logger.error('Failed to assemble manifest', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Failed to assemble manifest', message: err.message });
    }
  }
);
