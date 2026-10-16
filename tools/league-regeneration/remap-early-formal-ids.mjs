import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const reportFile = 'deliverables/league-regeneration-20261004/formal/early-1-19.json';
const catalogFile = 'deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json';
const report = JSON.parse(fs.readFileSync(reportFile));
const runtime = await loadContinuationRuntime();
for (const row of report.acceptedRows) {
  const oldId = row.level.id; const newId = 900000 + row.index; const oldHash = sha(row.level);
  row.level.id = newId; const newHash = sha(row.level); row.levelSha256 = newHash; row.targetLeagueId = newId;
  row.idRemap = { oldId, newId, oldLevelSha256: oldHash, newLevelSha256: newHash, geometryUnchanged: true };
  if (row.proof) row.proof.sourceLevelSha256 = newHash;
  const replay = runtime.replayRevisedRoute(row.level, row.drags);
  row.replayAfterIdRemap = { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags };
}
report.idPolicy = { formalId: '900000 + league index', geometryPreservedOnRemap: true, hashRebound: 'proof.sourceLevelSha256 and levelSha256 recomputed after id remap' };
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + String.fromCharCode(10));
const catalog = JSON.parse(fs.readFileSync(catalogFile));
for (const e of catalog.entries) {
  const row = report.acceptedRows.find(x => x.index === e.index);
  Object.assign(e, { targetLeagueId: row.targetLeagueId, level: row.level, levelSha256: row.levelSha256, lowerProof: row.proof, replay: row.replayAfterIdRemap, idRemap: row.idRemap, specials: row.specials, specialEvidence: row.specialEvidence, specialAudit: row.specialEvidence });
}
catalog.idPolicy = report.idPolicy;
fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + String.fromCharCode(10));
console.log(JSON.stringify({ status: 'remapped', entries: report.acceptedRows.map(r => ({ index: r.index, id: r.level.id, hash: r.levelSha256, replay: r.replayAfterIdRemap })) }));
