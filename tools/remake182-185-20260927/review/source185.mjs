import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const manifest = read('docs/rules/manifest.json');
const sourcePath = '.codex-temp/remaining98-v111/review185-new/observations-185.json';
const reviewPath = 'deliverables/remake181-190-v146-20260924/source186-190/185-review-public-video-1790255990390.json';
const source = read(sourcePath), prior = read(reviewPath);
const records = [...prior.priorBindingsVerified, ...prior.sourceBindings];
for (const record of records) assert.equal(hash(fs.readFileSync(record.path)), record.sha256, record.path);
const frames = source.frames.filter(frame => [541, 613, 614].includes(frame.sec));
assert.equal(frames.length, 3);
for (const frame of frames) assert.equal(hash(fs.readFileSync(frame.path)), frame.sha256, frame.path);
const gates = source.gates.filter(gate => gate.flip && gate.frozen > 0);
assert.deepEqual(gates.map(gate => [gate.color, gate.frozen, gate.initialOpen, gate.firstThawedOpen]), [
  ['purple', 14, null, false], ['orange', 14, null, false], ['blue', 14, null, false]
]);
assert.deepEqual(prior.confirmedCheckpoint.open, [false, false, false]);
assert.deepEqual(prior.confirmedCheckpoint.afterNextLowerBodyClearOpen, [true, true, true]);
const result = {
  createdAt: new Date().toISOString(),
  taskRuleVersion: '1.107.0', activeRuleVersion: manifest.activeVersion,
  levelId: 185,
  status: 'REVIEW_COMPLETE_SOURCE_INITIAL_OPEN_REMAINS_UNKNOWN',
  independentlyViewed: frames,
  visualFindings: [
    '541: Level185 first stable opening, five lower ice14 masks fully obscure underlying flip leaves.',
    '613: Lower seventeen bodies revealed; orange, purple and blue flip leaves are closed before any lower clear.',
    '614: First lower mint single has exited; the three flip leaves are now open.'
  ],
  reasoning: [
    'v1.90 specifies our v1.5 behavior: frozen flips preserve initiallyOpen and the 1-to-0 event does not toggle.',
    'That rule does not establish the competitor implementation or recover an unobservable competitor opening boolean.',
    'Assigning false in our v1.5 level reproduces the confirmed first usable closed checkpoint, but is a source adapter choice, not newly verified source truth.',
    'The v1.107 authorization covers colors, shapes and necessary layouts, and explicitly does not extend level190 originality to level185 unknown initial flip phases.'
  ],
  sourceInitialOpen: Object.fromEntries(gates.map(gate => [gate.color, null])),
  proposedAdapterInitialOpen: Object.fromEntries(gates.map(gate => [gate.color, false])),
  adapterState: 'NOT_YET_USER_ACCEPTED',
  acceptance: 'Prepare and validate the concrete false-phase candidate; do not mark source facts as known or formally accept the adapter without resolving this scoped authorization.',
  priorRecordsVerified: records.length,
  bindings: Object.fromEntries([
    sourcePath, reviewPath, 'docs/rules/mechanism-rules-v1.90.0.md',
    'docs/rules/mechanism-rules-v1.107.0.md', 'tools/remake182-185-20260927/review/source185.mjs',
    ...frames.map(frame => frame.path)
  ].map(file => [file, hash(fs.readFileSync(file))])),
  productionModified: false,
  candidateCertified: false
};
const out = path.join('deliverables/remake182-185-20260927/review', `source185-${Date.now()}.json`);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({out, status: result.status, priorRecordsVerified: result.priorRecordsVerified}));
