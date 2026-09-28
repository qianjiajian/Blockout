// Revalidate the already integrated 31–40 batch against the active v1.51 lock.
// This preserves the v1.47 evidence and records current LEVELS/pointer bindings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadApi, ruleGate, BASELINE, OUTPUT, checkCandidate, VERSION } from './remake31to40-v151.mjs';
import { digest } from './revised-preview-validation-v160.mjs';

ruleGate();
const { api } = await loadApi();
const baseline = JSON.parse(fs.readFileSync(BASELINE));
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/native-remake31to40-v147.json'));
const rows = [];

for (const fixtureRow of fixture.rows) {
  const manifest = JSON.parse(fs.readFileSync(fixtureRow.manifestPath));
  const manifestRow = manifest.rows.find(row => row.id === fixtureRow.id);
  assert(manifestRow, `Missing manifest row ${fixtureRow.id}`);
  const candidatePath = manifestRow.candidatePath;
  const candidate = JSON.parse(fs.readFileSync(candidatePath));
  assert.equal(digest(fs.readFileSync(candidatePath)), manifestRow.candidateFileSha256);
  assert.deepEqual(api.LEVELS[candidate.level.id - 1], candidate.level,
    `Current LEVELS differs from reviewed candidate ${candidate.level.id}`);
  const checks = checkCandidate(candidate, baseline, api);
  rows.push({
    id: candidate.level.id,
    candidatePath,
    levelSha256: digest(candidate.level),
    routeSha256: digest(candidate.drags),
    lowerBound: checks.lowerBound,
    upperBound: checks.upperBound,
    proof: checks.proof.status,
    formalLevelMatched: true,
  });
}

assert.deepEqual(rows.map(row => row.id), Array.from({ length: 10 }, (_, i) => i + 31));
assert.equal(digest(api.LEVELS.slice(0, 30)), digest(baseline.levels.slice(0, 30).map(row => row.level)));

const pointerPath = path.join(OUTPUT, 'final-pointer-matrix-1790257957332.json');
const pointer = JSON.parse(fs.readFileSync(pointerPath));
assert.equal(pointer.status, 'PASS');
assert.equal(pointer.currentFormalLevelsMatched, true);
assert.equal(pointer.currentRuntimeMatched, true);
assert.equal(pointer.playerSaveTouched, false);
assert.deepEqual(pointer.rows.map(row => row.id).filter((id, index, ids) => ids.indexOf(id) === index), rows.map(row => row.id));
for (const pointerRow of pointer.rows) {
  assert.equal(pointerRow.status, 'PASS');
  assert.equal(pointerRow.levelSha256, rows.find(row => row.id === pointerRow.id).levelSha256);
  const report = JSON.parse(fs.readFileSync(pointerRow.pointerReport));
  assert.equal(report.status, 'PASS');
  assert.equal(report.naturalClock, true);
  assert.equal(report.clockFrozen, false);
  assert.equal(report.playerSaveTouched, false);
  assert.deepEqual(report.errors, []);
}

const report = {
  status: 'PASS',
  ruleVersion: VERSION,
  scope: rows.map(row => row.id),
  rows,
  protected1to30Unchanged: true,
  currentFormalLevelsMatched: true,
  pointerEvidence: pointerPath,
  pointerScenarios: pointer.rows.length,
  naturalClock: true,
  playerSaveTouched: false,
  humanBlindTested: false,
  releaseApproved: false,
  campaignSha256: digest(api.LEVELS),
};
const output = path.join(OUTPUT, `current-v151-reverification-${Date.now()}.json`);
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, output, ids: report.scope, pointerScenarios: report.pointerScenarios }));
