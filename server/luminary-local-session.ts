import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Explicit opt-in for the developer's loopback preview; never enabled in production. */
export function createLocalLuminarySession(origin: string, demoKey: string): RequestHandler {
  const expected = new URL(origin);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(expected.hostname) || expected.origin !== origin || !demoKey) throw Error('Local Luminary sessions require an exact loopback origin and a configured demo key.');
  const token = randomBytes(32).toString('hex');
  const name = 'aegis_local_luminary';
  const sameToken = (value: string) => /^[0-9a-f]{64}$/.test(value) && timingSafeEqual(Buffer.from(value), Buffer.from(token));
  return (req, res, next) => {
    const address = req.socket.remoteAddress;
    const local = address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
    const hostMatches = req.get('host') === expected.host;
    const sameOrigin = req.get('origin') === origin;
    const sameSite = req.get('sec-fetch-site') === 'same-origin';
    if (req.path === '/local-session' && req.method === 'POST') {
      if (!local || !hostMatches || !sameOrigin) { res.sendStatus(403); return; }
      res.setHeader('Cache-Control', 'no-store');
      res.cookie(name, token, { httpOnly: true, sameSite: 'strict', secure: expected.protocol === 'https:', path: '/api/luminary', maxAge: 8 * 60 * 60 * 1000 });
      res.sendStatus(204); return;
    }
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
    const safeRead = req.method === 'GET' || req.method === 'HEAD';
    if (local && hostMatches && (sameOrigin || (safeRead && sameSite)) && cookie && sameToken(cookie)) req.headers['x-luminary-demo-key'] = demoKey;
    next();
  };
}
