// @ts-nocheck -- executed directly by Node/tsx; Node types are not a project dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseTransportRecovery,
  isUnauthorizedTransportError,
  reconnectDelayMs,
} from './operationsTransportPolicy.ts';

test('transport recovery attempts one cursor resume before authoritative resync', () => {
  assert.equal(chooseTransportRecovery({ failureCount: 1, hasCursor: true, resumeAttempted: false, needsResynchronization: false }), 'resume');
  assert.equal(chooseTransportRecovery({ failureCount: 2, hasCursor: true, resumeAttempted: true, needsResynchronization: false }), 'resync');
  assert.equal(chooseTransportRecovery({ failureCount: 1, hasCursor: true, resumeAttempted: false, needsResynchronization: true }), 'resync');
});

test('transport recovery is bounded and authorization loss is distinct', () => {
  assert.equal(chooseTransportRecovery({ failureCount: 5, hasCursor: true, resumeAttempted: false, needsResynchronization: false }), 'stop');
  assert.deepEqual([1, 2, 3, 4, 5].map(reconnectDelayMs), [1000, 2000, 4000, 8000, 8000]);
  assert.equal(isUnauthorizedTransportError(Object.assign(new Error('denied'), { status: 403 })), true);
  assert.equal(isUnauthorizedTransportError(new Error('offline')), false);
});
