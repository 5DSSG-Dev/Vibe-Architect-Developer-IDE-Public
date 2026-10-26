import { Router, type Request, type Response } from 'express';
import {
  EvidenceCapacityError,
  EvidenceConflictError,
  EvidenceIntegrityError,
  EvidenceService,
  EvidenceValidationError,
} from './evidence-store.js';

function requireMutationAuthority(origin: string) {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    const csrf = req.header('x-csrf-token');
    if (!csrf || csrf !== req.adminSession?.principal?.csrfToken || req.header('origin') !== origin) {
      res.status(403).json({ error: 'csrf_validation_failed' });
      return;
    }
    next();
  };
}

function handleEvidenceError(error: unknown, res: Response, next: (error?: unknown) => void): void {
  if (error instanceof EvidenceValidationError) {
    res.status(400).json({ error: 'evidence_malformed', detail: error.message });
    return;
  }
  if (error instanceof EvidenceIntegrityError) {
    res.status(422).json({ error: 'evidence_integrity_failed', detail: error.message });
    return;
  }
  if (error instanceof EvidenceConflictError) {
    res.status(409).json({ error: 'evidence_conflict', detail: error.message });
    return;
  }
  if (error instanceof EvidenceCapacityError) {
    res.status(503).json({ error: 'evidence_capacity_reached' });
    return;
  }
  next(error);
}

export function createEvidenceRouter(service: EvidenceService, origin: string): Router {
  const router = Router();
  const mutationAuthority = requireMutationAuthority(origin);
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/relation-contracts', mutationAuthority, async (req, res, next) => {
    try {
      const result = await service.appendRelationContract(req.body);
      res.status(result.status === 'appended' ? 201 : 200).json(result);
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  router.post('/work-ledger-entries', mutationAuthority, async (req, res, next) => {
    try {
      const result = await service.appendWorkLedgerEntry(req.body);
      res.status(result.status === 'appended' ? 201 : 200).json(result);
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  router.get('/relation-contracts/:contractId', async (req, res, next) => {
    try {
      const records = await service.readRelationContract(req.params.contractId);
      if (records.length === 0) { res.status(404).json({ error: 'evidence_not_found' }); return; }
      res.json({ records });
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  router.get('/work-ledgers/:workRequestId', async (req, res, next) => {
    try {
      const records = await service.readWorkLedger(req.params.workRequestId);
      if (records.length === 0) { res.status(404).json({ error: 'evidence_not_found' }); return; }
      res.json({ records });
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  router.get('/replay', async (req, res, next) => {
    try {
      const after = typeof req.query.after === 'string' ? req.query.after : undefined;
      if (req.query.after !== undefined && !after) throw new EvidenceValidationError('after must be a single cursor string.');
      const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
      res.json(await service.replay({ after, limit }));
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  router.get('/integrity', async (_req, res, next) => {
    try {
      const report = await service.verifyIntegrity();
      res.status(report.valid ? 200 : 409).json(report);
    } catch (error) { handleEvidenceError(error, res, next); }
  });

  return router;
}
