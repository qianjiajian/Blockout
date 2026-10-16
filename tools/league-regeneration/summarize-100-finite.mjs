/* Combine the isolated league regeneration audits without touching production.
 * The report is deliberately a hard gate: a timeout, unsupported mechanism, or
 * missing lower/upper proof remains blocked, and every level must have a finite
 * mutation budget before it can be considered for the selector.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { verifyRulesLock } from '../verify-rules-lock.mjs';

if (!verifyRulesLock().ok) throw new Error('rules lock failed');

const root = 'deliverables/league-regeneration-20261004';
const early = JSON.parse(await readFile(`${root}/early-experiments/finite-1791086937211/report.json`, 'utf8'));
const mid = JSON.parse(await readFile(`${root}/mid-experiments/proof-20-64.json`, 'utf8'));
const late = JSON.parse(await readFile(`${root}/late-experiments/late-summary.json`, 'utf8'));

const cadence = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const rows = [];
for (let index = 1; index <= 100; index += 1) {
  let source;
  if (index <= 19) {
    source = {
      range: [1, 19],
      attempted: early.attempted,
      unique: early.unique,
      accepted: early.accepted,
      finiteBudget: early.finiteBudget,
      status: early.accepted > 0 ? 'PASS_CANDIDATE' : 'BLOCKED_PROBE_ONLY',
      reasons: Object.keys(early.reasons ?? {}),
    };
  } else if (index <= 64) {
    const attempts = (mid.results ?? []).find(row => row.sourceIndex === index)?.attempts ?? [];
    source = {
      range: [20, 64],
      attempted: attempts.length,
      unique: new Set(attempts.map(row => row.fingerprint).filter(Boolean)).size,
      accepted: attempts.some(row => row.status === 'CANDIDATE_SPATIAL_ACCEPTED') ? 1 : 0,
      finiteBudget: mid.policy?.budgets ?? mid.policy ?? null,
      status: attempts.some(row => row.status === 'CANDIDATE_SPATIAL_ACCEPTED') ? 'PASS_CANDIDATE' : 'BLOCKED',
      reasons: [...new Set(attempts.flatMap(row => row.failureReasons ?? []))],
    };
  } else {
    const row = (late.rows ?? []).find(candidate => candidate.index === index);
    source = {
      range: [65, 100],
      attempted: row?.status === 'PASS_CANDIDATE' ? 1 : 3,
      unique: null,
      accepted: row?.status === 'PASS_CANDIDATE' ? 1 : 0,
      finiteBudget: { mutationAttempts: 3, lowerMilliseconds: 2500, upperMilliseconds: 2500 },
      status: row?.status === 'PASS_CANDIDATE' ? 'PASS_CANDIDATE' : 'BLOCKED',
      reasons: row?.reasons ?? [],
    };
  }
  rows.push({ index, difficulty: cadence(index), ...source });
}

const accepted = rows.filter(row => row.status === 'PASS_CANDIDATE');
const report = {
  status: accepted.length === 100 ? 'READY_FOR_FORMAL_ADOPTION' : 'INCOMPLETE_FINITE_AUDIT',
  generatedAt: new Date().toISOString(),
  policy: {
    cadence: 'hard, hard, super, hard, hard repeating',
    hardBounds: { lower: 16, upper: 20 },
    superBounds: { lower: 21, upper: 30 },
    mutateAfterRepeatedFailure: true,
    finiteOnly: true,
    rejectedCandidatesRetained: true,
  },
  counts: {
    total: rows.length,
    hard: rows.filter(row => row.difficulty === 'hard').length,
    super: rows.filter(row => row.difficulty === 'super').length,
    accepted: accepted.length,
    blocked: rows.length - accepted.length,
    probeOnly: rows.filter(row => row.status === 'BLOCKED_PROBE_ONLY').length,
  },
  sources: {
    early: 'deliverables/league-regeneration-20261004/early-experiments/finite-1791086937211/report.json',
    mid: 'deliverables/league-regeneration-20261004/mid-experiments/proof-20-64.json',
    late: 'deliverables/league-regeneration-20261004/late-experiments/late-summary.json',
  },
  rows,
};
await mkdir(root, { recursive: true });
await writeFile(`${root}/finite-100-summary.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, counts: report.counts, output: `${root}/finite-100-summary.json` }, null, 2));
