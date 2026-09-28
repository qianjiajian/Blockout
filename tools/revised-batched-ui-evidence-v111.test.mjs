import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { digest } from './revised-preview-validation-v160.mjs';
import { auditBatchedUiEvidence, DATA_PATH, HISTORICAL_GALLERY, POINTER_DRIVERS } from './revised-batched-ui-evidence-v111.mjs';

// Entirely isolated synthetic fixtures, never usable as production certification.
function fixture() {
  const files = new Map(), put = (p, v) => { files.set(path.normalize(p), Buffer.from(typeof v === 'string' ? v : JSON.stringify(v))); return digest(files.get(path.normalize(p))); };
  const readBytes = p => { const b = files.get(path.normalize(p)); assert(b, `Missing fixture ${p}`); return b; };
  const sha = p => digest(readBytes(p)), read = p => JSON.parse(readBytes(p));
  const driver = 'tools/playtest-revised-formal-timed-joint-keys-v111.mjs';
  files.set(path.normalize(driver), fs.readFileSync(driver)); assert.equal(sha(driver), POINTER_DRIVERS[driver]);
  const common = ['src/core/test.ts', 'public/assets/art/test.png', 'tools/revised-formal-levels.html',
    'tools/revised-formal-levels-browser.mjs', 'tools/revised-model-timing-observer.mjs',
    'docs/rules/manifest.json', 'docs/mechanism-rules-v1.11.0.md', 'batch1.json', 'batch2.json'];
  for (const p of common) put(p, `synthetic-not-certification:${p}`);
  put(HISTORICAL_GALLERY, 'synthetic historical page');
  const formalLevels = [21, 22].map(id => ({ id, name: `test${id}`, difficulty: 'normal', timeSeconds: 60, reward: 10, blocks: [] }));
  const rows = formalLevels.map(level => {
    const candidate = { level, drags: [{ blockId: `b${level.id}`, path: [], exitSide: 'left' }] };
    const p = `candidate${level.id}.json`, s = `source${level.id}.json`;
    return { levelId: level.id, path: p, sha256: put(p, candidate), sourceReview: { path: s, sha256: put(s, { independent: true }) },
      drags: candidate.drags, formalLevelSha256: digest(level), approvedDifferences: [], previous: { starTargets: { moveTarget: 1, timeTargetSeconds: 40 } } };
  });
  const oldSha = digest('old table'), newSha = put(DATA_PATH, 'new table');
  const a1 = { schemaVersion: 2, ruleVersion: '1.11.0', rows: rows.slice(0, 1), baseline: { stable: true }, expectedDataSha256: oldSha, batchPath: 'batch1.json' };
  const ref1 = { path: 'a1.json', sha256: put('a1.json', a1) };
  const a2 = { ...a1, rows, batchPath: 'batch2.json', previousArchive: ref1, oldDataSha256: oldSha, expectedDataSha256: newSha };
  const archiveRef = { path: 'a2.json', sha256: put('a2.json', a2) };
  const checked = { status: 'passed-model-not-ui', applied: true, archivePath: archiveRef.path, archiveSha256: archiveRef.sha256,
    inputs: { [DATA_PATH]: newSha }, rows: rows.map(r => ({ ...r, sourceFrame: `frame${r.levelId}.jpg` })), inheritedFormalCount: 82,
    inheritedEvidenceVersion: '1.10.0', inheritedFreshUiValidated: false, formalIds: Array.from({ length: 84 }, (_, i) => i + 21) };
  checked.rows.forEach(r => put(r.sourceFrame, 'original reference'));
  const reports = [];
  for (const [i, source] of rows.entries()) {
    const ancestor = i ? a2 : a1, ancestorRef = i ? archiveRef : ref1;
    const stem = `level-${String(source.levelId).padStart(3, '0')}`, folder = `run${i}`, logName = `${stem}-timing.json`;
    const final = { levelId: source.levelId, moves: 1, cleared: 1, remainingSeconds: 55, complete: true, failed: false };
    const log = { fixtureOnly: true, final }, logSha = put(`${folder}/${logName}`, log);
    const timing = { passed: true, wholeModelReplay: true, activeTickSeconds: 5, levelSha256: source.formalLevelSha256,
      logSha256: digest(log), finalSnapshot: final };
    const outputFiles = { [logName]: { sha256: logSha } };
    for (const suffix of ['board', 'opening', 'complete']) outputFiles[`${stem}-${suffix}.png`] = { sha256: put(`${folder}/${stem}-${suffix}.png`, 'synthetic PNG') };
    const inputNames = [...common, driver, ancestorRef.path, source.path, source.sourceReview.path];
    const r = { ruleVersion: '1.11.0', status: 'passed', naturalClock: true, clockFrozen: false, errors: [], forbiddenStorage: [],
      archivePath: ancestorRef.path, archiveSha256: ancestorRef.sha256, cumulativeIds: ancestor.rows.map(r => r.levelId),
      ids: [source.levelId], passed: 1, files: Object.fromEntries(inputNames.map(p => [p, { sha256: sha(p) }])), outputFiles,
      memoryHost: { backend: 'MemoryHost', loaded: [{ levelId: source.levelId, formalObjectIdentity: true }] },
      rows: [{ levelId: source.levelId, status: 'passed', complete: true, pointerReplayValidated: true, formalObjectIdentity: true,
        oldMetadataPreserved: true, artPassed: true, coverage: { passed: true }, span: { passed: true }, gateRenderAudit: { passed: true, actual: [], expected: [] },
        formalLevelSha256: source.formalLevelSha256, sourceCandidateSha256: digest(formalLevels[i]), sourceData: source.path,
        sourceReport: source.sourceReview.path, approvedDifferences: [], metadata: { ...formalLevels[i], parMoves: null, actualStarTargets: source.previous.starTargets },
        remainingSeconds: 55, openingRemainingSeconds: 60, naturalClockProbe: { before: 60, after: 59 },
        steps: [{ step: 1, moves: 1, blockId: `b${source.levelId}`, remainingSeconds: 55, complete: true }],
        effectiveDrags: 1, clearEvents: 1, timingLogFile: logName, observedTiming: timing }] };
    r.files[DATA_PATH] = { sha256: ancestor.expectedDataSha256 };
    const p = `${folder}/report.json`; reports.push({ path: p, sha256: put(p, r) });
  }
  const context = { archiveRef, reports, checked, formalLevels, requiredInputs: common.slice(0, 2), readBytes,
    replayTiming: (formal, log) => ({ passed: true, wholeModelReplay: true, activeTickSeconds: 5, levelSha256: digest(formal), logSha256: digest(log), finalSnapshot: log.final }) };
  return { context, files, put, read, sha, reports, rows, archiveRef, checked,
    report: (i, mutate) => { const ref = reports[i], r = read(ref.path); mutate(r); ref.sha256 = put(ref.path, r); },
    currentArchive: mutate => { const a = read(archiveRef.path); mutate(a); archiveRef.sha256 = put(archiveRef.path, a); checked.archiveSha256 = archiveRef.sha256; } };
}
const audit = f => auditBatchedUiEvidence(f.context);
test('two complete ancestor runs aggregate; only verified append-data drift is exempt', () => {
  const result = audit(fixture()); assert.equal(result.rows.length, 2); assert.equal(result.dataTransitions.length, 1);
  assert.equal(result.evidenceLabel, '分批完整实操，非本次全量重跑');
  assert.equal(result.inheritedFreshUiValidated, false); assert.equal(result.allRowsRerunTogether, false);
});
for (const [name, change] of [
  ['missing whole level', f => f.context.reports.pop()],
  ['failed report', f => f.report(0, r => r.status = 'failed')],
  ['partial report rows', f => f.report(0, r => r.rows = [])],
  ['wrong report level', f => f.report(0, r => r.rows[0].levelId = 29)],
  ['clock frozen', f => f.report(0, r => r.clockFrozen = true)],
  ['natural clock not running', f => f.report(0, r => r.rows[0].naturalClockProbe.after = 60)],
  ['injected model', f => f.report(0, r => r.rows[0].formalObjectIdentity = false)],
  ['wrong formal level SHA', f => f.report(0, r => r.rows[0].formalLevelSha256 = digest('wrong'))],
  ['wrong candidate SHA', f => f.report(0, r => r.rows[0].sourceCandidateSha256 = digest('wrong'))],
  ['policy differences altered', f => f.report(0, r => r.rows[0].approvedDifferences = [{ field: 'ice' }])],
  ['unrelated archive', f => f.report(0, r => r.archivePath = 'unrelated.json')],
  ['wrong ancestor SHA', f => f.report(0, r => r.archiveSha256 = digest('wrong'))],
  ['ancestor row changed', f => f.currentArchive(a => a.rows[0].drags.push({ blockId: 'extra' }))],
  ['broken append transition', f => f.currentArchive(a => a.oldDataSha256 = digest('wrong'))],
  ['data drift does not match ancestor', f => f.report(0, r => r.files[DATA_PATH].sha256 = digest('wrong'))],
  ['source code drift', f => f.put('src/core/test.ts', 'changed')],
  ['art drift', f => f.put('public/assets/art/test.png', 'changed')],
  ['missing source input', f => f.report(0, r => delete r.files['source21.json'])],
  ['stripped code binding', f => f.report(0, r => delete r.files['src/core/test.ts'])],
  ['missing output image', f => f.report(0, r => delete r.outputFiles['level-021-board.png'])],
  ['image bytes drift', f => f.put('run0/level-021-board.png', 'changed')],
  ['missing log bytes', f => f.files.delete(path.normalize('run0/level-021-timing.json'))],
  ['output path traversal', f => f.report(0, r => r.outputFiles['../foreign.png'] = { sha256: digest('x') })],
  ['unapproved Pointer driver', f => f.report(0, r => r.files['tools/playtest-revised-formal-timed-joint-keys-v111.mjs'].sha256 = digest('fake'))],
  ['partial route', f => f.report(0, r => r.rows[0].steps = [])],
  ['wrong block action', f => f.report(0, r => r.rows[0].steps[0].blockId = 'other')],
  ['clock rewind', f => f.report(0, r => r.rows[0].steps[0].remainingSeconds = 61)],
  ['wrong stars', f => f.report(0, r => r.rows[0].metadata.actualStarTargets.moveTarget = 999)],
  ['no whole-model timing evidence', f => f.report(0, r => r.rows[0].observedTiming.wholeModelReplay = false)],
  ['wrong timing report', f => f.report(0, r => r.rows[0].observedTiming.activeTickSeconds = 0)],
  ['unassisted storage failure', f => f.report(0, r => r.forbiddenStorage.push('setItem'))],
  ['duplicate report', f => f.context.reports.push(f.context.reports[0])],
  ['stale model verification', f => f.checked.applied = false],
]) test(`rejects ${name}`, () => { const f = fixture(); change(f); assert.throws(() => audit(f)); });

test('the production entrypoint always calls the latest fresh verifier and real timing replay', () => {
  const source = fs.readFileSync('tools/revised-batched-ui-evidence-v111.mjs', 'utf8');
  const entry = source.slice(source.indexOf('export async function verifyBatchedUiEvidence'));
  assert.match(entry, /revised-continuation-joint-keys-v111/);
  assert.match(entry, /await verifyContinuationBatchV111\(archivePath, archiveSha256\)/);
  assert.match(entry, /replayObservedModelTiming\(level, log, api\)/);
  assert.match(entry, /assertBindingsUnchanged\(result.bindings\)/);
});
