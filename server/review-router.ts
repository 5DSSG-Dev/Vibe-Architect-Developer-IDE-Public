// The review record's surface for the IDE (STP-0005 P3, plan rev16 F4). Read-only, apart
// from the Architect's acknowledgement of a failed check, which is itself appended to the
// record. There is no route that deletes or changes an entry (Axiom 17).

import { Router, type Request, type Response } from 'express';
import type { Anchor, AreaName, ReviewRecord } from './governance-record/review.js';

const AREAS: readonly AreaName[] = ['architect', 'luminary'];

function readAnchors(body: unknown): Anchor[] | null {
  const raw = (body as { anchors?: unknown } | null)?.anchors;
  if (!Array.isArray(raw) || raw.length > 16) return null;
  const anchors: Anchor[] = [];
  for (const item of raw) {
    const { area, seq, hash } = (item ?? {}) as Record<string, unknown>;
    if (!AREAS.includes(area as AreaName) || !Number.isInteger(seq) || (seq as number) < 1 || typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) return null;
    anchors.push({ area: area as AreaName, seq: seq as number, hash });
  }
  return anchors;
}

export function createReviewRouter(record: ReviewRecord): Router {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      closed: record.closed,
      problems: record.problems,
      status: record.status(),
      items: { architect: record.reviewItems('architect'), luminary: record.reviewItems('luminary') },
    });
  });

  // The second anchor: the IDE sends the newest pointer it holds for each area on load.
  router.post('/anchors', (req: Request, res: Response) => {
    const anchors = readAnchors(req.body);
    if (!anchors) {
      res.status(400).json({ error: 'malformed_request', detail: 'Body must be { anchors: [{ area, seq, hash }] }.' });
      return;
    }
    const problems = record.checkAnchors(anchors);
    res.json({ ok: problems.length === 0, problems, closed: record.closed });
  });

  router.post('/acknowledge', async (_req: Request, res: Response) => {
    try {
      await record.acknowledge();
      res.json({ closed: record.closed });
    } catch (error) {
      res.status(503).json({ error: 'record_error', detail: error instanceof Error ? error.message : 'The acknowledgement could not be written.' });
    }
  });

  return router;
}
