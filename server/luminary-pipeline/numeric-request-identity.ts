/** Unmounted server-issued request identity for a stable delivery ID across retries. */
import { createHash, randomUUID } from 'node:crypto';

export type NumericPurpose = 'ask-reply' | 'task-proposal';
export type RequestIdentityResult = Readonly<
  | { status: 'issued' | 'existing'; requestId: string }
  | { status: 'conflict' | 'uncertain' | 'invalid'; requestId: null }
>;
export interface RedisIdentityClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[0-9a-f]{64}$/;
const SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  local ok, record = pcall(cjson.decode, existing)
  if not ok or type(record) ~= 'table' then return {-2} end
  if record.version ~= 1 or record.scope ~= ARGV[1] or record.purpose ~= ARGV[2] or
     record.clientKey ~= ARGV[3] or type(record.requestId) ~= 'string' then return {-2} end
  if record.inputHash ~= ARGV[4] then return {-1} end
  return {0, record.requestId}
end
redis.call('SET', KEYS[1], ARGV[5])
return {1, ARGV[6]}
`;

/** Scope must identify the authenticated principal or other trusted isolation boundary. */
export class RedisNumericRequestIdentities {
  constructor(private readonly client: RedisIdentityClient,
    private readonly prefix = 'aegis:numeric-request:') {}

  async issue(scope: string, clientKey: string, purpose: NumericPurpose, inputHash: string): Promise<RequestIdentityResult> {
    const failed = (status: 'conflict' | 'uncertain' | 'invalid'): RequestIdentityResult =>
      Object.freeze({ status, requestId: null });
    const identified = (status: 'issued' | 'existing', requestId: string): RequestIdentityResult =>
      Object.freeze({ status, requestId });
    if (typeof scope !== 'string' || !ID.test(scope) || typeof clientKey !== 'string' || !ID.test(clientKey) ||
        (purpose !== 'ask-reply' && purpose !== 'task-proposal') || typeof inputHash !== 'string' || !HASH.test(inputHash)) {
      return failed('invalid');
    }
    const key = `${this.prefix}${createHash('sha256').update(JSON.stringify([scope, purpose, clientKey])).digest('hex')}`;
    const requestId = `request:${randomUUID()}`;
    const payload = JSON.stringify({ version: 1, scope, purpose, clientKey, inputHash, requestId });
    try {
      const raw = await this.client.eval(SCRIPT, { keys: [key], arguments: [scope, purpose, clientKey, inputHash, payload, requestId] });
      if (!Array.isArray(raw)) return failed('uncertain');
      if (raw.length === 1 && raw[0] === -1) return failed('conflict');
      if (raw.length !== 2) return failed('uncertain');
      if (raw[0] === 1 && raw[1] === requestId) return identified('issued', requestId);
      if (raw[0] === 0 && typeof raw[1] === 'string' && /^request:[0-9a-f-]{36}$/.test(raw[1])) {
        return identified('existing', raw[1]);
      }
      return failed('uncertain');
    } catch { return failed('uncertain'); }
  }
}
