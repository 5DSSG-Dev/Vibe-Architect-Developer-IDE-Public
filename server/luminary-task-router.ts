// Coding-task routes for the Luminary (STP-0002 P19, N24, N25), mounted under /api/luminary/tasks.
// The Architect assigns a task; the Luminary's reply takes the same governed path as /ask; the
// executor puts the proposed change on the Luminary's own branch and runs the checks; only the
// Architect's accept merges it. Loopback only: the executor writes to this computer's checkout,
// so a reviewer reaching the demo from elsewhere can talk to the Luminary but never reach this.

import { Router, type NextFunction, type Request, type Response } from 'express';
import { composePrompt, findChange, EXPLANATION_LEVELS, type ExplanationLevel } from '../src/luminary/blocks.js';
import { ExecutorShortfall, LuminaryExecutor } from './luminary-executor.js';
import { shortfallStatus, type GovernedAskResult } from './luminary-reply-router.js';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** The socket address, not a forwarded header, so a proxy cannot make a remote caller look local. */
export const isLoopback = (req: Request) => LOOPBACK.has(req.socket.remoteAddress ?? '');

export function requireLoopback(req: Request, res: Response, next: NextFunction): void {
  if (!isLoopback(req)) {
    res.status(403).json({ error: 'executor_local_only' });
    return;
  }
  next();
}

const SHORTFALL_HTTP: Record<ExecutorShortfall['code'], number> = {
  fence: 422,
  no_change: 422,
  not_found: 404,
  not_open: 409,
  git_error: 500,
  merge_conflict: 409,
};

function sendExecutorShortfall(res: Response, error: unknown): void {
  if (error instanceof ExecutorShortfall) {
    res.status(SHORTFALL_HTTP[error.code]).json({ error: 'executor_shortfall', shortfall: { code: error.code, message: error.message } });
    return;
  }
  res.status(500).json({ error: 'executor_shortfall', shortfall: { code: 'git_error', message: error instanceof Error ? error.message : 'The executor failed.' } });
}

export function createLuminaryTaskRouter(executor: LuminaryExecutor, governedAsk: (prompt: string) => Promise<GovernedAskResult>): Router {
  const router = Router();
  router.use(requireLoopback);

  router.post('/', async (req: Request, res: Response) => {
    const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    if (!goal) {
      res.status(400).json({ error: 'malformed_request', detail: 'A coding task needs a goal.' });
      return;
    }
    const level: ExplanationLevel = (EXPLANATION_LEVELS as readonly unknown[]).includes(body.level) ? (body.level as ExplanationLevel) : 'plain';
    const mode = typeof body.mode === 'string' && body.mode.trim() ? body.mode.trim().slice(0, 32) : 'CODE';

    let allowedFiles: string[];
    try {
      allowedFiles = LuminaryExecutor.fenceTask(body.allowedFiles);
    } catch (error) {
      sendExecutorShortfall(res, error);
      return;
    }

    const result = await governedAsk(composePrompt({ mode, level, context: [], message: goal, task: { allowedFiles } }));
    if (!result.ok) {
      res.status(shortfallStatus(result.shortfall.code)).json({ error: 'luminary_shortfall', shortfall: result.shortfall, ...(result.lineage ? { lineage: result.lineage } : {}) });
      return;
    }

    try {
      const task = await executor.propose({ goal, allowedFiles, modelId: result.reply.modelId, change: findChange(result.reply.content) });
      res.status(201).json({ reply: result.reply, lineage: result.lineage, task: task });
    } catch (error) {
      if (error instanceof ExecutorShortfall) {
        res.status(SHORTFALL_HTTP[error.code]).json({ error: 'executor_shortfall', reply: result.reply, lineage: result.lineage, shortfall: { code: error.code, message: error.message } });
        return;
      }
      sendExecutorShortfall(res, error);
    }
  });

  router.post('/:id/accept', async (req: Request, res: Response) => {
    try {
      res.json({ task: await executor.accept(String(req.params.id)) });
    } catch (error) {
      sendExecutorShortfall(res, error);
    }
  });

  router.post('/:id/decline', async (req: Request, res: Response) => {
    try {
      res.json({ task: await executor.decline(String(req.params.id)) });
    } catch (error) {
      sendExecutorShortfall(res, error);
    }
  });

  router.get('/ledger', (_req: Request, res: Response) => {
    res.json(executor.readLedger());
  });

  return router;
}
