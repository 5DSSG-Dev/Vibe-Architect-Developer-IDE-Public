/** Unmounted receiver-owned acceptance receipt boundary. Only a receiver may record acceptance. */
import { createHash } from 'node:crypto';
import type { ReceiverEvidence } from './numeric-delivery-reconciliation.js';

export interface RedisReceiptClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  get(key: string): Promise<unknown>;
}

export type ReceiptWriteOutcome = 'recorded' | 'duplicate' | 'conflict' | 'uncertain';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[0-9a-f]{64}$/;
const SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  if existing == ARGV[1] then return 0 end
  return -1
end
redis.call('SET', KEYS[1], ARGV[1])
return 1
`;

/** A distinct receiver-owned Redis client/namespace is required at integration. */
export class RedisReceiverAcceptanceReceipts {
  constructor(private readonly client: RedisReceiptClient,
    private readonly prefix = 'aegis:numeric-receiver-accepted:') {}

  private key(deliveryId: string): string {
    return `${this.prefix}${createHash('sha256').update(deliveryId).digest('hex')}`;
  }

  /** Call only after the receiver has accepted this exact candidate. */
  async recordAccepted(deliveryId: string, candidateHash: string): Promise<ReceiptWriteOutcome> {
    if (!ID.test(deliveryId) || !HASH.test(candidateHash)) return 'conflict';
    const payload = JSON.stringify({ version: 1, event: 'receiver_accepted', deliveryId, candidateHash });
    try {
      const code = await this.client.eval(SCRIPT, { keys: [this.key(deliveryId)], arguments: [payload] });
      if (code === 1) return 'recorded';
      if (code === 0) return 'duplicate';
      if (code === -1) return 'conflict';
      return 'uncertain';
    } catch { return 'uncertain'; }
  }

  /** Positive evidence means recorded receiver acceptance, not downstream completion. */
  async readReceiver(deliveryId: string, candidateHash: string): Promise<ReceiverEvidence> {
    if (!ID.test(deliveryId) || !HASH.test(candidateHash)) return 'unknown';
    try {
      const raw = await this.client.get(this.key(deliveryId));
      if (raw === null) return 'absent';
      if (typeof raw !== 'string') return 'unknown';
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'unknown';
      const record = parsed as Record<string, unknown>;
      if (Object.keys(record).sort().join(',') !== 'candidateHash,deliveryId,event,version' ||
          record.version !== 1 || record.event !== 'receiver_accepted' || record.deliveryId !== deliveryId ||
          typeof record.candidateHash !== 'string' || !HASH.test(record.candidateHash)) return 'unknown';
      return record.candidateHash === candidateHash ? 'delivered' : 'unknown';
    } catch { return 'unknown'; }
  }
}
