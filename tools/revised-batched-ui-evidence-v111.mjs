import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { digest } from './revised-preview-validation-v160.mjs';
import { replayObservedModelTiming } from './revised-model-timing-observer.mjs';

export const DATA_PATH = 'src/core/revisedContinuationLayouts.generated.ts';
export const HISTORICAL_GALLERY = 'deliverables/revised-formal-progress-v110-2026-09-22T15-45-32-632Z/index.html';
export const EVIDENCE_LABEL = '分批完整实操，非本次全量重跑';
export const POINTER_DRIVERS = Object.freeze({
  'tools/playtest-revised-formal-timed-batch-v111.mjs': 'bc313f645fb0c95cc0c647d3139a59b29d4745db6b03921a62b87d51baf3ffc6',
  'tools/playtest-revised-formal-timed-families-v111.mjs': 'f6f5fda8afbb5afd918d93baf6cd1f200aae47c1e89479e78f9e7b37c78760c8',
  'tools/playtest-revised-formal-timed-bombs-v111.mjs': '3531a34c824c4f287f036bc53e7da1c59eb729fbd52afb5131d622c794328584',
  'tools/playtest-revised-formal-timed-joint-curtains-v111.mjs': '6e09cfacd6dc5916426566920f89729054bc5881f062199de3ad3a12b16d391a',
  'tools/playtest-revised-formal-timed-joint-stars-v111.mjs': '5f190e92056ff9b1f1d2e4545ef190885c566832f83a679a103eab1fed6a6cd5',
  'tools/playtest-revised-formal-timed-colored-grids-v111.mjs': '0a79e1020926962d3723922743c17cccf68a607ce169a2585ac88c7f0d1b7e2b',
  'tools/playtest-revised-formal-timed-joint-keys-v111.mjs': '28812c37d77461c3c314112b0d5345f3268c65ac259b284756830401038da607',
});
const requiredTools = ['tools/revised-formal-levels.html', 'tools/revised-formal-levels-browser.mjs',
  'tools/revised-model-timing-observer.mjs', 'docs/rules/manifest.json', 'docs/mechanism-rules-v1.11.0.md'];
const hex = h => { assert.match(h ?? '', /^[a-f0-9]{64}$/i, 'Explicit SHA-256 required'); return h.toLowerCase(); };
const normalized = p => path.resolve(p).replaceAll('\\', '/');
const ids = rows => rows.map(r => r.levelId);
const uniqueIds = list => {
  assert(Array.isArray(list) && list.length > 0 && list.every(n => Number.isInteger(n) && n >= 21 && n <= 200));
  assert.deepEqual(list, [...new Set(list)].sort((a, b) => a - b), 'IDs must be sorted and unique');
};
export const fileSha = p => digest(fs.readFileSync(p));
export function assertBindingsUnchanged(bindings, sha = fileSha) {
  for (const [p, h] of Object.entries(bindings)) assert.equal(sha(p), h, `Evidence drift: ${p}`);
}
export function treeFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.posix.join(dir, e.name); return e.isDirectory() ? treeFiles(p) : [p];
  });
}

/** Pure evidence audit, separated for adversarial fixtures. Not a certification
 * entrypoint: callers must supply an independently fresh verified campaign and
 * exact timing replay. The public filesystem entrypoint below always does both. */
export function auditBatchedUiEvidence({ archiveRef, reports, checked, formalLevels, requiredInputs, readBytes, replayTiming }) {
  const bindings = {}, bind = (p, expected) => {
    const actual = digest(readBytes(p));
    if (expected !== undefined) assert.equal(actual, hex(expected), `Evidence SHA mismatch: ${p}`);
    if (bindings[p]) assert.equal(actual, bindings[p], `Concurrent evidence change: ${p}`);
    bindings[p] = actual; return actual;
  };
  const read = (p, h) => { bind(p, h); return JSON.parse(readBytes(p)); };
  assert.equal(checked.status, 'passed-model-not-ui'); assert.equal(checked.applied, true);
  assert.equal(normalized(checked.archivePath), normalized(archiveRef.path));
  assert.equal(hex(checked.archiveSha256), hex(archiveRef.sha256));
  for (const [p, h] of Object.entries(checked.inputs)) bind(p, h);
  const archive = read(archiveRef.path, archiveRef.sha256), chain = new Map();
  let pointer = archiveRef, child;
  while (pointer) {
    const key = normalized(pointer.path); assert(!chain.has(key), 'Archive cycle');
    const node = read(pointer.path, pointer.sha256);
    assert.equal(node.ruleVersion, '1.11.0'); assert.equal(node.schemaVersion, 2); uniqueIds(ids(node.rows));
    if (child) {
      assert.equal(child.oldDataSha256, node.expectedDataSha256, 'Not an append-only data transition');
      assert.deepEqual(child.baseline, node.baseline, 'Baseline changed');
      for (const row of node.rows) assert.deepEqual(child.rows.find(r => r.levelId === row.levelId), row, 'Ancestor row changed');
      assert(child.rows.length > node.rows.length, 'An adoption must add levels');
    }
    chain.set(key, { node, ref: { path: pointer.path, sha256: hex(pointer.sha256) } });
    child = node; pointer = node.previousArchive;
  }
  assert.equal(bind(DATA_PATH), archive.expectedDataSha256, 'Current generated data differs from current archive');
  assert.deepEqual(ids(checked.rows), ids(archive.rows), 'Fresh model coverage differs');
  assert.equal(checked.inheritedFormalCount, 82); assert.equal(checked.inheritedEvidenceVersion, '1.10.0');
  assert.equal(checked.inheritedFreshUiValidated, false);
  assert.equal(checked.formalIds.length, 82 + archive.rows.length);
  assert(Array.isArray(reports) && reports.length > 0, 'Pinned report list required');
  const seenReports = new Set(), covered = new Map(), accepted = [], dataTransitions = [];
  for (const ref of reports) {
    assert(!seenReports.has(normalized(ref.path)), 'Duplicate report'); seenReports.add(normalized(ref.path));
    const report = read(ref.path, ref.sha256);
    assert.equal(report.ruleVersion, '1.11.0'); assert.equal(report.status, 'passed');
    assert.equal(report.naturalClock, true); assert.equal(report.clockFrozen, false);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.forbiddenStorage, []);
    assert(!report.error && !report.failureClassification && !(report.inputDrift?.length), 'Failed/drifted report');
    uniqueIds(report.ids); assert.deepEqual(ids(report.rows), report.ids, 'Partial or wrong report rows');
    assert.equal(report.passed, report.ids.length);
    const ancestor = chain.get(normalized(report.archivePath)); assert(ancestor, 'UI archive is not a current ancestor');
    assert.equal(hex(report.archiveSha256), ancestor.ref.sha256, 'Wrong ancestor SHA');
    assert.deepEqual(report.cumulativeIds, ids(ancestor.node.rows), 'Wrong cumulative archive scope');
    assert(report.ids.every(id => ancestor.node.rows.some(r => r.levelId === id)), 'Unknown report level');
    assert.equal(report.memoryHost?.backend, 'MemoryHost');
    assert.deepEqual(report.memoryHost.loaded.map(r => r.levelId), report.ids);
    assert(report.memoryHost.loaded.every(r => r.formalObjectIdentity === true), 'Injected model is not formal');
    assert(report.files && report.outputFiles, 'Input and output ledgers required');
    const fileNames = Object.keys(report.files), canonical = fileNames.map(normalized);
    assert.equal(new Set(canonical).size, canonical.length, 'Aliased duplicate input binding');
    const drivers = fileNames.filter(p => p in POINTER_DRIVERS); assert.equal(drivers.length, 1, 'Pinned formal Pointer driver required');
    assert.equal(report.files[drivers[0]].sha256, POINTER_DRIVERS[drivers[0]], 'Unapproved Pointer driver bytes');
    const required = [...requiredInputs, ...requiredTools, report.archivePath, ancestor.node.batchPath, DATA_PATH];
    for (const p of required) assert(report.files[p], `Missing UI input binding: ${p}`);
    for (const [p, b] of Object.entries(report.files)) {
      if (p === DATA_PATH) {
        assert.equal(hex(b.sha256), ancestor.node.expectedDataSha256, 'UI table SHA is not its ancestor expected data');
        if (b.sha256 !== archive.expectedDataSha256) dataTransitions.push({ report: ref.path, path: p,
          fromSha256: b.sha256, toSha256: archive.expectedDataSha256, ancestor: ancestor.ref,
          reason: 'Only append-only generated data changed; every ancestor row is identical' });
      } else bind(p, b.sha256);
    }
    const expectedOutputs = report.ids.flatMap(id => {
      const stem = `level-${String(id).padStart(3, '0')}`;
      return [`${stem}-board.png`, `${stem}-opening.png`, `${stem}-complete.png`, `${stem}-timing.json`];
    }).sort();
    assert.deepEqual(Object.keys(report.outputFiles).sort(), expectedOutputs, 'Missing, foreign or unsafe output artifact');
    for (const [name, b] of Object.entries(report.outputFiles)) bind(path.join(path.dirname(ref.path), name), b.sha256);
    for (const row of report.rows) {
      const current = archive.rows.find(r => r.levelId === row.levelId);
      const model = checked.rows.find(r => r.levelId === row.levelId);
      const formal = formalLevels.find(l => l.id === row.levelId); assert(current && model && formal);
      assert.equal(row.status, 'passed');
      for (const key of ['complete', 'pointerReplayValidated', 'formalObjectIdentity', 'oldMetadataPreserved', 'artPassed'])
        assert.equal(row[key], true, `Missing ${key} Lv${row.levelId}`);
      assert(row.coverage?.passed && row.span?.passed && row.gateRenderAudit?.passed);
      assert.deepEqual(row.gateRenderAudit.actual, row.gateRenderAudit.expected);
      assert.equal(row.formalLevelSha256, digest(formal)); assert.equal(row.formalLevelSha256, current.formalLevelSha256);
      assert.equal(row.formalLevelSha256, model.formalLevelSha256);
      const raw = read(current.path, current.sha256);
      assert(report.files[current.path] && report.files[current.sourceReview.path], 'Unbound source/candidate');
      assert.equal(row.sourceData, current.path); assert.equal(row.sourceReport, current.sourceReview.path);
      assert.equal(row.sourceCandidateSha256, digest(raw.level));
      assert.deepEqual(row.approvedDifferences, current.approvedDifferences);
      assert.deepEqual(row.approvedDifferences, model.approvedDifferences);
      for (const key of ['name', 'difficulty', 'timeSeconds', 'reward']) assert.deepEqual(row.metadata[key], formal[key]);
      assert.deepEqual(row.metadata.parMoves, formal.parMoves ?? null);
      assert.deepEqual(row.metadata.actualStarTargets, current.previous.starTargets);
      assert(row.remainingSeconds > 0 && row.remainingSeconds < row.openingRemainingSeconds);
      assert(row.openingRemainingSeconds <= formal.timeSeconds);
      assert(row.naturalClockProbe?.before > row.naturalClockProbe?.after && row.naturalClockProbe.after > 0);
      assert.equal(row.steps.length, current.drags.length); assert.equal(row.effectiveDrags, current.drags.length);
      let time = row.openingRemainingSeconds;
      for (const [i, step] of row.steps.entries()) {
        assert.equal(step.step, i + 1); assert.equal(step.moves, i + 1); assert.equal(step.blockId, current.drags[i].blockId);
        assert(step.remainingSeconds > 0 && step.remainingSeconds <= time); time = step.remainingSeconds;
        assert.equal(step.complete, i === row.steps.length - 1, 'Premature or missing completion');
      }
      assert.equal(row.timingLogFile, `level-${String(row.levelId).padStart(3, '0')}-timing.json`);
      const log = read(path.join(path.dirname(ref.path), row.timingLogFile), report.outputFiles[row.timingLogFile].sha256);
      const timing = replayTiming(formal, log);
      assert.deepEqual(timing, row.observedTiming, 'Fresh whole-model timing replay differs');
      assert(timing.passed && timing.wholeModelReplay && timing.activeTickSeconds > 0);
      assert.equal(timing.levelSha256, row.formalLevelSha256); assert.equal(timing.logSha256, digest(log));
      assert.equal(timing.finalSnapshot.levelId, row.levelId); assert(timing.finalSnapshot.complete && !timing.finalSnapshot.failed);
      assert.equal(timing.finalSnapshot.moves, row.effectiveDrags); assert.equal(timing.finalSnapshot.cleared, row.clearEvents);
      assert.equal(timing.finalSnapshot.remainingSeconds, row.remainingSeconds);
      const evidence = { levelId: row.levelId, report: { path: ref.path, sha256: hex(ref.sha256) },
        archive: ancestor.ref, board: path.join(path.dirname(ref.path), `level-${String(row.levelId).padStart(3, '0')}-board.png`),
        row, model, freshTimingReplay: true };
      // Multiple complete runs are allowed; every run is checked, never used to
      // splice a partial route. The last listed complete run supplies the image.
      covered.set(row.levelId, evidence);
    }
    accepted.push({ path: ref.path, sha256: hex(ref.sha256), ids: report.ids, archive: ancestor.ref });
  }
  const missing = ids(archive.rows).filter(id => !covered.has(id));
  assert.deepEqual(missing, [], `Missing complete Pointer evidence: ${missing.join(',')}`);
  for (const row of checked.rows) bind(row.sourceFrame);
  bind(HISTORICAL_GALLERY);
  return { ruleVersion: '1.11.0', evidenceMode: 'batched-complete-pointer', evidenceLabel: EVIDENCE_LABEL,
    archive: archiveRef, rows: ids(archive.rows).map(id => covered.get(id)), reports: accepted, bindings, dataTransitions,
    currentCampaignSemanticSha256: checked.campaignSemanticSha256, formalIds: checked.formalIds,
    inheritedFormalCount: 82, inheritedEvidenceVersion: '1.10.0', inheritedFreshUiValidated: false,
    allRowsRerunTogether: false, lowerBoundCertified: false, timeAndStarsCalibrated: false, releaseApproved: false };
}

export async function verifyBatchedUiEvidence(archivePath, archiveSha256, reportListPath) {
  const self = 'tools/revised-batched-ui-evidence-v111.mjs';
  const listSha = fileSha(reportListPath), reports = JSON.parse(fs.readFileSync(reportListPath));
  const { verifyContinuationBatchV111, continuationApiV111 } = await import('./revised-continuation-joint-keys-v111.mjs');
  const checked = await verifyContinuationBatchV111(archivePath, archiveSha256);
  const { api, runtime } = await continuationApiV111();
  const result = auditBatchedUiEvidence({ archiveRef: { path: archivePath, sha256: archiveSha256 }, reports, checked,
    formalLevels: runtime.LEVELS, requiredInputs: [...treeFiles('src'), ...treeFiles('public/assets/art')],
    readBytes: p => fs.readFileSync(p), replayTiming: (level, log) => replayObservedModelTiming(level, log, api) });
  result.bindings[reportListPath] = listSha;
  for (const p of [self, 'tools/revised-model-timing-observer.mjs', 'tools/revised-continuation-joint-keys-v111.mjs']) result.bindings[p] = fileSha(p);
  assertBindingsUnchanged(result.bindings);
  return result;
}
