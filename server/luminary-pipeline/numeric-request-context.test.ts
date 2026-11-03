import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureNumericRequestContext, NUMERIC_RETRY_KEY_HEADER } from './numeric-request-context.js';
import type { AuthenticatedPrincipal } from '../session-store.js';

const retryKey = '4e304dfe-96ef-47ed-8d44-2edc9e84a89c';
const principal = (subject = 'architect-1', tenantId = 'tenant-1'): AuthenticatedPrincipal =>
  ({ subject, tenantId, roles: ['service.operations.read'], csrfToken: 'test' });

test('authenticated tenant and subject define isolated stable scope', () => {
  const first = captureNumericRequestContext(principal(), retryKey, 'task-proposal', 'Build app');
  const retry = captureNumericRequestContext(principal(), retryKey, 'task-proposal', 'Build app');
  const otherSubject = captureNumericRequestContext(principal('architect-2'), retryKey, 'task-proposal', 'Build app');
  const otherTenant = captureNumericRequestContext(principal('architect-1', 'tenant-2'), retryKey, 'task-proposal', 'Build app');
  assert.equal(NUMERIC_RETRY_KEY_HEADER, 'idempotency-key');
  assert.deepEqual(first, retry);
  assert.notEqual(first?.scope, otherSubject?.scope);
  assert.notEqual(first?.scope, otherTenant?.scope);
  assert.equal(first?.scope.includes('architect-1'), false);
  assert.equal(first?.clientKey, `retry:${retryKey}`);
  assert.equal(Object.isFrozen(first), true);
});

test('missing principal and malformed retry key cannot form request context', () => {
  assert.equal(captureNumericRequestContext(null, retryKey, 'ask-reply', 'Hello'), null);
  for (const key of ['', 'same-key', '00000000-0000-0000-0000-000000000000', ['x']]) {
    assert.equal(captureNumericRequestContext(principal(), key, 'ask-reply', 'Hello'), null);
  }
  assert.equal(captureNumericRequestContext(principal(), retryKey, 'ask-reply', ' '), null);
});

test('accessor-backed principal fields are rejected without invoking getters', () => {
  let reads = 0;
  const hostile = { tenantId: 'tenant-1', roles: [], csrfToken: 'test' };
  Object.defineProperty(hostile, 'subject', { enumerable: true, get: () => { reads += 1; return 'forged'; } });
  assert.equal(captureNumericRequestContext(hostile as unknown as AuthenticatedPrincipal, retryKey, 'ask-reply', 'Hello'), null);
  assert.equal(reads, 0);
});
