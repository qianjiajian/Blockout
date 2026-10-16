import fs from 'node:fs';

const file = process.argv[2] ?? 'deliverables/league-regeneration-20261004/formal/mid-20-64.json';
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
if (report.range?.[0] !== 20 || report.range?.[1] !== 64 || report.rows?.length !== 45) errors.push('range/count');
for (const row of report.rows ?? []) {
  const expected = ((row.index - 1) % 5 === 2) ? 'super' : 'hard';
  if (row.difficulty !== expected) errors.push('cadence ' + row.index);
  const attempts = row.attempts ?? [];
  if (attempts.length > 3) errors.push('finite attempts ' + row.index);
  const fps = attempts.map(a => a.fingerprint).filter(Boolean);
  if (new Set(fps).size !== fps.length) errors.push('duplicate fingerprint ' + row.index);
  if (row.level) {
    if (row.level.id !== row.levelId) errors.push('id ' + row.index);
    if (!Array.isArray(row.specials) || row.specials.length < 1 || row.specials.length > 3) errors.push('specials ' + row.index);
    const ids = new Set((row.level.blocks ?? []).map(b => b.id));
    for (const id of row.specials ?? []) if (!ids.has(id)) errors.push('special id ' + row.index);
    const irregular = new Set(row.specialEligibilityAudit?.excludedIrregularBlockIds ?? []);
    for (const id of row.specials ?? []) if (irregular.has(id)) errors.push('irregular special ' + row.index);
    if (row.formalEligibility && row.specialAudit?.status !== 'PASS') errors.push('special timing/clear ' + row.index);
  } else if (row.specials?.length) errors.push('null level specials ' + row.index);
  if (row.formalEligibility && row.status !== 'FORMAL_CANDIDATE_READY') errors.push('bad status ' + row.index);
}
if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  rows: report.rows.length,
  accepted: report.acceptedCount,
  attempts: report.rows.reduce((n, row) => n + (row.attempts?.length ?? 0), 0),
  specialPass: report.rows.filter(row => row.specialAudit?.status === 'PASS').length,
  finite: true,
}));

