/** Storage-only contract. No model calls, route activation, or delivery authority. */
export type Direction = 'architect-to-luminary' | 'luminary-to-architect';
export interface Submission {
  scope: string; // trusted caller/workspace boundary, supplied by future integration
  direction: Direction;
  submissionKey: string; // stable across transport retry; not an authorization credential
  content: string; // exact original, no whitespace/Unicode normalization
  exchangeId?: string; // absent only for initial submission
  revisesAttemptId?: string;
  expectedHead?: string;
}
export interface Registration {
  exchangeId: string;
  attemptId: string;
  digest: string;
  request: Submission;
}
export type ProcessingOutcome =
  | { kind: 'returned'; receipt: string } // trusted evidence, NOT manufactured by this service
  | { kind: 'completed' }
  | { kind: 'shortfall' };
export type AdmissionEvent = {
  schemaVersion: 1;
  eventId: string;
} & (
  | { kind: 'submission_registered'; registration: Registration }
  | { kind: 'attempt_admitted'; attemptId: string; ordinal: number }
  | { kind: 'admission_resolved'; attemptId: string; admitted: boolean }
  | { kind: 'attempt_processing_closed'; attemptId: string; outcome: ProcessingOutcome }
);
export type AdmissionCode = 'invalid' | 'conflict' | 'stale-head' | 'exhausted' | 'processing-required' | 'persistence-unresolved' | 'not-found' | 'closed';
export class AdmissionError extends Error {
  constructor(readonly code: AdmissionCode, message: string = code) { super(message); }
}
export interface SubmissionStatus {
  registration: Registration;
  state: 'registered' | 'admitted' | 'not-admitted';
  ordinal?: number;
  outcome?: ProcessingOutcome;
}
export interface ExchangeView {
  exchangeId: string;
  admitted: number;
  replacementsRemaining: number;
  head: string | null;
  canReplace: boolean;
  pending: boolean;
}

export interface AdmissionResult extends SubmissionStatus { admission: 'new' | 'existing' }
