import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankApp, validateProposal, parseCreationAnswer, connectAppProposal, creationPrompt, type AppProposal } from './appCreation';
import { DEFAULT_APOTHECARY_CATALOG as catalog } from './relationEngine';
import { closeConnectionByAgreement } from './connectionRuntime';
const orb = catalog.find(i => i.category === 'Orbs')!;
function proposal(): AppProposal { return { name: 'My app', appType: 'Web App', purpose: 'Review files', crystalModel: 'AEGIS_POD_CRYSTAL.glb', elements: [{ id: orb.id, parentId: null, reason: 'Serve requests' }], gaps: [] }; }
test('new apps have unique identity and no starter connections or CyberPeer daemons', () => {
 const a = createBlankApp(), b = createBlankApp();
 assert.notEqual(a.coreId, b.coreId); assert.equal(a.appCreation, 'draft');
 assert.equal(a.contracts.length, 0); assert.equal(a.portals.length, 0);
 assert.ok(a.sockets.every(s => s.state === 'Vacant' && !s.connectedItem && !s.contractId && !s.attachedSatellites));
 assert.ok(Object.values(a.activeDaemons).every(v => v === false));
});
test('invented IDs, duplicates, and invalid parent categories fail validation', () => {
 const p = proposal();
 assert.throws(() => validateProposal({ ...p, elements: [{ ...p.elements[0], id: 'invented' }] }, catalog), /unavailable/);
 assert.throws(() => validateProposal({ ...p, elements: [p.elements[0],p.elements[0]] }, catalog), /duplicated/);
 assert.throws(() => validateProposal({ ...p, elements: [{ ...p.elements[0], parentId: orb.id }] }, catalog), /directly/);
 assert.throws(() => validateProposal({ ...p, appType: 'made-up' }, catalog), /unavailable/);
});
test('questions are allowed without proposals; malformed model text cannot configure an app', () => {
 assert.equal(parseCreationAnswer(JSON.stringify({ message: 'Who uses it?', questions: ['Who is it for?'], suggestions: [], proposal: null }), catalog).proposal, null);
 assert.throws(() => parseCreationAnswer('I have built your app!', catalog), /readable/);
 assert.throws(() => parseCreationAnswer(JSON.stringify({message:'x',questions:[],suggestions:[],proposal:{...proposal(),elements:[]}}),catalog),/one and eight/);
});
test('open questions carry bounded choices tied to their exact wording', () => {
 const answer=parseCreationAnswer(JSON.stringify({message:'Choose a note format',questions:['Title and text, or just text?'],decisionChoices:[{question:'Title and text, or just text?',options:['Title and text','Just text'],recommended:'Title and text'}],suggestions:[],proposal:null}),catalog);
 assert.equal(answer.decisionChoices[0].recommended,'Title and text');
 assert.throws(()=>parseCreationAnswer(JSON.stringify({message:'Choose',questions:['One?'],decisionChoices:[{question:'Different?',options:['A','B']}],suggestions:[],proposal:null}),catalog),/do not match/);
 assert.deepEqual(parseCreationAnswer(JSON.stringify({message:'Choose',questions:['One?'],suggestions:[],proposal:null}),catalog).decisionChoices,[]);
});
test('interview asks one decision per turn and rejects grouped model questions', () => {
 assert.match(creationPrompt([], catalog), /Ask exactly one focused question per turn/);
 assert.match(creationPrompt([], catalog), /ask the next essential question in a new turn/);
 assert.throws(() => parseCreationAnswer(JSON.stringify({ message: 'Choose', questions: ['First?', 'Second?'], suggestions: [], proposal: null }), catalog), /invalid list/);
});
test('accepted proposal uses a successful runtime handshake and preserves blank input', () => {
 const blank = createBlankApp();const result = connectAppProposal(proposal(), blank, catalog);
 assert.equal(result.manifest.appCreation,'ready');assert.equal(result.manifest.contracts.length,1);
 assert.equal(result.manifest.contracts[0].handshakeStatus,'SUCCESS');assert.equal(blank.contracts.length,0);
 assert.equal(result.manifest.sockets.filter(s=>s.connectedItem).length,1);
 for(const c of result.manifest.contracts)closeConnectionByAgreement(c.contractId,c,'test cleanup');
 assert.throws(()=>connectAppProposal(proposal(),result.manifest,catalog),/new, empty/);
});
test('insufficient resource budget refuses the proposal without populating the blank app', () => {
 const blank=createBlankApp();blank.hardwareBudget={...blank.hardwareBudget,memoryMB:0,threads:0};
 assert.throws(()=>connectAppProposal(proposal(),blank,catalog));
 assert.ok(blank.sockets.every(s=>!s.connectedItem));assert.equal(blank.appCreation,'draft');
});

test('selected satellites and actuators preserve the requested hierarchy', () => {
 const satellite = { ...orb, id: 'test-satellite', name: 'Validator', category: 'Satellites' as const };
 const actuator = { ...orb, id: 'test-actuator', name: 'Validate input', category: 'Actuators' as const };
 const inventory = [...catalog, satellite, actuator];
 const p=proposal();p.elements.push({id:satellite.id,parentId:orb.id,reason:'Check input'},{id:actuator.id,parentId:satellite.id,reason:'Perform check'});
 const built=connectAppProposal(p,createBlankApp(),inventory);
 const socket=built.manifest.sockets.find(s=>s.connectedItem)!;
 assert.deepEqual(socket.connectedItem?.satellites,[satellite.id]);
 assert.deepEqual(socket.attachedSatellites?.map(s=>s.id),[satellite.id]);
 assert.deepEqual(built.catalog.find(i=>i.id===satellite.id)?.actuators,[actuator.id]);
 for(const c of built.manifest.contracts)closeConnectionByAgreement(c.contractId,c,'test cleanup');
});

test('explicitly empty Satellite lists do not inherit unrelated catalog Satellites', async () => {
 const { getElementChildren } = await import('./relationEngine');
 assert.deepEqual(getElementChildren({ ...orb, satellites: [] }, catalog), []);
});

test('model-only Orbs without registered contracts cannot be proposed for connection', () => {
 const unregistered={...orb,id:'unregistered-orb',umbilicalContractRef:undefined};
 const p=proposal();p.elements=[{id:unregistered.id,parentId:null,reason:'Requested service'}];
 assert.throws(()=>validateProposal(p,[...catalog,unregistered]),/registered Orb contract/);
});

test('accepted architecture carries pending construction and agreed context into its saved manifest', () => {
 const p = proposal(); p.gaps = ['Create projects and tasks tables; statuses: To Do, In Progress, Done', 'Build notebook views and CRUD handlers'];
 const blank = createBlankApp();
 const built = connectAppProposal(p, blank, catalog, 'Architect chose plain notes and three task statuses.');
 try {
  const saved = JSON.parse(JSON.stringify(built.manifest));
  assert.deepEqual(saved.appBuildPlan.items.slice(0, 2).map((item: any) => item.text), p.gaps);
  assert.match(saved.appBuildPlan.items[2].text, /Verify the requested app/);
  assert.ok(saved.appBuildPlan.items.every((i: any) => !i.verification));
  assert.equal(saved.appBuildPlan.proposal.purpose, p.purpose);
  assert.match(saved.appBuildPlan.decisions, /plain notes/);
  assert.equal(saved.appBuildPlan.invitation, 'pending');
  assert.equal(blank.appBuildPlan, undefined);
 } finally { for(const c of built.manifest.contracts)closeConnectionByAgreement(c.contractId,c,'test cleanup'); }
});
