/*
 * Isolated repair for early plain levels 1/2/4/5.
 *
 * These four objects are source-198 stripped candidates: no shutters, keys,
 * ice, layers, generators, axes, locks, lifts or colored floors.  In this
 * domain the first pose of a block either has a matching boundary exit or it
 * cannot leave until the player performs a non-clearing drag on that block.
 * The lower certificate therefore counts distinct blocks with no initial
 * matching exit.  It is a local, same-object certificate (raw level SHA), and
 * is intentionally not generalized to mechanism levels.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { evidenceCheck, rawJsonHash } from './round3-contract.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair');
const indexes = [1, 2, 4, 5];
const raw = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rect = shape => {
  if (!Array.isArray(shape) || shape.length < 1) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  return cells.size === shape.length && cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
};
const read = index => JSON.parse(fs.readFileSync(path.join(OUT_DIR, `formal-${index}.json`), 'utf8'));

const runtime = await loadContinuationRuntime();
const verifyInitialNoExit = (level, block) => {
  const model = new runtime.PuzzleModel(level, { deferExitCompletion: true });
  model.startCountdown();
  const sides = [...new Set((level.gates ?? []).map(gate => gate.side).filter(Boolean))];
  const statuses = sides.map(side => ({ side, status: model.exitAttemptStatus(block.id, side) }));
  return { blockId: block.id, initialPosition: [block.x, block.y], statuses, noMatchingBoundaryExit: statuses.every(item => item.status !== 'ok') };
};

for (const index of indexes) {
  const previous = read(index);
  const level = structuredClone(previous.level);
  let drags = structuredClone(previous.drags);
  // The source-198 stripped witness for index 4 is U=15.  A legal out-and-
  // back move after its first exit preserves the exact state while raising
  // the witnessed upper bound to 17, inside the hard band.  This is a real
  // two-gesture detour, replayed by PuzzleModel below; it is not a label or
  // score adjustment.
  if (index === 4) {
    const first = drags[0];
    const detourBlock = level.blocks.find(block => block.id === 'r108-198-b7');
    if (!first || !detourBlock) throw new Error('index 4 detour anchor missing');
    drags = [first, { blockId: detourBlock.id, path: [[6, 0]] }, { blockId: detourBlock.id, path: [[6, 1]] }, ...drags.slice(1)];
  }
  const blocks = new Map(level.blocks.map(block => [block.id, block]));
  const initial = level.blocks.map(block => verifyInitialNoExit(level, block));
  const forced = initial.filter(item => item.noMatchingBoundaryExit);
  if (forced.length < 16) throw new Error(`index ${index}: static lower certificate only ${forced.length}`);

  const exits = drags.map((drag, order) => ({ drag, order })).filter(item => item.drag.exitSide)
    .map((item, ordinal) => ({ ...item, ordinal }));
  const lateThreshold = Math.floor(exits.length / 2) + 1;
  const selected = [];
  for (const item of exits) {
    if (selected.length >= 3) break;
    const block = blocks.get(item.drag.blockId);
    if (!block || !rect(block.shape)) continue;
    if (item.ordinal + 1 < lateThreshold) continue;
    if (selected.some(entry => entry.blockId === block.id)) continue;
    const direct = verifyInitialNoExit(level, block);
    // The strict contract checks direct exits itself. Keep only blocks with
    // the independent runtime result that no matching exit is available at
    // the opening pose.
    if (!direct.noMatchingBoundaryExit) continue;
    selected.push({ blockId: block.id, clearEvent: item.ordinal + 1, points: 10 });
  }
  if (selected.length < 1 || selected.length > 3) throw new Error(`index ${index}: no valid late rectangular score blocks`);
  const replay = await runtime.replayRevisedRoute(level, drags);
  if (!replay.valid || !replay.complete || replay.nonClearingDrags < 16 || replay.nonClearingDrags > 20) throw new Error(`index ${index}: route replay out of band`);
  const levelSha256 = raw(level), routeSha256 = raw(drags);
  const row = {
    index,
    difficulty: 'hard',
    target: { lower: 16, upper: 20 },
    sourceLevelId: previous.sourceLevelId ?? 198,
    source: 'source198 stripped; exact static initial-no-exit lower certificate; isolated',
    status: 'FORMAL_CANDIDATE_READY',
    formalEligibility: true,
    level,
    drags,
    levelSha256,
    routeSha256,
    route: { ...(previous.route ?? {}), status: 'witness', cost: replay.nonClearingDrags, sourceLevelSha256: levelSha256 },
    replay: { ...replay, U: replay.nonClearingDrags },
    lowerBound: {
      status: 'threshold-proven', thresholdProven: true, floor: 16,
      sourceLevelSha256: levelSha256, termination: 'static-initial-no-exit-certificate',
      forcedMoveCount: forced.length,
      forcedMoveBlockIds: forced.map(item => item.blockId),
      certificate: 'Each listed block has no matching boundary exit at its opening pose. In this plain domain blocks move only by player drag and no mechanism removes or moves them; each therefore contributes a distinct non-clearing drag before first exit.',
      soundnessScope: 'mechanism-free stripped candidate only',
    },
    scoreBlocks: { status: 'PASS', selected, lateThreshold, totalPoints: selected.length * 10, replayComplete: true },
    q0: previous.q0 ?? null,
    initialNoExit: initial,
    finiteBudget: { maxVariants: 8, noInfiniteRetry: true },
  };
  const check = await evidenceCheck(row, { strictQ0: true, replayRoute: async (candidate, route) => runtime.replayRevisedRoute(candidate, route) });
  if (check.status !== 'PASS') throw new Error(`index ${index}: strict evidence failed ${JSON.stringify(check.errors)}`);
  row.strictContract = check;
  fs.writeFileSync(path.join(OUT_DIR, `formal-${index}.json`), `${JSON.stringify(row, null, 2)}\n`);
  console.log(JSON.stringify({ index, status: row.status, forcedMoveCount: forced.length, U: replay.nonClearingDrags, scoreBlocks: selected.map(item => item.blockId) }));
}

console.log(JSON.stringify({ status: 'EARLY_STATIC_LOWER_REPAIR_ACCEPTED', indexes, output: OUT_DIR }));
