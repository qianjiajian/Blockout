import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadApi } from '../remake171-180/replay.mjs';
import { ruleGate } from '../remake171-180/common.mjs';
import { digest } from '../revised-preview-validation-v160.mjs';

const ROOT = 'deliverables/star-targets171-180-20260928';
const IDS = [171, 174, 175, 176, 177, 180];
const TARGETS = { 171: 35, 174: 47, 175: 46, 176: 51, 177: 38, 180: 35 };
const read = p => JSON.parse(fs.readFileSync(p));
const sha = p => digest(fs.readFileSync(p));
const before = read(ROOT + '/before.json'), applied = read(ROOT + '/applied.json');
const small = read('deliverables/remake171-180-20260927/pointer-1790532535624-320x568-30996/report.json');
const large = read('deliverables/remake171-180-20260927/pointer-1790532535623-496x1078-29860/report.json');
const lock = ruleGate();
assert.equal(lock.activeVersion, '1.114.0');
for (const report of [small, large]) {
  assert.equal(report.status, 'PASS');
  assert.equal(report.ruleVersion, '1.114.0');
  assert.deepEqual(report.requestedIds, IDS);
  assert.equal(report.formalDataValidated, true);
  assert.equal(report.playerSaveTouched, false);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.currentWorkspaceDrift, []);
  assert.deepEqual(report.sourceEvidenceDrift, []);
  for (const [p, h] of Object.entries(report.bindings)) assert.equal(sha(p), h, 'Pointer binding drift ' + p);
  assert.equal(report.rows.length, IDS.length);
  for (const row of report.rows) {
    assert.equal(row.status, 'PASS');
    assert.equal(row.formalObjectIdentity, true);
    assert.equal(row.candidateOverlay, false);
    assert.equal(row.final.complete, true);
    assert.equal(row.settlement.screen, 'win');
    assert.equal(row.settlement.earnedStars, 3);
    assert.equal(row.settlement.conditions.moveTarget, TARGETS[row.id]);
    assert.equal(row.settlement.conditions.moveAchieved, true);
    assert.equal(row.settlement.conditions.timeAchieved, true);
    assert.equal(row.settlement.storage.backend, 'MemoryHost');
    assert.equal(row.settlement.storage.save.bestStars[String(row.id)], 3);
    assert.equal(row.settlement.storage.save.bestMoves[String(row.id)], TARGETS[row.id]);
    assert.deepEqual(row.settlement.starImages.sort(), ['starCenter', 'starLeft', 'starRight']);
    assert.equal(row.nativeDrawAudit.rotated, 0);
    assert.equal(row.nativeDrawAudit.canvasRotationCalls, 0);
    assert.equal(row.final.moves, TARGETS[row.id]);
    assert(row.settlement.texts.includes(`${TARGETS[row.id]}次拖动内完成`));
  }
}
const { api } = await loadApi();
const fixture = read('tests/fixtures/remake171to180-v106.json');
const clean = value => JSON.parse(JSON.stringify(value));
const withoutScore = value => { const copy = clean(value); delete copy.preservedMoveTarget; return copy; };
const current = clean(api.LEVELS), prior = clean(before.levels);
for (let id = 1; id <= 200; id++) {
  if (IDS.includes(id)) { assert.deepEqual(withoutScore(current[id - 1]), withoutScore(prior[id - 1])); assert.equal(current[id - 1].preservedMoveTarget, TARGETS[id]); continue; }
  if ([191, 196].includes(id)) { assert.deepEqual(withoutScore(current[id - 1]), withoutScore(prior[id - 1])); continue; }
  assert.deepEqual(current[id - 1], prior[id - 1], 'Unexpected non-score level change ' + id);
}
assert.equal(sha('tests/fixtures/remake171to180-v106.json'), before.fixtureSha256);
for (const row of fixture.rows) { if (IDS.includes(row.id)) assert.deepEqual(withoutScore(current[row.id - 1]), withoutScore(row.level)); }
const vitestFile = ROOT + '/vitest-171-180-score.json';
const typecheckFile = ROOT + '/typecheck-171-180-score.json';
assert(fs.existsSync(vitestFile) && fs.existsSync(typecheckFile));
const vitest = read(vitestFile), typecheck = read(typecheckFile);
assert.equal(vitest.status, 'PASS'); assert.equal(vitest.failed, 0); assert.equal(vitest.passed, 23);
assert.equal(typecheck.status, 'PASS'); assert.equal(typecheck.exitCode, 0);
const oldComplete = 'deliverables/remake171-180-20260927/complete.json';
const out = ROOT + '/complete.json';
fs.writeFileSync(out, JSON.stringify({
  status: 'SCORING_COMPLETE_171_180_FORMAL', createdAt: new Date().toISOString(), taskRuleVersion: '1.113.0', activeRuleVersion: lock.activeVersion,
  ids: IDS, changedIds: IDS, unchangedIds: [172, 173, 178, 179], targets: TARGETS,
  oldTargets: Object.fromEntries(IDS.map(id => [id, before.scores[id].old])), timeTargetsPreserved: true,
  routeTotals: Object.fromEntries(IDS.map(id => [id, before.scores[id].route])), pointerReports: [
    'deliverables/remake171-180-20260927/pointer-1790532535624-320x568-30996/report.json',
    'deliverables/remake171-180-20260927/pointer-1790532535623-496x1078-29860/report.json'],
  twelveRowsValidated: true, threeStarsEveryRun: true, memoryHostOnly: true, playerSaveTouched: false,
  mapAndGameplayUnchanged: true, oldCompleteEvidenceSha256: sha(oldComplete), oldEvidenceNotRelabeled: true,
  applied: ROOT + '/applied.json', before: ROOT + '/before.json', tests: { vitest: vitestFile, passed: vitest.passed, typecheck: typecheckFile },
  limitations: ['Targets use witnessed complete-route totals and make no optimality claim.', 'No human blind playtest or physical phone test.', 'This scoring task does not recertify difficulty lower bounds.'],
  packaged: false, uploaded: false, released: false,
}, null, 2) + '\n');
console.log(JSON.stringify({ out, status: 'SCORING_COMPLETE_171_180_FORMAL', ids: IDS, activeRuleVersion: lock.activeVersion }));
