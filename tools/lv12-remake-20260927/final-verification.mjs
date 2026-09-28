import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
import { digest } from '../revised-preview-validation-v160.mjs';
import { decodeLayoutBytes } from '../wechat-layout-codec.mjs';
import { restoreLevelJson } from '../../scripts/wechat-level-data.mjs';

const dir = 'deliverables/lv12-remake-20260927';
const read = file => JSON.parse(fs.readFileSync(file));
const json = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(
  Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value),
).digest('hex');
const lock = verifyRulesLock();
assert(lock.ok, JSON.stringify(lock.errors));
assert.equal(lock.activeVersion, '1.82.0');
const bundle = await build({ entryPoints: ['src/core/levels.ts'], bundle: true,
  write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS, LEVELS_BEFORE_LEVEL12_ORIGINAL_REMAKE: before } =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const candidateFile = `${dir}/design-final-1790491569378.json`;
const baseline = read(`${dir}/baseline.json`), candidate = read(candidateFile), level = LEVELS[11];
assert.equal(LEVELS.length, 200);
assert.deepEqual(json(level), candidate.level);
assert.deepEqual(json(before[11]), baseline.level);
for (let i = 0; i < 200; i++) {
  assert.equal(sha(before[i]), baseline.levelHashes[i].sha256, `Baseline drift: ${i + 1}`);
  if (i !== 11) {
    assert.equal(LEVELS[i], before[i], `Only Lv12 changes: ${i + 1}`);
    assert.equal(sha(LEVELS[i]), baseline.levelHashes[i].sha256);
  }
}
const changedSinceCapture = LEVELS.filter(l => sha(l) !== baseline.levelHashes[l.id - 1].sha256).map(l => l.id);
assert.deepEqual(changedSinceCapture, [12]);
for (const file of ['src/core/PuzzleModel.ts', 'src/game/ColorEscapeGame.ts',
  'src/game/formalBlockShapes.ts', 'src/core/levelStarConditions.ts'])
  assert.equal(sha(fs.readFileSync(file)), baseline.files[file], `Shared source changed: ${file}`);

function verifyBindings(report) {
  const entries = Array.isArray(report.bindings)
    ? report.bindings.map(row => [row.path, row.sha256]) : Object.entries(report.bindings);
  for (const [file, expected] of entries)
    assert.equal(digest(fs.readFileSync(file)), expected, `Evidence input drift: ${file}`);
  return entries.length;
}
const proofFile = `${dir}/validation-formal-static-1790491788683.json`, proof = read(proofFile);
assert.equal(proof.status, 'PASS');
assert(proof.formalSourceObjectUsed && proof.matchesFrozenCandidate && proof.difficultyCertified);
assert.equal(proof.levelSha256, digest(level));
assert.equal(proof.routeSha256, digest(candidate.drags));
for (const graph of [proof.quotientedFloor, proof.unquotientedFloor]) {
  assert(graph.thresholdProven);
  assert.equal(graph.floor, 16);
}
assert.equal(proof.lowerBound, 16);
assert.equal(proof.upperBound, 16);
assert(proof.replay.valid && proof.replay.complete);
assert.equal(proof.replay.nonClearingDrags, 16);
assert.equal(proof.replay.effectiveDrags, 28);
verifyBindings(proof);
const audits = [
  ['source-final-review-v182-1790491819767.json', 'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS'],
  ['design-proof-1790491569378.json', 'PASS'],
].map(([name, expectedStatus]) => {
  const file = `${dir}/${name}`, result = read(file);
  assert.equal(result.status, expectedStatus);
  assert.equal(result.levelSha256, digest(level));
  assert.equal(result.routeSha256, digest(candidate.drags));
  return { file, sha256: sha(fs.readFileSync(file)), verifiedInputs: verifyBindings(result) };
});
const pointers = [[320, '1790491791465'], [496, '1790491801652']].map(([width, time]) => {
  const file = `${dir}/validation-pointer-formal-${width}-${time}/report.json`, result = read(file);
  assert.equal(result.status, 'PASS');
  assert(result.formalObjectIdentity && !result.candidateInjected && result.naturalTimingReplay.passed);
  assert(result.final.complete && result.final.remainingSeconds > 0);
  assert.equal(result.levelSha256, digest(level));
  assert.equal(result.routeSha256, digest(candidate.drags));
  assert.equal(result.final.moves, 28);
  assert.equal(result.nonClearingDrags, 16);
  assert.equal(result.multiCellRepositions, 16);
  assert.equal(result.singleCellRepositions, 0);
  assert.equal(result.settlement.earnedStars, 3);
  assert.equal(result.settlement.conditions.moveTarget, 28);
  assert.equal(result.settlement.conditions.timeTargetSeconds, 86);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.storageViolations, []);
  assert.equal(result.nativeDrawAudit.rotated, 0);
  assert.equal(result.nativeDrawAudit.canvasRotationCalls, 0);
  verifyBindings(result);
  return { file, sha256: sha(fs.readFileSync(file)), viewport: result.viewport,
    totalDrags: 28, necessaryRepositions: 16, remainingSeconds: result.final.remainingSeconds, earnedStars: 3 };
});

const game = fs.readFileSync('dist-wechat/game.js', 'utf8'), manifest = read('dist-wechat.build-manifest.json');
const packed = [...game.matchAll(/"([A-Za-z0-9+/]{10000,})"/g)]
  .find(match => match[1].length === manifest.levelCompilation.packedBytes);
assert(packed);
const packaged = restoreLevelJson(JSON.parse(decodeLayoutBytes(packed[1],
  manifest.levelCompilation.asciiBytes, manifest.levelCompilation.adler32)));
assert.deepEqual(json(packaged), json(LEVELS));
assert.equal(sha(game), manifest.outputs.find(row => row.path === 'game.js').sha256);
assert.equal(sha(packaged), manifest.levelCompilation.levelJsonSha256);
const report = { generatedAt: new Date().toISOString(), status: 'PASS', ruleVersion: lock.activeVersion,
  level: 12, levelSha256: sha(level), levelSemanticSha256: digest(level), routeSha256: digest(candidate.drags),
  changedSinceCapture, other199Preserved: true, sharedRuntimeRenderingScoringUnchanged: true,
  lowerBound: 16, upperBound: 16, exactNecessaryRepositions: 16, totalDrags: 28,
  setupBreakdown: { multiCell: 16, singleCell: 0 }, difficultyLabel: level.difficulty,
  starTargets: { moveTarget: 28, timeTargetSeconds: 86 }, historicalParMoves: 21, timeSeconds: 120,
  proof: { file: proofFile, sha256: sha(fs.readFileSync(proofFile)),
    quotientStates: proof.quotientedFloor.exploredStates, quotientTransitions: proof.quotientedFloor.attemptedTransitions,
    rawStates: proof.unquotientedFloor.exploredStates, rawTransitions: proof.unquotientedFloor.attemptedTransitions },
  audits, pointers,
  tests: { levels12And11And9And66: '25/25 PASS', maskAndQuotientQualification: '14/14 PASS',
    typecheck: 'PASS', fullRepositorySuiteRun: false },
  localWechat: { directory: 'dist-wechat', all200PackagedLevelsEqualCurrentSource: true,
    level12SemanticSha256: digest(packaged[11]), gameSha256: sha(game), uploaded: false, published: false },
  playerSaveTouched: false, humanBlindTested: false, mobileDeviceTested: false };
const output = `${dir}/final-verification-${Date.now()}.json`;
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, status: report.status, changedSinceCapture,
  lower: 16, upper: 16, totalDrags: 28, stars: report.starTargets, wechatMatches: true }));
