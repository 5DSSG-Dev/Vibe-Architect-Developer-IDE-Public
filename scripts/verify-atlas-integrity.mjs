// Verifies the Atlas integrity successor policy (docs/atlas-integrity/successor-policy.v1.json).
// Usage:
//   node scripts/verify-atlas-integrity.mjs [--root <worktree>] [--repo <git repo>] [--policy <file>] [--report <file>]
//   node scripts/verify-atlas-integrity.mjs --self-test
// Baseline bytes are read from git (`git show <commit>:<path>`), so the check does not trust
// any stored hash. Exit code 0 = PASS, 1 = FAIL.
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

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const countCR = (buf) => { let n = 0; for (const b of buf) if (b === 0x0d) n++; return n; };

// Baseline bytes exactly as this checkout would write them: the blob is passed through git's
// smudge filters (core.autocrlf / eol attributes) with `cat-file --filters`. Comparing raw blob
// bytes instead would flag every CRLF checkout as a mutation.
function gitBytes(commit, file) {
  const blob = execFileSync('git', ['-C', repo, 'rev-parse', `${commit}:${file}`], { encoding: 'utf8' }).trim();
  return execFileSync('git', ['-C', repo, 'cat-file', '--filters', `--path=${file}`, blob], { maxBuffer: 1 << 28 });
}
function gitList(commit, prefix) {
  return execFileSync('git', ['-C', repo, 'ls-tree', '-r', '--name-only', commit, '--', prefix], { encoding: 'utf8' })
    .split('\n').filter(Boolean).map((p) => p.replace(/\\/g, '/'));
}
function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

// Pure comparison used both for the real check and for the self-test.
export function checkFile({ rel, mode, maxAppendBytes = 0, baseline, current }) {
  const violations = [];
  if (current === undefined) return { rel, mode, violations: ['protected file missing from working tree'] };
  if (mode === 'exact') {
    if (!baseline.equals(current)) violations.push('bytes differ from baseline (exact mode)');
    return { rel, mode, baselineSha256: sha256(baseline), currentSha256: sha256(current), violations };
  }
  // append-only
  if (current.length < baseline.length) violations.push('file shrank below baseline length');
  else if (!current.subarray(0, baseline.length).equals(baseline)) violations.push('historical bytes changed (prefix mismatch)');
  const appended = current.length > baseline.length ? current.subarray(baseline.length) : Buffer.alloc(0);
  if (appended.length > maxAppendBytes) violations.push(`appended ${appended.length} bytes exceeds permitted ${maxAppendBytes}`);
  return {
    rel,
    mode,
    baselineBytes: baseline.length,
    appendedRange: appended.length ? { startByte: baseline.length, endByte: current.length, bytes: appended.length, sha256: sha256(appended), crCount: countCR(appended) } : null,
    violations,
  };
}

function runVerification({ policy, repoDir, rootDir }) {
  const results = [];
  const appendMap = new Map(policy.appendOnly.map((r) => [r.path, r]));
  const baselineFiles = policy.protectedRoots.flatMap((prefix) => gitList(policy.baseline.commit, prefix));
  for (const rel of baselineFiles) {
    const baseline = gitBytes(policy.baseline.commit, rel);
    const current = fs.existsSync(path.join(rootDir, rel)) ? fs.readFileSync(path.join(rootDir, rel)) : undefined;
    const rule = appendMap.get(rel);
    const mode = rule ? 'append-only' : 'exact';
    results.push(checkFile({ rel, mode, maxAppendBytes: rule?.maxAppendBytes ?? 0, baseline, current }));
  }
  // New files under protected roots are violations unless the policy names them.
  const baselineSet = new Set(baselineFiles);
  for (const prefix of policy.protectedRoots) {
    for (const rel of walk(path.join(rootDir, prefix), rootDir).filter((r) => r.startsWith(prefix))) {
      if (!baselineSet.has(rel) && !policy.permittedNewFiles.includes(rel)) {
        results.push({ rel, mode: 'new', violations: ['file not in baseline and not listed in permittedNewFiles'] });
      }
    }
  }
  return results;
}

function summarise(results, policy) {
  const violations = results.flatMap((r) => r.violations.map((v) => ({ path: r.rel, violation: v })));
  return {
    policy: policy.policy,
    policyVersion: policy.version,
    baselineCommit: policy.baseline.commit,
    filesChecked: results.length,
    appendedRanges: results.filter((r) => r.appendedRange).map((r) => ({ path: r.rel, ...r.appendedRange })),
    violations,
    result: violations.length ? 'FAIL' : 'PASS',
  };
}

function selfTest(policy) {
  // Synthetic checks: prove the rules reject mutations and accept only permitted appends.
  const base = Buffer.from('line one\r\nline two\r\n');
  const cases = [
    { name: 'exact: identical bytes pass', mode: 'exact', current: Buffer.from(base), expectPass: true },
    { name: 'exact: one byte changed fails', mode: 'exact', current: Buffer.from('line one\r\nline 2wo\r\n'), expectPass: false },
    { name: 'exact: LF normalisation fails', mode: 'exact', current: Buffer.from(base.toString().replace(/\r\n/g, '\n')), expectPass: false },
    { name: 'append-only: permitted append passes', mode: 'append-only', maxAppendBytes: 64, current: Buffer.concat([base, Buffer.from('note\r\n')]), expectPass: true },
    { name: 'append-only: edit inside history fails', mode: 'append-only', maxAppendBytes: 64, current: Buffer.from('line one\r\nline TWO\r\nnote\r\n'), expectPass: false },
    { name: 'append-only: truncation fails', mode: 'append-only', maxAppendBytes: 64, current: Buffer.from('line one\r\n'), expectPass: false },
    { name: 'append-only: append over permitted size fails', mode: 'append-only', maxAppendBytes: 4, current: Buffer.concat([base, Buffer.from('too long\r\n')]), expectPass: false },
    { name: 'missing protected file fails', mode: 'exact', current: undefined, expectPass: false },
  ];
  const outcomes = cases.map((c) => {
    const r = checkFile({ rel: 'self-test', mode: c.mode, maxAppendBytes: c.maxAppendBytes ?? 0, baseline: base, current: c.current });
    const passed = r.violations.length === 0;
    return { name: c.name, expectedPass: c.expectPass, actualPass: passed, ok: passed === c.expectPass };
  });
  return { policy: policy.policy, selfTest: outcomes, result: outcomes.every((o) => o.ok) ? 'PASS' : 'FAIL' };
}

const policy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
if (args.includes('--self-test')) {
  const out = selfTest(policy);
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.result === 'PASS' ? 0 : 1);
}
const results = runVerification({ policy, repoDir: repo, rootDir: root });
const report = summarise(results, policy);
const json = JSON.stringify(report, null, 2);
if (reportFile) fs.writeFileSync(path.resolve(root, reportFile), json + '\n');
console.log(json);
process.exit(report.result === 'PASS' ? 0 : 1);
