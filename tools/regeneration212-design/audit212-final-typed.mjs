import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { audit212FinalStatic, loadAudit212Api } from './audit212-final-static.mjs';

const beforeFile = 'deliverables/continue211-220-20260930/final212/qualified212.json';
const typedFile = 'deliverables/continue211-220-20260930/final212/qualified212-typed.json';
const out = 'deliverables/continue211-220-20260930/design212-new/independent-source-static212-final59-typed.json';
const fileHash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert(!fs.existsSync(out), 'Append-only audit output already exists');
const before = JSON.parse(fs.readFileSync(beforeFile));
const typed = JSON.parse(fs.readFileSync(typedFile));
const gameplay = packet => {
  const level = structuredClone(packet.level);
  delete level.mechanismAdaptation;
  return level;
};
assert.deepEqual(gameplay(typed), gameplay(before), 'Only explanatory mechanismAdaptation may change');
assert.deepEqual(typed.drags, before.drags, 'Complete route must remain unchanged');
const oldMeta = before.level.mechanismAdaptation;
const meta = typed.level.mechanismAdaptation;
assert.deepEqual(Object.keys(meta).sort(), ['change', 'sourceFactsFile', 'userAuthorized']);
assert.equal(typeof meta.userAuthorized, 'string');
assert(meta.userAuthorized.trim().length > 0);
assert.equal(meta.sourceFactsFile, oldMeta.sourceFactsFile);
assert(meta.change.includes(oldMeta.ruleConflict), 'Source conflict explanation must be preserved');
assert(meta.change.includes(oldMeta.change), 'Authored differences must be preserved');
const report = audit212FinalStatic(typed.level, await loadAudit212Api(), typed.drags);
assert.equal(report.levelSha256, typed.levelSha256);
report.typedMetadataBinding = {
  status: 'PASS_EXACT_GAMEPLAY_AND_ROUTE_EQUAL',
  beforeFile, beforeFileSha256: fileHash(beforeFile), beforeLevelSha256: before.levelSha256,
  typedFile, typedFileSha256: fileHash(typedFile), typedLevelSha256: typed.levelSha256,
  changedLevelFields: ['mechanismAdaptation'],
  acceptedMetadataKeys: Object.keys(meta),
  preservedSourceConflictAndAdaptationText: true,
  gameplayAndScoreDeepEqual: true,
  routeDeepEqual: true,
  freshSearchPerformed: false,
  note: 'This checks the metadata-only binding and source/static/strict-route gates. Lower-bound certificates and dual-screen natural-clock settlement remain separately bound evidence.'
};
report.auditTool = { file: 'tools/regeneration212-design/audit212-final-typed.mjs', sha256: fileHash('tools/regeneration212-design/audit212-final-typed.mjs') };
fs.writeFileSync(out, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, levelSha256: report.levelSha256, issues: report.issues, binding: report.typedMetadataBinding.status }));
