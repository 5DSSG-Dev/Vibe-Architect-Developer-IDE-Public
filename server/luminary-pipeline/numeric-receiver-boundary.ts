/** Unmounted receiver adapter: acceptance precedes its receipt write. */
import { createHash } from 'node:crypto';
import type { GovernedReply } from '../luminary-governance.js';
import type { ReceiptWriteOutcome } from './numeric-receiver-receipt.js';

export type Acceptance = Readonly<{ status: 'accepted'; deliveryId: string; candidateHash: string }>;
export interface ReceiverAcceptance {
  accept(reply: GovernedReply, deliveryId: string): Promise<unknown> | unknown;
}
export interface AcceptanceReceipts {
  recordAccepted(deliveryId: string, candidateHash: string): Promise<ReceiptWriteOutcome>;
}

export class ReceiverBoundaryError extends Error {
  constructor(readonly code: 'acceptance_unknown' | 'receipt_conflict' | 'receipt_unknown') {
    super(code);
  }
}

function exactAcceptance(raw: unknown, deliveryId: string, candidateHash: string): raw is Acceptance {
  try {
    if (!raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) return false;
    const keys = Reflect.ownKeys(raw);
    if (keys.length !== 3 || keys.some((key) => !['status', 'deliveryId', 'candidateHash'].includes(String(key)))) return false;
    const descriptors = Object.getOwnPropertyDescriptors(raw);
    return Object.values(descriptors).every((descriptor) => 'value' in descriptor) &&
      descriptors.status?.value === 'accepted' && descriptors.deliveryId?.value === deliveryId &&
      descriptors.candidateHash?.value === candidateHash;
  } catch { return false; }
}

/** Accept is a trusted receiver operation; only its exact acknowledgment can precede a receipt. */
export function bindNumericReceiverAcceptance(
  receiver: ReceiverAcceptance, receipts: AcceptanceReceipts,
): (reply: GovernedReply, deliveryId: string) => Promise<void> {
  return async (reply, deliveryId) => {
    const candidateHash = createHash('sha256').update(reply.content).digest('hex');
    let ack: unknown;
    try { ack = await receiver.accept(reply, deliveryId); }
    catch { throw new ReceiverBoundaryError('acceptance_unknown'); }
    if (!exactAcceptance(ack, deliveryId, candidateHash)) throw new ReceiverBoundaryError('acceptance_unknown');
    let recorded: ReceiptWriteOutcome;
    try { recorded = await receipts.recordAccepted(deliveryId, candidateHash); }
    catch { throw new ReceiverBoundaryError('receipt_unknown'); }
    if (recorded === 'conflict') throw new ReceiverBoundaryError('receipt_conflict');
    if (recorded !== 'recorded' && recorded !== 'duplicate') throw new ReceiverBoundaryError('receipt_unknown');
  };
}
