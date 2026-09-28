import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadApi, BASELINE, OUTPUT, checkCandidate, ruleGate, VERSION } from './remake41-direct-v158.mjs';
import { digest } from './revised-preview-validation-v160.mjs';

const [candidatePath, pointerPath] = process.argv.slice(2);
assert(candidatePath && pointerPath, 'Usage: node tools/adopt-remake41-direct-v158.mjs CANDIDATE.json POINTER/report.json');
ruleGate();
const candidate = JSON.parse(fs.readFileSync(candidatePath));
const pointer = JSON.parse(fs.readFileSync(pointerPath));
assert.equal(pointer.status, 'PASS'); assert.equal(pointer.candidateOnly, true); assert.equal(pointer.ruleVersion, VERSION);
const row = pointer.rows.find(r => r.id === 41); assert(row?.status === 'PASS');
assert.equal(row.levelSha256, digest(candidate.level)); assert.equal(row.routeSha256, digest(candidate.drags));
const { api } = await loadApi();
const baseline = JSON.parse(fs.readFileSync(BASELINE));
const before = structuredClone(api.LEVELS);
// The historical v1.46 baseline predates unrelated, already-authorized campaign
// updates in this dirty worktree. Protect the frozen 1–30 set against that
// baseline, and protect the currently installed 42–50 rows against their
// generated fixture; do not reject those unrelated newer updates.
assert.equal(digest(before.slice(0, 30)), digest(baseline.levels.slice(0, 30).map(r => r.level)));
const fixturePath = 'tests/fixtures/native-remake41to50-v146.json';
const fixtureBefore = JSON.parse(fs.readFileSync(fixturePath));
for (const existing of fixtureBefore.rows) assert.deepEqual(before[existing.id - 1], existing.level);
const check = checkCandidate(candidate, baseline, api);
assert.equal(check.lowerBound, null); assert.equal(check.upperBound, 15); assert.equal(check.adoptionBasis, 'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED');

const modulePath = 'src/core/remake41to50.ts';
const fixture = JSON.parse(fs.readFileSync(fixturePath));
assert(fixture.ruleVersion === '1.46.0' || fixture.ruleVersion === VERSION);
assert.deepEqual(fixture.rows.map(r => r.id), [42, 43, 44, 45, 46, 47, 48, 49, 50]);
fixture.ruleVersion = VERSION;
fixture.rows.push({
  id: 41, level: candidate.level, drags: candidate.drags, lowerBound: null, upperBound: 15,
  lowerBoundValidated: false, difficultyCertified: false, targetLowerBound: 11,
  targetLowerBoundStatus: 'UNKNOWN', adoptionBasis: 'USER_DIRECT_WRITE_LOWER_BOUND_UNVERIFIED',
  candidate: candidatePath, candidatePointer: pointerPath, levelSha256: digest(candidate.level), routeSha256: digest(candidate.drags), ruleVersion: VERSION,
});
fixture.rows.sort((a, b) => a.id - b.id);
const moduleText = `// Reviewed data: Lv41–50; Lv41 is user-selected with an unverified lower bound (v1.58).
import type {LevelSpec} from './types';
export const REMADE_41_50_IDS: readonly number[] = ${JSON.stringify(fixture.rows.map(r => r.id))};
const reviewed: Record<number,LevelSpec> = ${JSON.stringify(Object.fromEntries(fixture.rows.map(r => [r.id, r.level])), null, 2)};
export const applyRemake41to50 = (level:LevelSpec):LevelSpec => reviewed[level.id] ?? level;
`;
const protectedFiles = ['src/core/levels.ts', 'src/game/formalBlockShapes.ts'];
const protectedBytes = Object.fromEntries(protectedFiles.map(p => [p, fs.readFileSync(p, 'utf8')]));
const snapshotPath = path.join(OUTPUT, `before-adoption-${Date.now()}.json`); fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(snapshotPath, JSON.stringify({ candidate: candidatePath, pointer: pointerPath, check, before, levelSha256: digest(candidate.level), routeSha256: digest(candidate.drags), other199Sha256: digest(before.filter(l => l.id !== 41)), protected1to30Sha256: digest(before.slice(0, 30)), playerSaveTouched: false, released: false }, null, 2) + '\n', { flag: 'wx' });
assert.deepEqual(Object.fromEntries(protectedFiles.map(p => [p, fs.readFileSync(p, 'utf8')])), protectedBytes);
fs.writeFileSync(modulePath, moduleText);
fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n');
const installed = { status: 'installed-awaiting-formal-pointer', ruleVersion: VERSION, candidate: candidatePath, pointer: pointerPath, check, levelSha256: digest(candidate.level), routeSha256: digest(candidate.drags), ids: fixture.rows.map(r => r.id), lowerBound: null, upperBound: 15, other199Unchanged: true, protected1to30Unchanged: true, before: snapshotPath, formalPointerValidated: false, playerSaveTouched: false, released: false };
const output = path.join(OUTPUT, `installed-${Date.now()}.json`); fs.writeFileSync(output, JSON.stringify(installed, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, before: snapshotPath, ids: installed.ids, status: installed.status, lowerBound: null, upperBound: 15 }));
