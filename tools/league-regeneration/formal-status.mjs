import fs from 'node:fs';
import path from 'node:path';

const root = 'deliverables/league-regeneration-20261004/formal';
const early = JSON.parse(fs.readFileSync(path.join(root, 'early-1-19.json'), 'utf8'));
const targetedPath = path.join(root, 'early-targeted-latest.json');
const targeted = fs.existsSync(targetedPath) ? JSON.parse(fs.readFileSync(targetedPath, 'utf8')) : undefined;
const mid = JSON.parse(fs.readFileSync(path.join(root, 'mid-20-64.json'), 'utf8'));
const late = JSON.parse(fs.readFileSync(path.join(root, 'late-65-100.json'), 'utf8'));
const supplementalPaths = ['mid-63-finite-retry-subagent.json', 'mid-63-finite-retry.json', 'mid-63-retile-retry.json', 'level96-finite-retry.json', 'level14-finite-retry.json', 'level16-finite-retry.json', 'hard20-retile-finite.json', 'hard20-bound-review.json', 'super23-finite-retry.json'];
const supplementalRetries = supplementalPaths.flatMap(file => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return [];
  const report = JSON.parse(fs.readFileSync(full, 'utf8'));
  const attempts = report.attempts ?? report.rows ?? [];
  return [{
    report: full,
    index: report.index ?? report.range?.[0],
    status: report.status,
    finite: report.finite === true || report.finitePolicy?.infiniteRetry === false || report.finitePolicy?.noInfiniteRetry === true || report.noInfiniteRetry === true,
    attempts: attempts.length,
    accepted: Boolean(report.accepted),
    failureReasons: [...new Set(attempts.flatMap(row => Array.isArray(row.failureReasons) ? row.failureReasons : row.reason ? [row.reason] : []))].slice(0, 12),
  }];
});
const earlyRows = early.acceptedRows ?? [];
const midRows = (mid.rows ?? []).filter(row => row.formalEligibility === true || /ACCEPT|PASS/i.test(row.status ?? ''));
const lateRows = (late.accepted ?? []).map(row => ({ index: row.index, status: 'accepted', specials: row.specials ?? [] }));
const accepted = [...earlyRows.map(row => row.index), ...midRows.map(row => row.index), ...lateRows.map(row => row.index)].sort((a, b) => a - b);
const all = Array.from({ length: 100 }, (_, offset) => offset + 1);
const missing = all.filter(index => !accepted.includes(index));
const status = {
  status: accepted.length === 100 ? 'FORMAL_DATA_READY_FOR_ADOPTION' : 'FORMAL_DATA_BLOCKED',
  generatedAt: new Date().toISOString(),
  count: 100,
  acceptedCount: accepted.length,
  accepted,
  missing,
  constraints: {
    cadence: 'hard, hard, super, hard, hard repeating; super lower 21–30; hard lower 16–20',
    specialCount: '1–3 per level',
    specialShape: 'filled axis-aligned rectangle only; irregular blocks excluded',
    specialTiming: 'complete removal route step after half of clear events',
    finiteSearch: true,
    noInfiniteRetry: true,
  },
  ranges: {
    early: { report: path.join(root, 'early-1-19.json'), accepted: earlyRows.map(row => row.index), unresolved: early.unresolved ?? [], targeted: targeted ? { report: targetedPath, accepted: (targeted.accepted ?? []).map(row => row.index), attempts: targeted.rows?.filter(row => row.attempt !== undefined).length ?? 0 } : undefined },
    mid: { report: path.join(root, 'mid-20-64.json'), accepted: midRows.map(row => row.index), blocked: (mid.rows ?? []).filter(row => row.formalEligibility !== true).map(row => row.sourceIndex ?? row.index) },
    late: { report: path.join(root, 'late-65-100.json'), accepted: lateRows.map(row => row.index), blocked: late.blocked?.map(row => row.index) ?? [] },
  },
  supplementalRetries,
  selectorUpdated: false,
  productionDataUpdated: false,
};
fs.writeFileSync(path.join(root, 'formal-status.json'), JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify({ status: status.status, accepted: status.acceptedCount, missing: status.missing.length, output: path.join(root, 'formal-status.json') }));
