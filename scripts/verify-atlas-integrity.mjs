// Verifies the Atlas integrity successor policy (docs/atlas-integrity/successor-policy.v1.json).
//
// Usage:
//   node scripts/verify-atlas-integrity.mjs [--root <worktree>] [--repo <git repo>] [--policy <file>] [--report <file>]
//   node scripts/verify-atlas-integrity.mjs --self-test
//
// Byte domain (A1): baseline bytes are the raw Git blob contents (`git cat-file blob <sha>`), never
// passed through checkout filters. Working-tree files are brought into the same domain before the
// comparison: for a blob that stores LF, CRLF pairs in the working file are folded to LF. The result
// therefore does not depend on core.autocrlf or the local line-ending setting. Blobs that store CR
// bytes are compared as stored. Any change other than a CRLF/LF pair is a violation in every case.
//
// Fail-closed (A2): the policy is validated before any check runs. Unknown keys, non-integer or
// negative sizes, empty or unsafe paths, unresolvable paths, unknown modes and conflicting rules stop
// the run with exit code 1.
//
// Successors (A3): a protected file may be satisfied either by its baseline bytes or by a pinned
// replacement identified by SHA-256 and size. The baseline bytes stay in Git unchanged.
//
// Exit code 0 = PASS, 1 = FAIL or invalid policy.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const repo = path.resolve(opt('--repo', process.cwd()));
const root = path.resolve(opt('--root', process.cwd()));
const policyFile = path.resolve(root, opt('--policy', 'docs/atlas-integrity/successor-policy.v1.json'));
const reportFile = opt('--report', null);

const TOP_KEYS = ['policy', 'version', 'revision', 'baseline', 'protectedRoots', 'defaultMode', 'appendOnly', 'exactPrefixes', 'successors', 'permittedNewFiles', 'eol', 'changelog'];
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const countCR = (buf) => { let n = 0; for (const b of buf) if (b === 0x0d) n++; return n; };
const isText = (buf) => !buf.includes(0x00);

function git(gitArgs, options = {}) {
  return execFileSync('git', ['-C', repo, ...gitArgs], { maxBuffer: 1 << 28, ...options });
}
function baselineTree(commit, prefix) {
  // Raw tree entries: [{ path, blob }] for every blob under prefix.
  const out = git(['ls-tree', '-r', commit, '--', prefix], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((line) => {
    const m = line.match(/^(\d+) (\w+) ([0-9a-f]{40})\t(.+)$/);
    if (!m) throw new Error('unparseable ls-tree line: ' + line);
    return { type: m[2], blob: m[3], path: m[4].replace(/\\/g, '/') };
  }).filter((e) => e.type === 'blob');
}
function rawBlob(blob) {
  return git(['cat-file', 'blob', blob]); // raw bytes: the blob domain, independent of autocrlf
}
export function toBlobDomain(bytes, blobHasCR) {
  // Bring a working-tree file into the raw blob domain (A1).
  if (blobHasCR || !isText(bytes)) return bytes;
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && bytes[i + 1] === 0x0a) continue; // the CR of a CRLF pair; the LF is kept
    out.push(bytes[i]);
  }
  return Buffer.from(out);
}
function eolStyle(bytes) {
  let crlf = 0, lf = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) { if (i > 0 && bytes[i - 1] === 0x0d) crlf++; else lf++; }
  }
  if (crlf && lf) return 'mixed';
  if (crlf) return 'CRLF';
  if (lf) return 'LF';
  return 'none';
}
function walk(dir, base, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}
const safeRel = (p) => typeof p === 'string' && p.length > 0 && !path.posix.isAbsolute(p) && !p.split('/').includes('..') && !p.includes('\\') && path.posix.normalize(p) === p;
const safeDir = (p) => typeof p === 'string' && p.endsWith('/') && safeRel(p.slice(0, -1));

// ---- A2: fail-closed policy validation ------------------------------------------------------
export function validatePolicy(policy, { commitExists, baselinePaths }) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return ['policy must be a JSON object'];
  for (const k of Object.keys(policy)) if (!TOP_KEYS.includes(k)) fail(`unknown top-level key: ${k}`);
  if (policy.policy !== 'atlas-integrity-successor') fail('policy must be "atlas-integrity-successor"');
  if (!Number.isSafeInteger(policy.version) || policy.version !== 1) fail('version must be the integer 1');
  if (!policy.baseline || typeof policy.baseline !== 'object') fail('baseline object is required');
  else if (!HEX40.test(policy.baseline.commit ?? '')) fail('baseline.commit must be a 40-character lowercase hex SHA');
  else if (!commitExists(policy.baseline.commit)) fail('baseline.commit does not resolve in the repository');
  if (!Array.isArray(policy.protectedRoots) || policy.protectedRoots.length === 0) fail('protectedRoots must be a non-empty array');
  else for (const r of policy.protectedRoots) {
    if (!safeDir(r)) fail(`protectedRoots entry is not a safe directory path: ${String(r)}`);
    else if (!baselinePaths.some((b) => b.startsWith(r))) fail(`protectedRoots entry resolves to no baseline files: ${r}`);
  }
  if (policy.defaultMode !== 'exact') fail('defaultMode must be "exact"');
  const baseline = new Set(baselinePaths);
  const appendPaths = new Set();
  if (!Array.isArray(policy.appendOnly)) fail('appendOnly must be an array');
  else for (const rule of policy.appendOnly) {
    if (!rule || typeof rule !== 'object') { fail('appendOnly entry must be an object'); continue; }
    if (!safeRel(rule.path)) fail(`appendOnly path is unsafe: ${String(rule.path)}`);
    else if (!baseline.has(rule.path)) fail(`appendOnly path is not in the baseline: ${rule.path}`);
    if (!Number.isSafeInteger(rule.maxAppendBytes) || rule.maxAppendBytes < 0) fail(`maxAppendBytes must be a non-negative integer for ${String(rule.path)}`);
    if (appendPaths.has(rule.path)) fail(`duplicate appendOnly rule: ${rule.path}`);
    appendPaths.add(rule.path);
  }
  if (!Array.isArray(policy.exactPrefixes)) fail('exactPrefixes must be an array');
  else for (const rule of policy.exactPrefixes) {
    if (!rule || !safeDir(rule.prefix)) { fail(`exactPrefixes entry has an unsafe prefix: ${String(rule?.prefix)}`); continue; }
    for (const p of appendPaths) if (p.startsWith(rule.prefix)) fail(`conflict: ${p} is append-only but lies under exact prefix ${rule.prefix}`);
    if (!baselinePaths.some((p) => p.startsWith(rule.prefix))) fail(`exact prefix matches no baseline file: ${rule.prefix}`);
  }
  const exactList = Array.isArray(policy.exactPrefixes) ? policy.exactPrefixes.map((r) => r?.prefix).filter((x) => typeof x === 'string') : [];
  if (!Array.isArray(policy.successors)) fail('successors must be an array');
  else for (const rule of policy.successors) {
    if (!safeRel(rule?.path) || !baseline.has(rule.path)) { fail(`successor path must be a baseline file: ${String(rule?.path)}`); continue; }
    if (exactList.some((pre) => rule.path.startsWith(pre))) { fail(`successor targets an exact-prefix path (exactPrefixes take precedence): ${rule.path}`); continue; }
    if (!Array.isArray(rule.permittedReplacements) || rule.permittedReplacements.length === 0) { fail(`successor ${rule.path} needs permittedReplacements`); continue; }
    for (const rep of rule.permittedReplacements) {
      if (!HEX64.test(rep?.sha256 ?? '')) fail(`successor sha256 must be 64 hex characters for ${rule.path}`);
      if (!Number.isSafeInteger(rep?.bytes) || rep.bytes <= 0) fail(`successor bytes must be a positive integer for ${rule.path}`);
    }
  }
  if (!Array.isArray(policy.permittedNewFiles)) fail('permittedNewFiles must be an array');
  else for (const rule of policy.permittedNewFiles) {
    if (!safeRel(rule?.path)) fail(`permittedNewFiles path is unsafe: ${String(rule?.path)}`);
    else if (baseline.has(rule.path)) fail(`permittedNewFiles path is already in the baseline: ${rule.path}`);
    if (!HEX64.test(rule?.sha256 ?? '')) fail(`permittedNewFiles sha256 must be 64 hex characters for ${String(rule?.path)}`);
    if (!Number.isSafeInteger(rule?.bytes) || rule.bytes <= 0) fail(`permittedNewFiles bytes must be a positive integer for ${String(rule?.path)}`);
  }
  if (typeof policy.eol !== 'string' || policy.eol.length === 0) fail('eol must describe the byte domain');
  return errors;
}

// ---- verification -------------------------------------------------------------------------
export function checkFile({ rel, mode, maxAppendBytes = 0, baseline, current, successors = [] }) {
  const violations = [];
  if (current === undefined) return { rel, mode, violations: ['protected file missing from working tree'] };
  if (mode === 'append-only') {
    if (current.length < baseline.length) violations.push('file shrank below baseline length');
    else if (!current.subarray(0, baseline.length).equals(baseline)) violations.push('historical bytes changed (prefix mismatch)');
    const appended = current.length > baseline.length ? current.subarray(baseline.length) : Buffer.alloc(0);
    if (appended.length > maxAppendBytes) violations.push(`appended ${appended.length} bytes exceeds permitted ${maxAppendBytes}`);
    return {
      rel, mode, baselineSha256: sha256(baseline), baselineBytes: baseline.length,
      appendedRange: appended.length ? { startByte: baseline.length, endByte: current.length, bytes: appended.length, sha256: sha256(appended), crCount: countCR(appended) } : null,
      violations,
    };
  }
  const digest = sha256(current);
  if (current.equals(baseline)) return { rel, mode: 'exact', baselineSha256: sha256(baseline), currentSha256: digest, violations };
  const match = successors.find((s) => s.sha256 === digest && s.bytes === current.length);
  if (match) return { rel, mode: 'successor', baselineSha256: sha256(baseline), currentSha256: digest, violations };
  violations.push('bytes differ from baseline (exact mode) and match no pinned successor');
  return { rel, mode: 'exact', baselineSha256: sha256(baseline), currentSha256: digest, violations };
}

// Precedence (R1): an exact prefix decides the mode before any appendOnly or successor rule is consulted.
export function modeFor(rel, policy) {
  if (policy.exactPrefixes.some((r) => rel.startsWith(r.prefix))) return { mode: 'exact', rule: null, successors: [] };
  const rule = policy.appendOnly.find((r) => r.path === rel);
  if (rule) return { mode: 'append-only', rule, successors: [] };
  const succ = policy.successors.find((r) => r.path === rel);
  return { mode: 'exact', rule: null, successors: succ ? succ.permittedReplacements : [] };
}

// Guard (R2): a run that evaluates no protected file is a failure, never a PASS.
export function guardNonEmpty(results) {
  const evaluated = results.filter((r) => r.mode !== 'new' && r.mode !== 'permitted-new');
  return evaluated.length === 0 ? ['no protected baseline files were evaluated (filesChecked is 0)'] : [];
}

function runVerification(policy, rootDir) {
  const commit = policy.baseline.commit;
  const tree = policy.protectedRoots.flatMap((prefix) => baselineTree(commit, prefix.slice(0, -1)));
  const results = [];
  for (const entry of tree) {
    const rel = entry.path;
    const raw = rawBlob(entry.blob);
    const working = fs.existsSync(path.join(rootDir, rel)) ? fs.readFileSync(path.join(rootDir, rel)) : undefined;
    const current = working === undefined ? undefined : toBlobDomain(working, raw.includes(0x0d));
    const decided = modeFor(rel, policy);
    const result = checkFile({ rel, mode: decided.mode, maxAppendBytes: decided.rule?.maxAppendBytes ?? 0, baseline: raw, current, successors: decided.successors });
    if (working !== undefined) result.workingEol = eolStyle(working);
    results.push(result);
  }
  const baselineSet = new Set(tree.map((e) => e.path));
  for (const prefix of policy.protectedRoots) {
    for (const rel of walk(path.join(rootDir, prefix), rootDir).filter((r) => r.startsWith(prefix))) {
      if (baselineSet.has(rel)) continue;
      const allowed = policy.permittedNewFiles.find((p) => p.path === rel);
      if (!allowed) { results.push({ rel, mode: 'new', violations: ['file not in baseline and not listed in permittedNewFiles'] }); continue; }
      const bytes = toBlobDomain(fs.readFileSync(path.join(rootDir, rel)), false);
      const digest = sha256(bytes);
      const ok = digest === allowed.sha256 && bytes.length === allowed.bytes;
      results.push({ rel, mode: 'permitted-new', currentSha256: digest, violations: ok ? [] : ['new file does not match its pinned sha256 and size'] });
    }
  }
  return results;
}

function summarise(results, policy) {
  const violations = results.flatMap((r) => r.violations.map((v) => ({ path: r.rel, violation: v })));
  return {
    policy: policy.policy,
    policyVersion: policy.version,
    policyRevision: policy.revision ?? null,
    baselineCommit: policy.baseline.commit,
    byteDomain: 'raw Git blob bytes; working-tree CRLF folded to LF for LF blobs',
    filesChecked: results.length,
    successorMatches: results.filter((r) => r.mode === 'successor').map((r) => ({ path: r.rel, sha256: r.currentSha256 })),
    appendedRanges: results.filter((r) => r.appendedRange).map((r) => ({ path: r.rel, ...r.appendedRange })),
    workingEol: results.filter((r) => r.workingEol).map((r) => ({ path: r.rel, eol: r.workingEol })),
    violations,
    result: violations.length ? 'FAIL' : 'PASS',
  };
}

function selfTest(policy, baselinePaths) {
  const outcomes = [];
  const record = (name, expectPass, passed) => outcomes.push({ name, expectedPass: expectPass, actualPass: passed, ok: passed === expectPass });
  // A1 and append rules: baseline is raw blob LF text.
  const base = Buffer.from('line one\n\nline two\n');
  const crlf = Buffer.from('line one\r\n\r\nline two\r\n');
  const exact = (cur) => checkFile({ rel: 'self-test', mode: 'exact', baseline: base, current: cur }).violations.length === 0;
  record('A1: LF working file equals the raw blob', true, exact(toBlobDomain(base, false)));
  record('A1: CRLF working file folds to the same raw blob domain', true, exact(toBlobDomain(crlf, false)));
  record('A1: one content byte changed fails', false, exact(toBlobDomain(Buffer.from('line 0ne\n\nline two\n'), false)));
  record('A1: a bare CR that is not part of CRLF is kept and fails', false, exact(toBlobDomain(Buffer.from('line one\r\n\rline two\n'), false)));
  record('A1: blobs that store CR are compared as stored', true, checkFile({ rel: 'self-test', mode: 'exact', baseline: crlf, current: toBlobDomain(crlf, true) }).violations.length === 0);
  const app = (cur, max) => checkFile({ rel: 'self-test', mode: 'append-only', maxAppendBytes: max, baseline: base, current: cur }).violations.length === 0;
  record('append-only: permitted append passes', true, app(Buffer.concat([base, Buffer.from('note\n')]), 64));
  record('append-only: edit inside history fails', false, app(Buffer.from('line one\n\nline TWO\nnote\n'), 64));
  record('append-only: truncation fails', false, app(Buffer.from('line one\n'), 64));
  record('append-only: append over permitted size fails', false, app(Buffer.concat([base, Buffer.from('too long\n')]), 4));
  record('missing protected file fails', false, checkFile({ rel: 'self-test', mode: 'exact', baseline: base, current: undefined }).violations.length === 0);
  // A3: pinned successors.
  const repl = Buffer.from('replacement\n');
  const pin = [{ sha256: sha256(repl), bytes: repl.length }];
  const succ = (cur) => checkFile({ rel: 'self-test', mode: 'exact', baseline: base, current: cur, successors: pin }).violations.length === 0;
  record('A3: pinned successor passes', true, succ(repl));
  record('A3: unpinned replacement fails', false, succ(Buffer.from('other\n')));
  record('A3: pinned digest with a wrong size fails', false, succ(Buffer.concat([repl, Buffer.from('x')])));
  // A2: malformed policies are rejected before any check runs.
  const ctx = { commitExists: () => true, baselinePaths };
  const good = JSON.parse(JSON.stringify(policy));
  const badCases = [
    ['A2: string maxAppendBytes rejected', (p) => { p.appendOnly[0].maxAppendBytes = '12'; }],
    ['A2: fractional maxAppendBytes rejected', (p) => { p.appendOnly[0].maxAppendBytes = 1.5; }],
    ['A2: negative maxAppendBytes rejected', (p) => { p.appendOnly[0].maxAppendBytes = -1; }],
    ['A2: empty protectedRoots rejected', (p) => { p.protectedRoots = []; }],
    ['A2: parent-directory path rejected', (p) => { p.appendOnly[0].path = '../escape.md'; }],
    ['A2: unresolvable appendOnly path rejected', (p) => { p.appendOnly[0].path = 'public/atlas/does-not-exist.md'; }],
    ['A2: invalid defaultMode rejected', (p) => { p.defaultMode = 'loose'; }],
    ['A2: exact prefix conflicting with an append-only file rejected', (p) => { p.exactPrefixes.push({ prefix: 'public/atlas/' }); }],
    ['A2: unknown top-level key rejected', (p) => { p.surprise = true; }],
    ['A2: malformed baseline commit rejected', (p) => { p.baseline.commit = 'HEAD'; }],
    ['A2: successor sha256 that is not 64 hex rejected', (p) => { p.successors[0].permittedReplacements[0].sha256 = 'abc'; }],
  ];
  for (const [name, mutate] of badCases) {
    const p = JSON.parse(JSON.stringify(good));
    mutate(p);
    record(name, false, validatePolicy(p, ctx).length === 0);
  }
  record('A2: the shipped policy validates', true, validatePolicy(good, ctx).length === 0);
  const r1 = JSON.parse(JSON.stringify(good));
  r1.successors.push({ path: 'public/atlas/_archive/ui-build-2026-11-03/index.html', permittedReplacements: [{ sha256: '0'.repeat(64), bytes: 1 }] });
  record('R1: successor under an exact prefix is rejected', false, validatePolicy(r1, ctx).length === 0);
  const r1b = JSON.parse(JSON.stringify(good));
  r1b.successors = []; r1b.appendOnly = []; r1b.exactPrefixes.push({ prefix: 'public/atlas/atlas.js' });
  record('R1: a file under exactPrefixes never resolves to append-only or successor mode', true, modeFor('public/atlas/atlas.js', r1b).mode === 'exact' && modeFor('public/atlas/atlas.js', r1b).successors.length === 0);
  const r2 = JSON.parse(JSON.stringify(good));
  r2.protectedRoots = ['does-not-exist/']; r2.appendOnly = []; r2.exactPrefixes = []; r2.successors = []; r2.permittedNewFiles = [];
  record('R2: a root that resolves to no baseline files is rejected', false, validatePolicy(r2, ctx).length === 0);
  record('R2: a run that evaluates zero files fails', false, guardNonEmpty([]).length === 0);
  record('R2: a run that evaluates files passes the guard', true, guardNonEmpty([{ rel: 'a', mode: 'exact', violations: [] }]).length === 0);
  return { policy: policy.policy, selfTest: outcomes, result: outcomes.every((o) => o.ok) ? 'PASS' : 'FAIL' };
}

// ---- main ----------------------------------------------------------------------------------
let policy;
try { policy = JSON.parse(fs.readFileSync(policyFile, 'utf8')); } catch (e) { console.log(JSON.stringify({ result: 'FAIL', policyErrors: ['cannot read policy: ' + e.message] }, null, 2)); process.exit(1); }
const commitExists = (sha) => { try { git(['cat-file', '-e', `${sha}^{commit}`]); return true; } catch { return false; } };
const baselinePaths = (HEX40.test(policy?.baseline?.commit ?? '') && commitExists(policy.baseline.commit) && Array.isArray(policy.protectedRoots))
  ? policy.protectedRoots.filter(safeDir).flatMap((prefix) => baselineTree(policy.baseline.commit, prefix.slice(0, -1)).map((e) => e.path))
  : [];

if (args.includes('--self-test')) {
  const out = selfTest(policy, baselinePaths);
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.result === 'PASS' ? 0 : 1);
}

const schemaErrors = validatePolicy(policy, { commitExists, baselinePaths });
if (schemaErrors.length) {
  console.log(JSON.stringify({ policy: policy.policy ?? null, result: 'FAIL', policyErrors: schemaErrors }, null, 2));
  process.exit(1);
}
const results = runVerification(policy, root);
const guard = guardNonEmpty(results);
if (guard.length) {
  console.log(JSON.stringify({ policy: policy.policy, result: 'FAIL', policyErrors: guard, filesChecked: 0 }, null, 2));
  process.exit(1);
}
const report = summarise(results, policy);
const json = JSON.stringify(report, null, 2);
if (reportFile) fs.writeFileSync(path.resolve(root, reportFile), json + '\n');
console.log(json);
process.exit(report.result === 'PASS' ? 0 : 1);
