/*
 * Isolated score-settlement replay for the accepted rows in the second-round
 * early report.  This script deliberately loads the current PuzzleModel,
 * LeagueRun and league settlement functions from source through esbuild.  It
 * never writes a production level registry, selector, or save; the only
 * writes are the partial/final evidence files under deliverables/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/mid-targeted/formal-20-64.json');
const OUTPUT = path.join(ROOT, 'deliverables/league-regeneration-20261005/round2/score/mid-targeted-score-replay.json');
const PARTIAL = `${OUTPUT}.partial`;
const NOW = 1_790_841_600_000; // fixed deterministic epoch used by league tests

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const bundle = await build({
  stdin: {
    resolveDir: ROOT,
    loader: 'ts',
    contents: `
      export { PuzzleModel } from './src/core/PuzzleModel.ts';
      export { LeagueRun } from './src/core/leagueRun.ts';
      export { createLeague, finishLeagueAttempt } from './src/core/league.ts';
    `,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const writePartial = rows => {
  const payload = {
    status: 'PARTIAL_SCORE_REPLAY',
    generatedAt: new Date().toISOString(),
    input: path.relative(ROOT, INPUT).replaceAll('\\', '/'),
    rows,
  };
  fs.writeFileSync(PARTIAL, `${JSON.stringify(payload, null, 2)}\n`);
};

function filledRectangle(shape) {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return shape.length === area && new Set(shape.map(([x, y]) => `${x},${y}`)).size === shape.length;
}

function applyDrag(run, drag, now, step) {
  const model = run.model;
  model.beginAction();
  for (const point of drag.path ?? []) {
    if (!model.moveBlockStep(drag.blockId, point[0], point[1])) {
      model.cancelAction();
      return { ok: false, reason: `move-rejected:${drag.blockId}@${point.join(',')}` };
    }
  }
  let result;
  if (drag.exitSide) {
    result = model.tryExit(drag.blockId, drag.exitSide);
    if (!result.ok) {
      model.cancelAction();
      return { ok: false, reason: `exit-rejected:${drag.blockId}:${drag.exitSide}` };
    }
    // Match ColorEscapeGame's ordering: score from the actual result before
    // committing the gesture, after PuzzleModel has removed/peeled the block.
    run.recordRemoval(result, now + step);
  }
  if (!model.commitAction()) return { ok: false, reason: `commit-noop:${step}` };
  return { ok: true, result };
}

function replayAcceptedRow(row) {
  const accepted = row.accepted;
  const level = accepted.level;
  const selected = accepted.scoreBlocks?.selected ?? [];
  const specialIds = selected.map(item => item.blockId);
  const beforeState = api.createLeague(NOW, 0x5eeda11, 0);
  const run = new api.LeagueRun(beforeState, row.index, level, specialIds, NOW);
  const levelBlocks = new Map(level.blocks.map(block => [block.id, block]));
  const formatErrors = [];
  if (specialIds.length < 1 || specialIds.length > 3) formatErrors.push('special-count-out-of-range');
  if (new Set(specialIds).size !== specialIds.length) formatErrors.push('duplicate-special-id');
  for (const item of selected) {
    const block = levelBlocks.get(item.blockId);
    if (!block) formatErrors.push(`special-missing:${item.blockId}`);
    else {
      if (!filledRectangle(block.shape)) formatErrors.push(`special-not-rectangular:${item.blockId}`);
      if (item.points !== 10) formatErrors.push(`special-points-not-10:${item.blockId}`);
    }
  }

  const clearEvents = [];
  const actionRows = [];
  let replayError;
  for (let i = 0; i < accepted.drags.length; i += 1) {
    const drag = accepted.drags[i];
    const before = run.model.snapshot();
    const outcome = applyDrag(run, drag, NOW, i + 1);
    if (!outcome.ok) {
      replayError = outcome.reason;
      actionRows.push({ step: i + 1, blockId: drag.blockId, exitSide: drag.exitSide ?? null, ok: false, reason: outcome.reason });
      break;
    }
    const after = run.model.snapshot();
    const result = outcome.result;
    const delta = after.cleared - before.cleared;
    if (result?.ok) {
      const clearEvent = clearEvents.length + 1;
      const stillPresent = Boolean(run.model.getBlock(result.blockId));
      const fullyRemoved = result.layerRemoved !== true && !stillPresent;
      clearEvents.push({
        step: i + 1,
        clearEvent,
        blockId: result.blockId,
        layerRemoved: result.layerRemoved === true,
        // `ExitResult.complete` means the whole level is complete.  For
        // league scoring a block is complete when its final layer is gone,
        // even when other blocks remain.
        levelComplete: result.complete === true,
        fullyRemoved,
        stillPresent,
        delta,
      });
    }
    actionRows.push({
      step: i + 1,
      blockId: drag.blockId,
      exitSide: drag.exitSide ?? null,
      ok: true,
      clearEvent: result?.ok ? clearEvents.at(-1).clearEvent : null,
      layerRemoved: result?.layerRemoved === true,
      levelComplete: result?.complete === true,
      fullyRemoved: result?.ok === true && result?.layerRemoved !== true && !run.model.getBlock(result.blockId),
      clearedDelta: delta,
    });
  }

  const snapshot = run.model.snapshot();
  const actualSpecials = specialIds.map(id => {
    const events = clearEvents.filter(event => event.blockId === id);
    const complete = events.find(event => event.fullyRemoved);
    return {
      blockId: id,
      events,
      completeRemoval: Boolean(complete),
      clearEvent: complete?.clearEvent ?? null,
      points: complete ? 10 : 0,
    };
  });
  // The report's `clearEvent` numbering is over all successful exit events,
  // including shell peels.  Keep that event axis for the late-half rule, then
  // require each selected special's *final* removal to land on that axis.
  const completeExitEvents = clearEvents.filter(event => event.fullyRemoved);
  const totalExitEvents = clearEvents.length;
  const lateThreshold = Math.floor(totalExitEvents / 2) + 1;
  const allLate = actualSpecials.every(item => item.completeRemoval && item.clearEvent >= lateThreshold);
  const successful = run.successful;
  const finish = successful
    ? api.finishLeagueAttempt(beforeState, run.attempt, true, run.completedMs)
    : { status: 'not-successful', points: 0, state: beforeState };
  // Negative control: same collected attempt explicitly marked unsuccessful
  // must discard all provisional points and leave the season at zero.
  const failedFinish = api.finishLeagueAttempt(
    api.createLeague(NOW, 0x5eeda11, 0),
    run.attempt,
    false,
    NOW + accepted.drags.length + 1,
  );

  const expectedPoints = specialIds.length * 10;
  const credited = successful && finish.status === 'credited' && finish.points === expectedPoints
    && finish.state.season.score === expectedPoints;
  const failedNotCredited = failedFinish.status === 'discarded'
    && failedFinish.points === 0
    && failedFinish.state.season.score === 0;
  const checks = {
    freshPuzzleModelReplay: !replayError && snapshot.complete && !snapshot.failed,
    successful: !replayError && successful,
    allSpecialsFullyRemoved: actualSpecials.every(item => item.completeRemoval),
    allSpecialsInLateHalf: allLate,
    pointsPerSpecialTen: actualSpecials.every(item => item.points === 10),
    finishLeagueAttemptCredited: Boolean(credited),
    unsuccessfulAttemptPointsZero: failedNotCredited,
  };
  return {
    index: row.index,
    difficulty: row.difficulty,
    target: row.target,
    sourceLevelId: accepted.sourceLevelId,
    levelId: level.id,
    levelSha256: sha256(level),
    routeSha256: digest(accepted.drags),
    expected: {
      specialIds,
      totalPoints: accepted.scoreBlocks.totalPoints,
      lateThreshold: accepted.scoreBlocks.lateThreshold,
      completeExitEvents: accepted.scoreBlocks.completeExitEvents,
    },
    observed: {
      clearEvents,
      completeExitEvents,
      fullyRemovedExitEvents: completeExitEvents,
      successfulExitEvents: clearEvents,
      totalExitEvents,
      lateThreshold,
      specialResults: actualSpecials,
      provisionalPoints: run.provisionalPoints,
      completedMs: run.completedMs ?? null,
      modelSnapshot: { complete: snapshot.complete, failed: snapshot.failed, cleared: snapshot.cleared, moves: snapshot.moves },
      finish: { status: finish.status, points: finish.points, score: finish.state.season.score },
      unsuccessfulFinish: { status: failedFinish.status, points: failedFinish.points, score: failedFinish.state.season.score },
    },
    actionRows,
    replayError: replayError ?? null,
    checks,
    status: Object.values(checks).every(Boolean) ? 'PASS' : 'BLOCKED',
  };
}

const rows = [];
for (const row of input.rows.filter(candidate => candidate.accepted && candidate.status === 'FORMAL_CANDIDATE_READY').sort((a, b) => a.index - b.index)) {
  try {
    rows.push(replayAcceptedRow(row));
  } catch (error) {
    rows.push({ index: row.index, status: 'BLOCKED', checks: {}, error: String(error?.stack ?? error) });
  }
  writePartial(rows);
}

const passed = rows.filter(row => row.status === 'PASS').length;
const output = {
  status: passed === rows.length && rows.length === input.accepted ? 'FORMAL_SCORE_REPLAY_PASS' : 'FORMAL_SCORE_REPLAY_BLOCKED',
  generatedAt: new Date().toISOString(),
  input: path.relative(ROOT, INPUT).replaceAll('\\', '/'),
  inputSha256: digest(input),
  activeRuleVersion: '1.150.0',
  runtimeIntegration: 'ISOLATED_EVIDENCE_ONLY',
  contract: {
    successOnly: true,
    scoreBlocks: '1-3',
    pointsPerBlock: 10,
    lateHalfRequired: true,
    shellPeelDoesNotScore: true,
  },
  acceptedInputRows: input.accepted,
  replayedRows: rows.length,
  passed,
  blocked: rows.filter(row => row.status !== 'PASS').map(row => row.index),
  rows,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
fs.rmSync(PARTIAL, { force: true });
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT).replaceAll('\\', '/'), status: output.status, rows: rows.length, passed, blocked: output.blocked }, null, 2));
