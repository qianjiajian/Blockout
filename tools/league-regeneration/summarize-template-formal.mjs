/* Aggregate the three isolated template audits without changing adoption data. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = 'deliverables/league-regeneration-20261005/template';
const candidateFile = path.join(root, 'mainline-template-candidates.json');
const candidateSha256 = createHash('sha256').update(fs.readFileSync(candidateFile)).digest('hex');
const files = ['formal-1-33.json', 'formal-34-66.json', 'formal-67-100.json'];
const reports = files.map(file => ({ file, value: JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) }));
const rows = reports.flatMap(({ file, value }) => (value.rows ?? []).map(row => ({ file, row })));
const strictAccepted = ({ row }) => row.formalEligibility === true
  && (row.status === 'FORMAL_CANDIDATE_READY' || row.status === 'PASS');
const accepted = rows.filter(strictAccepted).map(({ row }) => row.index).sort((a, b) => a - b);
const missing = Array.from({ length: 100 }, (_, i) => i + 1).filter(index => !accepted.includes(index));
const reasons = {};
for (const { row } of rows) {
  const list = row.reasons ?? row.blockedReasons ?? row.failureReasons ?? [];
  for (const reason of list) {
    const key = String(reason).slice(0, 180);
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
}
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'deliverables/league-regeneration-20261005/template/mainline-template-candidates.json',
  sourceSha256: candidateSha256,
  reports: reports.map(({ file, value }) => ({ file: path.join(root, file), range: value.range, rows: (value.rows ?? []).length })),
  count: 100,
  acceptedCount: accepted.length,
  accepted,
  missing,
  thresholds: { hard: { lower: 16, upper: 20 }, super: { lower: 21, upper: 30 } },
  scorePolicy: { specialBlockPoints: 10, specialCount: '1–3', lateHalfRequired: true, successfulRunOnly: true },
  finiteSearch: { noInfiniteRetry: true, perRangeReports: true },
  failureReasonHistogram: reasons,
  formalDataReady: accepted.length === 100,
  productionDataUpdated: false,
  selectorUpdated: false,
  status: accepted.length === 100 ? 'FORMAL_DATA_READY_FOR_ADOPTION' : 'FORMAL_DATA_BLOCKED',
};
const output = path.join(root, 'formal-template-status.json');
fs.writeFileSync(output, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ output, status: summary.status, accepted: summary.acceptedCount, missing: summary.missing.length }, null, 2));
