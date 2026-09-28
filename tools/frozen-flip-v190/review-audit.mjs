import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// Read-only production audit. Each invocation appends fresh evidence; no prior
// certificate, fixture, source file, save or generated game package is changed.
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'playtest-results/frozen-flip-v190/review');
const sha = value => createHash('sha256').update(value).digest('hex');
const fixturePath = 'tests/fixtures/remake141to150-v173.json';
const fixtureBytes = await readFile(path.join(root, fixturePath));
const fixture = JSON.parse(fixtureBytes);
const candidatePath = process.argv[2];
const candidateBytes = candidatePath ? await readFile(path.resolve(root, candidatePath)) : undefined;
const candidate = candidateBytes ? JSON.parse(candidateBytes) : undefined;
const buildResult = await build({
  stdin: { resolveDir: root, contents: `
    export { LEVELS } from './src/core/levels.ts';
    export { PuzzleModel } from './src/core/PuzzleModel.ts';
  ` },
  bundle: true, write: false, platform: 'node', format: 'esm', metafile: true,
});
const bindings = {};
for (const file of Object.keys(buildResult.metafile.inputs).filter(file => file !== '<stdin>')) {
  bindings[file] = sha(await readFile(path.resolve(root, file)));
}
for (const file of [fixturePath, 'tools/frozen-flip-v190/review-audit.mjs', 'docs/rules/manifest.json']) {
  bindings[file] = sha(await readFile(path.join(root, file)));
}
if (candidatePath) bindings[candidatePath] = sha(candidateBytes);
const { LEVELS, PuzzleModel } = await import(`data:text/javascript;base64,${Buffer.from(buildResult.outputFiles[0].text).toString('base64')}`);
const inspectDoors = model => model.snapshot().flipDoors.map(({ id, frozen, open }) => ({ id, frozen, open }));
const replay = (level, drags, deferExitCompletion) => {
  const model = new PuzzleModel(structuredClone(level), { deferExitCompletion });
  model.startCountdown();
  const steps = [];
  let failure;
  for (const [index, drag] of drags.entries()) {
    const before = model.snapshot();
    const row = { step: index + 1, drag, beforeDoors: inspectDoors(model) };
    steps.push(row);
    try {
      model.tick(0.02);
      model.beginAction();
      for (const point of drag.path) {
        model.tick(0.02);
        assert(model.moveBlockStep(drag.blockId, ...point), `cannot move ${drag.blockId} to ${point}`);
      }
      if (drag.exitSide) {
        row.exitStatus = model.exitAttemptStatus(drag.blockId, drag.exitSide);
        const result = model.tryExit(drag.blockId, drag.exitSide);
        assert(result.ok, `cannot exit ${drag.blockId}/${drag.exitSide}: ${row.exitStatus}`);
        row.afterEventDoors = inspectDoors(model);
        row.pending = model.snapshot().pendingExitAnimations;
        row.eligibleDoors = model.snapshot().pendingExitFlipDoorIds;
        if (deferExitCompletion && result.exitAnimationId) {
          model.tick(0.2);
          assert(model.completeExitAnimation(result.exitAnimationId), 'departure completion rejected');
          assert(!model.completeExitAnimation(result.exitAnimationId), 'duplicate completion accepted');
        }
      }
      assert(model.commitAction(), 'gesture did not commit');
      const after = model.snapshot();
      assert(!after.failed, 'model failed');
      row.cleared = after.cleared - before.cleared;
      row.afterDoors = inspectDoors(model);
    } catch (error) {
      failure = { step: index + 1, message: String(error.message), doors: inspectDoors(model) };
      break;
    }
  }
  const final = model.snapshot();
  return { status: !failure && final.complete ? 'PASS' : 'FAIL', deferExitCompletion,
    routeLength: drags.length, completedSteps: steps.filter(step => step.afterDoors).length,
    moves: final.moves, complete: final.complete, failure, steps, final };
};
const frozenFlip = LEVELS.filter(level => level.flipDoors?.some(door => door.frozen > 0));
const rows = [];
for (const level of frozenFlip) {
  const witness = fixture.rows.find(row => row.id === level.id);
  const currentCandidate = candidate?.levelId === level.id ? candidate : undefined;
  if (currentCandidate) assert.equal(currentCandidate.levelSha256, sha(JSON.stringify(level)), 'New witness must bind the unchanged current formal level');
  rows.push({ id: level.id, levelSha256: sha(JSON.stringify(level)), profile: level.mechanismRules,
    doors: level.flipDoors, oldWitnessAvailable: Boolean(witness),
    ...(witness ? { witnessLevelSha256: sha(JSON.stringify(witness.level)),
      onlyProfileDiffers: JSON.stringify({ ...level, mechanismRules: witness.level.mechanismRules }) === JSON.stringify(witness.level),
      immediate: replay(level, witness.drags, false), deferred: replay(level, witness.drags, true) } : {}),
    ...(currentCandidate ? { newWitness: { path: candidatePath, sha256: sha(candidateBytes),
      immediate: replay(level, currentCandidate.drags, false), deferred: replay(level, currentCandidate.drags, true) } } : {}),
  });
}
const drift = [];
for (const [file, expected] of Object.entries(bindings)) {
  const actual = sha(await readFile(path.resolve(root, file)));
  if (actual !== expected) drift.push({ file, expected, actual });
}
const report = { kind: 'independent-frozen-flip-current-formal-route-review', createdAt: new Date().toISOString(),
  scope: 'Model replay only; no Pointer, natural-clock GUI, lower-bound certification or release approval',
  profileCounts: LEVELS.reduce((counts, level) => { const p = level.mechanismRules ?? 'legacy'; counts[p] = (counts[p] ?? 0) + 1; return counts; }, {}),
  allFlipLevelIds: LEVELS.filter(level => level.flipDoors?.length).map(level => level.id),
  frozenFlipLevelIds: frozenFlip.map(level => level.id),
  fixture: { path: fixturePath, sha256: sha(fixtureBytes) }, bindings, drift, rows };
await mkdir(output, { recursive: true });
const reportPath = path.join(output, `audit-${Date.now()}.json`);
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reportPath, profileCounts: report.profileCounts, allFlipLevelIds: report.allFlipLevelIds,
  frozenFlipLevelIds: report.frozenFlipLevelIds, drift, rows: rows.map(({ id, profile, immediate, deferred, newWitness }) => ({ id, profile,
    immediate: { status: immediate?.status, moves: immediate?.moves, failure: immediate?.failure },
    deferred: { status: deferred?.status, moves: deferred?.moves, failure: deferred?.failure },
    ...(newWitness ? { newWitness: {
      immediate: { status: newWitness.immediate.status, moves: newWitness.immediate.moves, failure: newWitness.immediate.failure },
      deferred: { status: newWitness.deferred.status, moves: newWitness.deferred.moves, failure: newWitness.deferred.failure },
    } } : {}),
  })) }, null, 2));
if (drift.length) process.exitCode = 1;
