import fs from 'node:fs';
import assert from 'node:assert/strict';
import { digest } from '../../revised-preview-validation-v160.mjs';
import { verifyRulesLock } from '../../verify-rules-lock.mjs';

const base = 'deliverables/repair78-lift-20260927';
const files = {
  candidate: `${base}/design/candidate-color-3-5-1790517660677.json`,
  enumeration: `${base}/design/enumeration-1790517135309.json`,
  lower: `${base}/design/lower16-1790517719480.json`,
  review: `${base}/review/colored-final-review-1790518051495.json`,
  safety2: `${base}/review/runtime-v2-hidden-ice2-1790517773352.json`,
  safety3: `${base}/review/runtime-v2-hidden-ice3-1790517771267.json`,
  failure0: 'deliverables/diagnose78-lift-20260927/diagnosis.json',
  failure1: `${base}/review/runtime-v2-hidden-ice3-1790517609894.json`,
  failure2: `${base}/review/runtime-v3-hidden-ice3-1790517938007.json`,
  shortcut3: `${base}/design/shortcut-3-1790517347901.json`,
  shortcut4: `${base}/design/candidate-4-1790517136468.json`,
  shortcut5: `${base}/design/shortcut-5-1790517452466.json`,
  strictPrefix: `${base}/late-prefix-1790517580810.json`,
};
const evidence = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { file, sha256: digest(fs.readFileSync(file)) }]));
const data = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(file, 'utf8'))]));
const lock = verifyRulesLock();
assert(lock.ok);
const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json', 'utf8'));
assert.equal(manifest.versions.find(row => row.version === '1.104.0').sha256, '4379a6136fefcba256caa2724f6ea7cd080eabea660f8a13281f6390954a26f8');
const c = data.candidate;
assert.equal(digest(c.level), c.levelSha256);
assert.equal(c.levelSha256, '1efb98287c492e611e33f5b692d796263b01d41d30ae266f28c30a88389e20af');
assert.equal(digest(c.drags), c.routeSha256);
assert.equal(digest(c.lateDrags), c.lateRouteSha256);
assert.equal(c.drags.length, 37);
assert.equal(c.lateDrags.length, 46);
assert(c.replay.valid && c.replay.complete && c.replay.nonClearingDrags === 18 && c.replay.clearEvents === 19);
assert(c.lateReplay.valid && c.lateReplay.complete && c.lateReplay.nonClearingDrags === 27 && c.lateReplay.clearEvents === 19);
assert.equal(data.lower.status, 'THRESHOLD_PROVEN');
assert.equal(data.lower.levelSha256, c.levelSha256);
assert(data.lower.byCost.every(row => row.fullyExhausted));
assert.equal(data.lower.floor, 16);
assert.equal(data.review.status, 'PASS');
assert.equal(data.review.candidate.sha256, evidence.candidate.sha256);
assert.equal(data.review.lower.sha256, evidence.lower.sha256);
assert.equal(data.review.routes[1].revealEvents[0].after, 'clear');
assert.equal(data.review.routes[1].revealEvents[0].cleared, 13);
assert.deepEqual(data.review.routes[1].revealEvents[0].ice, [3, 3]);
for (const key of ['safety2', 'safety3']) {
  assert.equal(data[key].status, 'PASS_ALL_REACHABLE_STATES');
  assert.equal(data[key].levelSha256, c.levelSha256);
  assert(data[key].queueExhausted);
}
for (const key of ['failure1', 'failure2']) assert.equal(data[key].status, 'FAIL_DEADLOCK');
for (const key of ['shortcut3', 'shortcut5']) {
  assert(data[key].replay.valid && data[key].replay.complete);
  assert.equal(data[key].replay.nonClearingDrags, 15);
}
assert(data.shortcut4.lateReplay.valid && data.shortcut4.lateReplay.complete);
assert.equal(data.shortcut4.lateReplay.nonClearingDrags, 15);
assert.equal(data.enumeration.totalTilings, 6);
assert.equal(data.enumeration.tried, 6);
const boundRuntimeBindings = Object.entries(data.lower.bindings).filter(([file]) => file !== 'docs/rules/manifest.json');
for (const [file, sha256] of boundRuntimeBindings) assert.equal(digest(fs.readFileSync(file)), sha256, file);
for (const {file, sha256} of Object.values(evidence)) assert.equal(digest(fs.readFileSync(file)), sha256);

const result = {
  createdAt: new Date().toISOString(),
  status: 'DESIGN_AND_HEADLESS_QUALIFICATION_PASS',
  currentRuleVersion: lock.activeVersion,
  taskRuleVersion: '1.104.0',
  currentRulesLockPassed: true,
  levelSha256: c.levelSha256,
  evidence,
  changes: {hiddenPositions: c.changes, ordinaryColor: c.colorAdaptation, shapesAndIceUnchanged: true},
  routes: [
    {name: 'normal', drags: 37, nonClearing: 18, clears: 19, routeSha256: c.routeSha256, sourceArray: 'candidate.drags', firstReveal: data.review.routes[0].revealEvents[0]},
    {name: 'strictZeroExternalLate', drags: 46, nonClearing: 27, clears: 19, routeSha256: c.lateRouteSha256, sourceArray: 'candidate.lateDrags', firstReveal: data.review.routes[1].revealEvents[0], star37Expected: false},
  ],
  difficulty: {lower: 16, upper: 18, optimalityCertified: false, method: data.lower.proofMethod, elapsedMs: data.lower.elapsedMs, states: data.lower.exploredStates, transitions: data.lower.attemptedTransitions, budget: data.lower.budget, independentQualification: data.review.lower.dynamicQualification},
  safety: data.review.safety,
  purePositionAlternatives: [
    {index: 0, reason: 'Reachable canonical deadlock; full 8-state residual exhausts without a clear', evidenceKey: 'failure0'},
    {index: 1, reason: 'Reachable isolated hidden ice3 deadlock', evidenceKey: 'failure1'},
    {index: 2, reason: 'Reachable isolated hidden ice3 deadlock', evidenceKey: 'failure2'},
    {index: 3, reason: 'Canonical complete U15 shortcut violates required L16', evidenceKey: 'shortcut3'},
    {index: 4, reason: 'Canonical complete U15 shortcut violates required L16', evidenceKey: 'shortcut4', routeArray: 'lateDrags'},
    {index: 5, reason: 'Canonical complete U15 shortcut violates required L16', evidenceKey: 'shortcut5'},
  ],
  minimalAdaptationReason: 'All six full 5x3 tilings of the same six labeled, unrotated bodies have either an exhibited deadlock or a real U15 route. Recoloring one ordinary one-cell cyan body green restores L16 while the chosen four-position rearrangement passes exhaustive hidden-only ice2 and ice3 safety. No shape, frozen color, ice initial value, opening body, gate, area or score change is required.',
  boundaries: [
    data.review.boundary,
    'Initial bounded late-search UNKNOWN/exhausted results were screening only and are not used as unsolvability proofs. Later independent complete component traversal supplies the deadlock exclusions.',
    'Old candidate fields lowerBoundCertified:false and allHiddenOrdersCertified:false are retained unchanged; the new bound and independent review are separately bound evidence.',
    'The normal route reveals during a held move at 12 cleared; its next clear lowers ice3 to ice2. Only the 46-drag route proves first reveal after the 13th clear with zero external bodies and ice3.',
    'This report does not assert GUI Pointer, natural time, production adoption, all-200 preservation, release, or player testing. Those remain separate root acceptance.',
  ],
  boundRuntimeBindings: Object.fromEntries(boundRuntimeBindings),
  currentManifestSha256: digest(fs.readFileSync('docs/rules/manifest.json')),
  independentManifestContinuity: data.review.lower.concurrentRuleChanges,
  scriptSha256: digest(fs.readFileSync('tools/repair78-lift-20260927/design/summarize-final.mjs')),
};
const out = `${base}/design/final-design-${Date.now()}.json`;
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({out, sha256: digest(fs.readFileSync(out)), status: result.status, lower: 16, upper: 18, mainDrags: 37, strictLateDrags: 46}));
