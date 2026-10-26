import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalJson,
  createWorkRequest,
  DOCS_BUILDER_ACTUATOR,
  executeWorkRequest,
  sha256Hex,
  verifyWorkLedger
} from './workRequestRuntime.ts';

function approvedRequest() {
  return createWorkRequest({
    intent: 'Create an inspectable implementation record.',
    requestedCapability: 'document.markdown.compose',
    scope: ['workspace:artifact:markdown'],
    impact: 'reversible_local_change',
    authority: {
      requestedBy: 'architect',
      approvedBy: 'architect',
      approvalRef: 'approval:test-001'
    },
    payload: {
      title: 'Vertical Slice Evidence',
      purpose: 'Prove the bounded relational execution chain.',
      sections: [{ heading: 'Outcome', body: 'The Actuator produced this artifact.' }]
    }
  });
}

test('executes Conductor -> Dispatcher Orb -> Satellite -> Actuator and verifies the evidence ledger', async () => {
  const result = await executeWorkRequest(approvedRequest());

  assert.equal(result.state, 'COMPLETED');
  assert.equal(result.dispatcherOrbId, 'orb-dispatcher');
  assert.equal(result.satelliteId, 'satellite-constructor-docs');
  assert.equal(result.actuatorId, DOCS_BUILDER_ACTUATOR.actuatorId);
  assert.match(result.artifact?.content ?? '', /^# Vertical Slice Evidence/m);
  assert.match(result.artifact?.sha256 ?? '', /^[a-f0-9]{64}$/);
  assert.deepEqual(result.ledger.map((entry) => entry.stage), [
    'WORK_REQUEST_CREATED',
    'CONDUCTOR_ANALYZED',
    'ORBITAL_DISPATCHED',
    'SATELLITE_ASSIGNED',
    'ACTUATOR_EMPLOYED',
    'ARTIFACT_PRODUCED',
    'ACTUATOR_STOOD_DOWN',
    'ASSURANCE_VERIFIED',
    'SATELLITE_RECEIVED_EVIDENCE',
    'ORBITAL_RETURNED_EVIDENCE',
    'CONDUCTOR_RECEIVED_EVIDENCE'
  ]);
  assert.equal(await verifyWorkLedger(result.ledger), true);
});

test('refuses mutating work without explicit approval and does not employ an Actuator', async () => {
  const request = approvedRequest();
  request.authority = { requestedBy: 'architect' };

  const result = await executeWorkRequest(request);

  assert.equal(result.state, 'REFUSED');
  assert.equal(result.actuatorId, undefined);
  assert.equal(result.ledger.some((entry) => entry.stage === 'ACTUATOR_EMPLOYED'), false);
  assert.equal(await verifyWorkLedger(result.ledger), true);
});

test('records a Shortfall when no registered capability route exists', async () => {
  const request = approvedRequest();
  request.requestedCapability = 'asset.glb.rig';

  const result = await executeWorkRequest(request);

  assert.equal(result.state, 'SHORTFALL');
  assert.equal(result.ledger[result.ledger.length - 1]?.stage, 'SHORTFALL_RECORDED');
  assert.equal(result.ledger.some((entry) => entry.stage === 'ACTUATOR_EMPLOYED'), false);
});

test('detects ledger tampering', async () => {
  const result = await executeWorkRequest(approvedRequest());
  const tampered = result.ledger.map((entry) => ({ ...entry }));
  tampered[2].summary = 'Undeclared reroute';
  assert.equal(await verifyWorkLedger(tampered), false);
});

test('refuses a rehashed ledger with an invalid architectural stage transition', async () => {
  const result = await executeWorkRequest(approvedRequest());
  const invalid = result.ledger.map((entry) => ({ ...entry }));
  invalid[0].stage = 'ACTUATOR_EMPLOYED';
  const { entryHash: _entryHash, ...body } = invalid[0];
  invalid[0].entryHash = await sha256Hex(canonicalJson(body));
  if (invalid.length > 1) invalid[1].previousHash = invalid[0].entryHash;

  assert.equal(await verifyWorkLedger(invalid), false);
});

test('rejects empty document sections before a Work Request is created', () => {
  assert.throws(() => createWorkRequest({
    intent: 'Create a record.',
    requestedCapability: 'document.markdown.compose',
    scope: ['workspace:artifact:markdown'],
    impact: 'read_only',
    authority: { requestedBy: 'architect' },
    payload: { title: 'Record', purpose: 'Evidence', sections: [] }
  }), /at least one section/);
});
