import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'deliverables/league-regeneration-20261005/round2/early/source198-stripped-early-candidates.json');
const outputPath = path.join(root, 'deliverables/league-regeneration-20261005/round2/early/source198-stripped-early-formal.json');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const rows = source.rows.filter(row => row.accepted === true).map(row => ({
  index: row.index,
  difficulty: 'super',
  target: { lower: 21, upper: 30 },
  status: 'FORMAL_CANDIDATE_READY',
  adaptation: row.adaptation ?? source.adaptation ?? null,
  accepted: {
    sourceLevelId: row.sourceLevelId,
    fingerprint: row.fingerprint,
    levelSha256: row.fingerprint,
    routeSha256: row.routeSha256,
    level: row.level,
    drags: row.drags,
    lowerBound: row.lowerBound,
    route: row.route,
    replay: row.replay,
    scoreBlocks: {
      status: row.score.status,
      selected: row.score.selected,
      lateThreshold: row.score.lateThreshold,
      completeExitEvents: row.score.completeExitEvents,
      totalPoints: row.score.totalPoints,
      runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
    },
  },
  formalEligibility: true,
}));
const report = {
  status: 'FORMAL_CANDIDATES_READY',
  generatedAt: new Date().toISOString(),
  input: path.relative(root, inputPath).replaceAll('\\', '/'),
  range: [3, 18],
  adaptation: source.adaptation ?? null,
  accepted: rows.length,
  blocked: [],
  rows,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, outputPath).replaceAll('\\', '/'), accepted: rows.length, indexes: rows.map(row => row.index) }, null, 2));
