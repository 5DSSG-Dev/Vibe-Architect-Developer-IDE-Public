/** Unmounted, read-only reconciliation for a claimed numeric delivery. */
import { createHash } from 'node:crypto';

export type ClaimEvidence = 'absent' | 'matching' | 'conflicting' | 'unknown';
export type ReceiverEvidence = 'delivered' | 'absent' | 'unknown';
export interface DeliveryEvidenceReaders {
  /** Reads the same shared namespace used by the atomic delivery claim. */
  readClaim(deliveryId: string, candidateHash: string): Promise<ClaimEvidence>;
  /** Reads a receiver-owned receipt for this exact delivery ID and candidate hash. */
  readReceiver(deliveryId: string, candidateHash: string): Promise<ReceiverEvidence>;
}

export interface RedisClaimReadClient { get(key: string): Promise<unknown> }

export type Reconciliation = Readonly<{
  deliveryId: string;
  candidateHash: string;
  status: 'invalid_identity' | 'claim_unknown' | 'claim_record_absent' | 'identity_conflict' |
    'receiver_unknown' | 'claimed_without_receipt' | 'delivered';
}>;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const HASH = /^[0-9a-f]{64}$/;

/** The request ID must be issued and persisted by a trusted server before first execution. */
export function numericDeliveryId(requestId: string, purpose: 'ask-reply' | 'task-proposal'): string | null {
  if (typeof requestId !== 'string' || !ID.test(requestId)) return null;
  return `delivery:${createHash('sha256').update(`${purpose}\0${requestId}`).digest('hex')}`;
}

/** Reads the exact payload written by RedisAtomicDeliveryClaims; no mutation or replay. */
export class RedisNumericClaimEvidenceReader {
  constructor(private readonly client: RedisClaimReadClient, private readonly prefix = 'aegis:numeric-delivery:') {}

  async readClaim(deliveryId: string, candidateHash: string): Promise<ClaimEvidence> {
    if (!ID.test(deliveryId) || !HASH.test(candidateHash)) return 'unknown';
    const key = `${this.prefix}${createHash('sha256').update(deliveryId).digest('hex')}`;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return 'absent';
      if (typeof raw !== 'string') return 'unknown';
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'unknown';
      const record = parsed as Record<string, unknown>;
      if (Object.keys(record).sort().join(',') !== 'candidateHash,deliveryId,version' ||
          record.version !== 1 || record.deliveryId !== deliveryId ||
          typeof record.candidateHash !== 'string' || !HASH.test(record.candidateHash)) return 'unknown';
      return record.candidateHash === candidateHash ? 'matching' : 'conflicting';
    } catch { return 'unknown'; }
  }
}

/** Observes uncertainty; absence of a claim record cannot prove no prior claim. Never replays. */
export async function reconcileNumericDelivery(
  deliveryId: string, candidateHash: string, readers: DeliveryEvidenceReaders,
): Promise<Reconciliation> {
  const result = (status: Reconciliation['status']): Reconciliation =>
    Object.freeze({ deliveryId, candidateHash, status });
  if (typeof deliveryId !== 'string' || !ID.test(deliveryId) ||
      typeof candidateHash !== 'string' || !HASH.test(candidateHash)) return result('invalid_identity');
  let claim: ClaimEvidence;
  try { claim = await readers.readClaim(deliveryId, candidateHash); }
  catch { return result('claim_unknown'); }
  if (claim === 'absent') return result('claim_record_absent');
  if (claim === 'conflicting') return result('identity_conflict');
  if (claim !== 'matching') return result('claim_unknown');
  let receiver: ReceiverEvidence;
  try { receiver = await readers.readReceiver(deliveryId, candidateHash); }
  catch { return result('receiver_unknown'); }
  if (receiver === 'delivered') return result('delivered');
  if (receiver === 'absent') return result('claimed_without_receipt');
  return result('receiver_unknown');
}
