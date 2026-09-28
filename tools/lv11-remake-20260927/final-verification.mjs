import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
import { digest } from '../revised-preview-validation-v160.mjs';
import { decodeLayoutBytes } from '../wechat-layout-codec.mjs';
import { restoreLevelJson } from '../../scripts/wechat-level-data.mjs';

const dir = 'deliverables/lv11-remake-20260927';
const read = file => JSON.parse(fs.readFileSync(file));
const json = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(
  Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value),
).digest('hex');
const lock = verifyRulesLock();
assert(lock.ok, JSON.stringify(lock.errors));
assert.equal(lock.activeVersion, '1.80.0');
const bundle = await build({ entryPoints: ['src/core/levels.ts'], bundle: true,
  write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS, LEVELS_BEFORE_LEVEL11_ORIGINAL_REMAKE: before } =
  await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const candidateFile = `${dir}/design-structured-1790489811659/route-7681.json`;
const baseline = read(`${dir}/baseline.json`), candidate = read(candidateFile), level = LEVELS[10];
assert.equal(LEVELS.length, 200);
assert.deepEqual(json(level), candidate.level);
assert.deepEqual(json(before[10]), baseline.level);
for (let i = 0; i < 200; i++) {
  assert.equal(sha(before[i]), baseline.levelHashes[i].sha256, `Baseline drift before this repair: ${i + 1}`);
  if (i !== 10) {
    assert.equal(LEVELS[i], before[i], `Only Lv11 changes at integration: ${i + 1}`);
    assert.equal(sha(LEVELS[i]), baseline.levelHashes[i].sha256);
  }
}
const changedSinceCapture = LEVELS.filter(l => sha(l) !== baseline.levelHashes[l.id - 1].sha256).map(l => l.id);
assert.deepEqual(changedSinceCapture, [11]);
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
const proofFile = `${dir}/validation-formal-static-v180-1790490593360.json`;
const proof = read(proofFile);
assert.equal(proof.status, 'PASS');
assert(proof.formalSourceObjectUsed && proof.matchesFrozenCandidate && proof.difficultyCertified);
assert.equal(proof.levelSha256, digest(level));
assert.equal(proof.routeSha256, digest(candidate.drags));
assert(proof.quotientedFloor.thresholdProven);
assert.equal(proof.quotientedFloor.floor, 12);
assert.equal(proof.lowerBound, 12);
assert.equal(proof.upperBound, 12);
assert(proof.replay.valid && proof.replay.complete);
assert.equal(proof.replay.nonClearingDrags, 12);
assert.equal(proof.replay.effectiveDrags, 34);
verifyBindings(proof);
const audits = [
  ['source-acceptance-v180-1790490654475.json', 'SOURCE_GEOMETRY_AND_MECHANISM_REVIEW_PASS'],
  ['design-proof-v180-1790490642167.json', 'PASS'],
].map(([name, expectedStatus]) => {
  const file = `${dir}/${name}`, result = read(file);
  assert.equal(result.status, expectedStatus);
  assert.equal(result.levelSha256 ?? result.levelSemanticSha256, digest(level));
  return { file, sha256: sha(fs.readFileSync(file)), verifiedInputs: verifyBindings(result) };
});
const pointers = [[320, '1790490602668'], [496, '1790490612791']].map(([width, time]) => {
  const file = `${dir}/validation-pointer-v180-formal-${width}-${time}/report.json`, result = read(file);
  assert.equal(result.status, 'PASS');
  assert(result.formalObjectIdentity && !result.candidateInjected && result.naturalTimingReplay.passed);
  assert(result.final.complete && result.final.remainingSeconds > 0);
  assert.equal(result.levelSha256, digest(level));
  assert.equal(result.routeSha256, digest(candidate.drags));
  assert.equal(result.final.moves, 34);
  assert.equal(result.nonClearingDrags, 12);
  assert.equal(result.multiCellRepositions, 4);
  assert.equal(result.singleCellRepositions, 8);
  assert.equal(result.settlement.earnedStars, 3);
  assert.equal(result.settlement.conditions.moveTarget, 36);
  assert.equal(result.settlement.conditions.timeTargetSeconds, 86);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.storageViolations, []);
  assert.equal(result.nativeDrawAudit.rotated, 0);
  assert.equal(result.nativeDrawAudit.canvasRotationCalls, 0);
  verifyBindings(result);
  return { file, sha256: sha(fs.readFileSync(file)), viewport: result.viewport,
    totalDrags: 34, necessaryRepositions: 12, remainingSeconds: result.final.remainingSeconds, earnedStars: 3 };
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
  level: 11, levelSha256: sha(level), levelSemanticSha256: digest(level), routeSha256: digest(candidate.drags),
  changedSinceCapture, other199Preserved: true, sharedRuntimeRenderingScoringUnchanged: true,
  lowerBound: 12, upperBound: 12, exactNecessaryRepositions: 12, totalDrags: 34,
  setupBreakdown: { multiCell: 4, singleCell: 8 }, difficultyLabel: level.difficulty,
  difficultyException: 'USER_ACCEPTED_12_REPOSITIONS_LV11_ONLY',
  starTargets: { moveTarget: 36, timeTargetSeconds: 86 }, timeSeconds: 120,
  proof: { file: proofFile, sha256: sha(fs.readFileSync(proofFile)),
    states: proof.quotientedFloor.exploredStates, transitions: proof.quotientedFloor.attemptedTransitions,
    qualification: proof.proofCoverage, unquotientedAttempt: proof.unquotientedFloor.status },
  audits, pointers,
  tests: { level11Level9Level66: '19/19 PASS', maskAndQuotientQualification: '14/14 PASS', typecheck: 'PASS',
    fullRepositorySuiteRun: false },
  localWechat: { directory: 'dist-wechat', all200PackagedLevelsEqualCurrentSource: true,
    level11SemanticSha256: digest(packaged[10]), gameSha256: sha(game), uploaded: false, published: false },
  playerSaveTouched: false, humanBlindTested: false, mobileDeviceTested: false };
const output = `${dir}/final-verification-${Date.now()}.json`;
fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, status: report.status, changedSinceCapture,
  lower: 12, upper: 12, totalDrags: 34, stars: report.starTargets, wechatMatches: true }));
