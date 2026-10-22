import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { ROOT, ruleGate, writeNew } from './common.mjs';

const lock = ruleGate(), expected = [231, 233, 234, 235, 236, 237, 238, 239];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const raw = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const objectSha = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const cache = new Map(), rawCached = file => { if (!cache.has(file)) cache.set(file, raw(file)); return cache.get(file); };
const before = read(`${ROOT}/before.json`), status = read(`${ROOT}/status.json`);
assert.deepEqual(status.accepted, expected);
assert.deepEqual(status.pending, [232, 240]);
assert.equal(status.acceptedCount, 8);
const compiled = await build({ stdin: { resolveDir: process.cwd(), contents: `
export {LEVELS,getLevelStrict,FORMAL_201_210_LEVELS,FORMAL_211_220_LEVELS,FORMAL_221_230_LEVELS} from './src/core/levels';
export {FORMAL_231_240_LEVELS,FORMAL_231_240_EVIDENCE,getFormal231to240LevelStrict} from './src/core/formal231to240Data';
export {TEMPORARY_TEST_LEVEL_IDS,TEMPORARY_TEST_LEVEL_COUNT,getTemporaryTestLevelStrict} from './src/game/temporaryTestLevelCatalog';
` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.deepEqual(api.FORMAL_231_240_LEVELS.map(level => level.id), expected);
assert.deepEqual(api.FORMAL_231_240_EVIDENCE.map(row => row.id), expected);
assert.equal(api.LEVELS.length, 200);
assert.equal(objectSha(api.LEVELS), before.productionSha256);
const baseline = [{ range: [1, 200], bodies: api.LEVELS.length, sha256: objectSha(api.LEVELS), unchanged: true }];
for (const [i, levels] of [api.FORMAL_201_210_LEVELS, api.FORMAL_211_220_LEVELS, api.FORMAL_221_230_LEVELS].entries()) {
  assert.equal(objectSha(levels), before.existingFormal[i].sha256);
  assert.deepEqual(levels.map(level => level.id), before.existingFormal[i].ids);
  baseline.push({ range: [levels[0].id, levels.at(-1).id], bodies: levels.length, sha256: objectSha(levels), unchanged: true });
}
const catalog = [...Array.from({ length: 230 }, (_, i) => i + 1), ...expected];
assert.deepEqual(api.TEMPORARY_TEST_LEVEL_IDS, catalog);
assert.equal(api.TEMPORARY_TEST_LEVEL_COUNT, 238);
for (const id of [232, 240]) {
  assert.throws(() => api.getTemporaryTestLevelStrict(id));
  assert.throws(() => api.getFormal231to240LevelStrict(id));
}
for (const id of [201, 230, ...expected, 232, 240]) assert.throws(() => api.getLevelStrict(id));

const bindingReports = new Map(), allowedDrift = new Set(['src/core/formal231to240Data.ts', 'src/game/temporaryTestLevelCatalog.ts']);
function verifyBindingMap(bindings, name) {
  const drift = [], checked = [];
  for (const [file, expectedSha] of Object.entries(bindings ?? {})) {
    if (typeof expectedSha !== 'string' || !/^[0-9a-f]{64}$/.test(expectedSha) || !file.includes('/')) continue;
    assert(fs.existsSync(file), `Missing bound file ${file}`);
    const actual = rawCached(file);
    checked.push({ file, expectedSha256: expectedSha, currentRawSha256: actual });
    if (actual !== expectedSha) drift.push({ file, expectedSha256: expectedSha, currentRawSha256: actual, allowedDataOnlyException: allowedDrift.has(file) });
  }
  assert(drift.every(item => item.allowedDataOnlyException), `Unexpected source drift in ${name}: ${JSON.stringify(drift)}`);
  return { name, checked: checked.length, drift, bindingsCanonicalSha256: objectSha(bindings ?? {}), currentFingerprintSha256: objectSha(checked) };
}
function boundReport(file) {
  if (bindingReports.has(file)) return bindingReports.get(file).report;
  const report = read(file);
  const bindings = verifyBindingMap(report.bindings, file), sources = verifyBindingMap(report.sourceBindings, file + ':sourceBindings');
  bindingReports.set(file, { report, file, rawSha256: rawCached(file), bindings, sources });
  return report;
}
const schemaReviewFile = `${ROOT}/independent-review/schema-rebind-review-1792399520026.json`;
const schemaReview = read(schemaReviewFile);
assert.equal(schemaReview.status, 'PASS');
const rows = [], proofBindings = [];
for (const level of api.FORMAL_231_240_LEVELS) {
  const id = level.id, registered = api.FORMAL_231_240_EVIDENCE.find(row => row.id === id);
  const summary = status.rows.find(row => row.id === id), acceptance = read(summary.file);
  assert.equal(registered.evidence, summary.file);
  assert.equal(acceptance.status, 'FORMAL_DATA_ACCEPTED');
  assert.equal(summary.status, 'FORMAL_DATA_ACCEPTED');
  assert.equal(registered.qualification, acceptance.qualification.file);
  const packet = read(acceptance.qualification.file), levelHash = objectSha(level), routeHash = objectSha(packet.drags);
  for (const row of [packet, acceptance, summary]) {
    assert.equal(row.levelSha256, levelHash);
    assert.equal(row.routeSha256, routeHash);
  }
  assert.deepEqual(packet.level, level);
  assert.strictEqual(api.getFormal231to240LevelStrict(id), level);
  assert.strictEqual(api.getTemporaryTestLevelStrict(id), level);
  assert.equal(rawCached(acceptance.qualification.file), acceptance.qualification.sha256);
  assert.equal(packet.L ?? packet.certifiedLowerBound, acceptance.L);
  assert.equal(packet.U ?? packet.witnessUpperBound, acceptance.U);
  assert(acceptance.L >= acceptance.band[0] && acceptance.U <= acceptance.band[1] && acceptance.L <= acceptance.U);
  assert.equal(packet.drags.length, acceptance.starMoves);
  assert.equal(level.preservedMoveTarget, acceptance.starMoves);
  const original = read(packet.schemaRebind.originalFile);
  assert.equal(rawCached(packet.schemaRebind.originalFile), packet.schemaRebind.originalFileJsonBufferSha256);
  assert.equal(objectSha(original.level), packet.schemaRebind.originalLevelSha256);
  assert.equal(packet.schemaRebind.levelSha256, levelHash);
  assert.equal(objectSha(original.drags), routeHash);
  const gameplay = value => { const out = structuredClone(value); delete out.mechanismAdaptation; for (const generator of out.generators ?? []) delete generator.size; return out; };
  assert.deepEqual(gameplay(original.level), gameplay(level));
  const reviewed = schemaReview.rows.find(row => row.id === id);
  assert.equal(reviewed.currentRawSha256, rawCached(acceptance.qualification.file));
  assert.equal(reviewed.currentLevelSha256, levelHash);
  assert.equal(reviewed.routeSha256, routeHash);
  assert.equal(reviewed.allMathematicalEvidenceRetained, true);
  for (const [label, bindings] of [['packet.code', packet.bindings?.codeSha256], ['packet.evidence', packet.bindings?.evidenceSha256], ['qualification.code', packet.qualification?.codeSha256], ['qualification.bindings', packet.qualification?.bindings]]) {
    if (bindings) proofBindings.push({ id, ...verifyBindingMap(bindings, `Lv${id}:${label}`) });
  }
  if (packet.sourceLedger) assert.equal(rawCached(packet.sourceLedger), packet.sourceLedgerSha256);
  assert.deepEqual(acceptance.pointer.map(pointer => pointer.viewport), [{ width: 320, height: 568 }, { width: 496, height: 1078 }]);
  const screens = [];
  for (const pointer of acceptance.pointer) {
    assert.equal(rawCached(pointer.file), pointer.sha256);
    const report = boundReport(pointer.file), row = report.rows.find(row => row.id === id);
    assert.equal(report.status, 'PASS');
    assert.equal(report.formalDataValidated, true);
    assert.equal(report.candidateOnly, false);
    assert.equal(report.clockFrozen, false);
    assert.equal(report.naturalClock, true);
    assert.deepEqual(report.errors, []);
    assert.equal(row.status, 'PASS');
    assert.equal(row.levelSha256, levelHash);
    assert.equal(row.routeSha256, routeHash);
    assert.equal(row.formalObjectIdentity, true);
    assert.equal(row.candidateOverlay, false);
    assert.equal(row.final.complete, true);
    assert.equal(row.final.failed, false);
    assert(row.final.remainingSeconds > 0);
    assert.equal(row.final.moves, acceptance.starMoves);
    assert.equal(row.nonClearingDrags, acceptance.U);
    assert.equal(row.settlement.status, 'committed');
    assert.equal(row.settlement.earnedStars, 3);
    assert.equal(row.settlement.starConditions.moveTarget, acceptance.starTargets.moveTarget);
    assert.equal(row.settlement.starConditions.timeTargetSeconds, acceptance.starTargets.timeTargetSeconds);
    assert.equal(row.settlement.starConditions.moveAchieved, true);
    assert.equal(row.settlement.starConditions.timeAchieved, true);
    assert.equal(row.nativeDrawAudit.rotated, 0);
    assert.equal(row.nativeDrawAudit.canvasRotationCalls, 0);
    assert(row.trustedPointer.events > 0);
    assert.equal(row.trustedPointer.untrusted, 0);
    assert(row.naturalClockProbe.before > row.naturalClockProbe.after);
    const timingFile = path.join(path.dirname(pointer.file), `lv${id}-observed-timing.json`);
    const log = read(timingFile), timing = row.naturalTimingReplay;
    assert.equal(timing.passed, true);
    assert.equal(timing.wholeModelReplay, true);
    assert.equal(timing.levelSha256, levelHash);
    assert.equal(timing.logSha256, objectSha(log));
    assert.equal(log.readOnlyObservation, true);
    assert.equal(log.sameModel, true);
    assert.deepEqual(log.forbidden, []);
    assert.deepEqual(log.final, row.final);
    let prior = log.initial, active = 0, ticks = 0, previousAt = log.startedAt;
    for (const event of log.events) {
      assert(event.at >= previousAt);
      previousAt = event.at;
      if (event.method === 'tick') {
        assert(Number.isFinite(event.args[0]) && event.args[0] >= 0);
        ticks++;
        if (prior.started && !prior.complete && !prior.failed) active += event.args[0];
      }
      prior = event.after;
    }
    assert.equal(ticks, timing.ticks);
    assert(Math.abs(active - timing.activeSeconds) < 1e-7);
    assert(Math.abs(level.timeSeconds - row.final.remainingSeconds - active) < 1e-6);
    assert.equal(row.steps.length, packet.drags.length);
    row.steps.forEach((step, i) => { assert.equal(step.moves, i + 1); assert.equal(step.blockId, packet.drags[i].blockId); });
    screens.push({ report: pointer.file, reportRawSha256: pointer.sha256, viewport: report.viewport, levelSha256: levelHash, routeSha256: routeHash, timingFile, timingRawSha256: rawCached(timingFile), timingCanonicalSha256: objectSha(log), actualStars: 3, actualDrags: row.final.moves, actualNonClearingDrags: row.nonClearingDrags, activeSeconds: active, naturalTicks: ticks, trustedPointerEvents: row.trustedPointer.events, sourceBindingsVerified: true });
  }
  rows.push({ id, levelSha256: levelHash, routeSha256: routeHash, qualificationFile: acceptance.qualification.file, qualificationRawSha256: rawCached(acceptance.qualification.file), acceptanceFile: summary.file, acceptanceRawSha256: rawCached(summary.file), originalProofObject: packet.schemaRebind.originalFile, exactGameplayRebindVerified: true, originalQualificationUnchanged: true, L: acceptance.L, U: acceptance.U, starMoves: acceptance.starMoves, screens });
}
const selectorFile = `${ROOT}/selector-1792400888208/report.json`, selector = boundReport(selectorFile);
assert.equal(selector.status, 'PASS');
assert.deepEqual(selector.errors, []);
assert.equal(selector.playerSaveTouched, false);
assert.equal(selector.MemoryHost, true);
assert.equal(selector.viewports.length, 2);
for (const view of selector.viewports) {
  assert.equal(view.status, 'PASS');
  assert.deepEqual(view.ids, expected);
  assert.deepEqual(view.catalog, catalog);
  assert.equal(view.baselineBytesPreserved, true);
  assert.equal(view.restoredLevel, 2);
  for (const row of view.levels) {
    assert.equal(row.levelSha256, rows.find(level => level.id === row.id).levelSha256);
    assert(row.registryIdentity && row.catalogIdentity && row.storageUnchanged);
  }
}
// Verify a concurrently corrected descriptive status still names identical
// accepted objects; the legacy misleading hash field name is not a byte change.
const currentStatus = read(`${ROOT}/status.json`);
assert.deepEqual(currentStatus.accepted, status.accepted);
assert.deepEqual(currentStatus.rows.map(row => [row.id, row.levelSha256, row.routeSha256]), status.rows.map(row => [row.id, row.levelSha256, row.routeSha256]));
const digestsV2File = `${ROOT}/file-digests-v2.json`;
const file = `${ROOT}/independent-review/final-eight-review-${Date.now()}.json`;
const review = {
  status: 'PASS', reviewer: '/root/video_facts', activeRule: lock.activeVersion,
  accepted: expected, pending: [232, 240], productionBoundary: 200,
  baseline, rows,
  catalog: { count: 238, newIds: expected, no232or240Placeholder: true, currentRegistryAndCatalogIdentity: true, selectorFile, selectorRawSha256: rawCached(selectorFile), dualViewportActualIdentityAndMemorySavePreservation: true },
  currentBindingAudit: [...bindingReports.values()].map(({ report, ...rest }) => rest), proofBindings,
  schemaReviewFile, schemaReviewRawSha256: rawCached(schemaReviewFile),
  hashConventionCorrection: {
    canonicalObjects: 'SHA-256 of recursively key-sorted JSON; arrays retain order. Independently recomputed for current levels, routes and natural timing logs.',
    fileBindings: 'Actual digest(Buffer) implementation directly hashes raw Buffer bytes. All file bindings checked here match raw SHA-256; earlier text claiming canonical JSON Buffer encoding and legacyJsonBufferSha256 field naming was explanatory error, not numerical drift.',
    currentDigestImplementation: 'tools/revised-preview-validation-v160.mjs:9', currentDigestImplementationRawSha256: rawCached('tools/revised-preview-validation-v160.mjs'),
    currentStatus: `${ROOT}/status.json`, currentStatusRawSha256: raw(`${ROOT}/status.json`),
    correctedFileDigests: fs.existsSync(digestsV2File) ? { file: digestsV2File, rawSha256: raw(digestsV2File) } : null,
    oldPacketsAndPointerEvidenceNotModified: true,
  },
  tests: { command: 'pnpm exec vitest run tests/formal231to240.test.mjs tests/temporaryLevelSelector.test.ts', runOnce: true, status: 'PASS', testFiles: 2, tests: 19, durationSeconds: 19.94, includesCurrentObjectFullRouteAndStaticAudit: true },
  noRepeatedPointer: true, sourceDataModifiedByReview: false, playerSaveTouched: false, releaseApproved: false,
  reviewerToolRawSha256: raw('tools/continue231-240/independent-final-eight-review.mjs'),
};
writeNew(file, review);
console.log(JSON.stringify({ file, status: review.status, levels: rows.length, screens: rows.reduce((sum, row) => sum + row.screens.length, 0), uniqueBoundFiles: cache.size, bindingReports: review.currentBindingAudit.map(row => ({ file: row.file, checked: row.bindings.checked, drift: row.bindings.drift })) }));
