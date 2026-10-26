import { Router, type Request, type Response } from 'express';

export class OperationsProviderStateError extends Error {
  constructor(message = 'Operations provider state is invalid.') {
    super(message);
    this.name = 'OperationsProviderStateError';
  }
}

export interface OperationsProvider {
  sendSnapshot(req: Request, res: Response): Promise<void>;
  openStream(req: Request, res: Response): Promise<void>;
}

export function createOperationsRouter(provider?: OperationsProvider): Router {
  const router = Router();
  router.get('/snapshot', async (req, res, next) => {
    if (!provider) {
      res.status(503).json({ error: 'operations_source_unavailable' });
      return;
    }
    try {
      await provider.sendSnapshot(req, res);
    } catch (error) {
      if (error instanceof OperationsProviderStateError && !res.headersSent) {
        res.status(503).json({ error: 'operations_source_invalid' });
        return;
      }
      next(error);
    }
  });
  router.get('/stream', async (req, res, next) => {
    if (!provider) {
      res.status(503).json({ error: 'operations_source_unavailable' });
      return;
    }
    try {
      await provider.openStream(req, res);
    } catch (error) {
      if (error instanceof OperationsProviderStateError && !res.headersSent) {
        res.status(503).json({ error: 'operations_source_invalid' });
        return;
      }
      next(error);
    }
  });
  return router;
}
