/* Recompute early-candidate score metadata against exit order used by the
 * strict contract. The level and route are untouched; this only repairs the
 * evidence record where an old producer counted drag steps instead of exits. */
import fs from 'node:fs';
import path from 'node:path';
import { evidenceCheck, openingAudit } from './round3-contract.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const inputRows = [
  ...(JSON.parse(fs.readFileSync(path.join(ROOT, 'deliverables/league-regeneration-20261005/round3/early-fixes/accepted-8-13-18.json'), 'utf8')).rows ?? []),
  ...[13, 18].map(index => JSON.parse(fs.readFileSync(path.join(ROOT, `deliverables/league-regeneration-20261006/early-repair/formal-${index}.json`), 'utf8'))),
];
const runtime = await loadContinuationRuntime();
const rows = [];
for (const row of inputRows) {
  if (!row.level || !Array.isArray(row.drags)) continue;
  const exits = row.drags.filter(drag => drag.exitSide);
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const firstExit = new Map();
  exits.forEach((drag, index) => { if (!firstExit.has(drag.blockId)) firstExit.set(drag.blockId, index + 1); });
  const filled = shape => {
    const xs = shape.map(p => p[0]); const ys = shape.map(p => p[1]);
    return shape.length > 0 && shape.length === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1) && new Set(shape.map(p => p.join(','))).size === shape.length;
  };
  const selected = row.level.blocks.filter(block => !block.shutterId && filled(block.shape) && (firstExit.get(block.id) ?? Infinity) >= lateThreshold)
    .sort((a, b) => (firstExit.get(a.id) ?? Infinity) - (firstExit.get(b.id) ?? Infinity) || a.id.localeCompare(b.id))
    .slice(0, 3).map(block => ({ blockId: block.id, clearEvent: firstExit.get(block.id), points: 10 }));
  const scoreBlocks = { status: selected.length >= 1 && selected.length <= 3 ? 'PASS' : 'BLOCKED', selected, lateThreshold, completeExitEvents: exits.length, totalPoints: selected.length * 10, runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY' };
  const candidate = { index: row.index, target: row.target ?? (row.index === 8 || row.index === 13 || row.index === 18 ? { lower: 21, upper: 30 } : { lower: 16, upper: 20 }), level: row.level, levelSha256: row.levelSha256, routeSha256: row.routeSha256, drags: row.drags, route: row.route, replay: row.replay, lowerBound: row.lowerBound, scoreBlocks };
  const contract = await evidenceCheck({ ...candidate, formalEligibility: true }, { strictQ0: true, replayRoute: async (level, drags) => runtime.replayRevisedRoute(level, drags) });
  rows.push({ index: row.index, status: contract.status === 'PASS' ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED', formalEligibility: contract.status === 'PASS', difficulty: row.difficulty, target: candidate.target, accepted: contract.status === 'PASS' ? candidate : null, candidate, scoreBlocks, contract, opening: openingAudit(row.level) });
}
const outPath = path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair/early-score-rebound.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, `${JSON.stringify({ schemaVersion: 1, status: rows.every(row => row.formalEligibility) ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES', rows, productionChanged: false }, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outPath).replaceAll('\\', '/'), rows: rows.map(row => ({ index: row.index, status: row.status, errors: row.contract.errors, selected: row.scoreBlocks.selected })) }, null, 2));
