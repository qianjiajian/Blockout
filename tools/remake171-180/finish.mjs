import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ROOT, IDS, TARGETS, digest, original, ruleGate, writeNew } from './common.mjs';
import { loadApi } from './replay.mjs';

// Final index only. This never changes maps, scores, old evidence or packages.
const [formalFile, integrationFile, testFile] = process.argv.slice(2);
assert(formalFile && integrationFile && testFile, 'Provide final formal, integration and test-validation reports');
const bindings = {};
const read = p => { const b = fs.readFileSync(p); bindings[p] = digest(b); return JSON.parse(b); };
const verify = entries => { for (const [p, h] of Object.entries(entries)) assert.equal(digest(fs.readFileSync(p)), h, p); };
const formal = read(formalFile), integration = read(integrationFile), tests = read(testFile);
assert.equal(formal.status, 'FORMAL_TEN_COMPLETE_WITH_PRESERVED_SCORE_CAVEATS');
assert(formal.fullBatch); assert.deepEqual(formal.ids, IDS); assert.deepEqual(formal.remaining, []);
assert.equal(formal.rows.length, 20); verify(formal.bindings);
assert.equal(integration.status, 'TEN_FORMAL_INTEGRATION_PASS');
assert.deepEqual(integration.ids, IDS); assert.equal(integration.otherCurrentStageObjectsWithExactReferenceIdentity, 190);
assert(integration.pureDataModule && integration.exactFallback && integration.finalStageVerified && integration.firstWiringRecoveredAndVerified);
assert(integration.delta?.allNinePriorRowsExact && integration.delta?.oldImmutableEvidencePreserved);
assert.deepEqual(integration.delta.addedIds, [172]); verify(integration.immutableBindings);
assert.equal(tests.status, 'PASS'); assert.equal(tests.typecheck.exitCode, 0); assert.equal(tests.vitest.failed, 0);
verify(tests.bindings); const vitest = read(tests.vitest.file);
assert(vitest.success && vitest.numFailedTests === 0); assert.equal(vitest.numPassedTests, tests.vitest.passed);
assert.equal(formal.tests.file, tests.vitest.file);

const lock = ruleGate(), { api } = await loadApi(), baseline = original();
const fixtureFile = 'tests/fixtures/remake171to180-v106.json', fixture = read(fixtureFile);
assert.deepEqual(fixture.rows, integration.fixtureRows); assert.deepEqual(fixture.rows.map(r => r.id), IDS);
for (const p of ['src/core/remake171to180.ts', 'src/core/levels.ts', 'src/game/formalBlockShapes.ts', fixtureFile]) {
  assert.equal(digest(fs.readFileSync(p)), integration.bindings[p], 'Integration source changed ' + p);
  bindings[p] = integration.bindings[p];
}
const rows = [];
for (const id of IDS) {
  const f = fixture.rows.find(r => r.id === id), readyIndex = formal.ready.find(r => r.id === id), ready = read(readyIndex.ready).rows.find(r => r.id === id);
  const level = api.LEVELS[id - 1], candidate = read(ready.file), score = api.levelStarTargets(level);
  assert.deepEqual(level, f.level); assert.deepEqual(level, candidate.level); assert.deepEqual(f.drags, candidate.drags);
  assert.deepEqual(score, baseline.levels[id - 1].starTargets);
  assert.equal(f.lowerBound, ready.L); assert.equal(f.upperBound, ready.U);
  assert(f.lowerBound >= TARGETS[id].range[0] && f.upperBound <= TARGETS[id].range[1]);
  const runs = formal.rows.filter(r => r.id === id); assert.equal(runs.length, 2);
  for (const r of runs) { assert.equal(r.levelSha256, digest(level)); assert.equal(r.routeSha256, digest(f.drags)); }
  const requiredClears = level.blocks.reduce((n, b) => n + (b.layers?.length ?? 1), 0);
  rows.push({ id, difficulty: level.difficulty, levelSha256: digest(level), routeSha256: digest(f.drags),
    L: f.lowerBound, U: f.upperBound, totalDrags: f.drags.length, requiredClearOrPeelEvents: requiredClears,
    provenTotalDragFloor: requiredClears + f.lowerBound, score, originalScorePreserved: true,
    ready: readyIndex.ready, candidate: ready.file, source: ready.sourceFile, review: ready.reviewFile,
    qualification: ready.qualification, formalRuns: runs.map(r => ({ viewport: r.viewport, report: r.report,
      originalReportStatus: r.originalReportStatus, timing: r.logFile, remainingSeconds: r.remainingSeconds })) });
}
verify(bindings); ruleGate();
const out = ROOT + '/complete.json';
writeNew(out, { status: formal.status, createdAt: new Date().toISOString(), ruleVersion: lock.activeVersion,
  taskRuleVersion: '1.106.0', runtimeProfile: 'revised-2026-09-27-v1.5', ids: IDS, pendingIds: [], rows,
  formalFile, integrationFile, testFile, tests: { passed: vitest.numPassedTests, typecheckExitCode: 0 },
  late176: formal.late176, currentCampaignSha256: digest(api.LEVELS), bindings,
  scoreCaveats: 'Original scores are preserved. Lv171 and Lv174 original drag stars are excluded by the proven total-drag floors. Routes for175/176/177/180 exceed their old drag stars; this alone does not prove those old targets impossible.',
  preservedEvidence: 'Historical failures and UNKNOWN remain unchanged. Exact disjoint parallel changes are separately reviewed; they do not waive runtime, art or source checks.',
  limitations: ['No human blind playtest or physical phone test.', 'Complete witnessed routes do not prove every reachable branch is deadlock-free.', 'L is a lower bound and U is a witnessed upper bound; no exact optimum is claimed.'],
  playerSaveTouched: false, packaged: false, uploaded: false, released: false });
console.log(JSON.stringify({ out, ids: IDS, tests: vitest.numPassedTests }));
