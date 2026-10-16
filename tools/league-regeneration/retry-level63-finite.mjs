/*
 * Finite retry for league level 63.  The source candidate already proves the
 * super-band lower bound (L21) but has no canonical pointer route.  This file
 * deliberately tries eight deterministic colour/shape variants, then stops;
 * it never loops or changes the production registry.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';

const base = JSON.parse(fs.readFileSync(
  'deliverables/league-regeneration-20261004/mid-experiments/level63-variant7-rejected.json',
  'utf8',
)).level;
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export { searchRevisedLevel, replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
    export { validateLevel, PuzzleModel } from './src/core/PuzzleModel.ts';
  ` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const spatial = await loadSpatialApi();
const outDir = 'deliverables/league-regeneration-20261004/formal';
const outputFile = `${outDir}/mid-63-finite-retry-subagent.json`;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const colors = ['red', 'blue', 'yellow', 'green', 'pink', 'purple', 'orange', 'cyan'];
const mapFields = (block, map) => {
  block.color = map.get(block.color) ?? block.color;
  if (block.layers) block.layers = block.layers.map(color => map.get(color) ?? color);
};
const colorSwap = (level, a, b, gates) => {
  const candidate = structuredClone(level);
  const map = new Map([[a, b], [b, a]]);
  for (const block of candidate.blocks) mapFields(block, map);
  if (gates) for (const gate of candidate.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  return candidate;
};
const cellKey = ([x, y]) => `${x},${y}`;
const blockCells = block => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const rotateShape = shape => {
  const maxY = Math.max(...shape.map(([, y]) => y));
  const rotated = shape.map(([x, y]) => [maxY - y, x]);
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));
  return rotated.map(([x, y]) => [x - minX, y - minY]);
};
const tryRotateFirst = level => {
  const candidate = structuredClone(level);
  const playable = new Set((candidate.playable ?? []).map(cellKey));
  const occupiedByOthers = new Set();
  for (const block of candidate.blocks.slice(1)) for (const cell of blockCells(block)) occupiedByOthers.add(cellKey(cell));
  for (const block of candidate.blocks) {
    if (block.shutterId || block.layers?.length > 1 || block.movementAxis) continue;
    const next = rotateShape(block.shape);
    const cells = next.map(([dx, dy]) => [block.x + dx, block.y + dy]);
    if (cells.every(cell => playable.has(cellKey(cell))) && cells.every(cell => !occupiedByOthers.has(cellKey(cell)))) {
      block.shape = next;
      return candidate;
    }
  }
  return candidate;
};
const shapeKey = shape => JSON.stringify(shape);
const swapEqualShapePositions = level => {
  const candidate = structuredClone(level);
  const groups = new Map();
  for (const b of candidate.blocks) {
    if (b.shutterId) continue;
    const key = `${shapeKey(b.shape)}|${b.movementAxis ?? ''}|${b.layers?.length ?? 1}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const a = group[0], b = group[1];
    [a.x, b.x] = [b.x, a.x]; [a.y, b.y] = [b.y, a.y];
    return candidate;
  }
  return candidate;
};
// A genuine local re-tile: the two horizontal dominoes at the lower-left
// corner keep the same four occupied cells but become side-by-side vertical
// dominoes.  This changes both silhouettes and initial anchors while retaining
// the native block-shape vocabulary.
const retileLowerLeftPair = level => {
  const candidate = structuredClone(level);
  const a = candidate.blocks.find(b => b.id === 'v146-63-opening-4');
  const b = candidate.blocks.find(b => b.id === 'v146-63-opening-7');
  if (!a || !b) return candidate;
  const domino = [[0, 0], [0, 1]];
  a.shape = structuredClone(domino); a.x = 0; a.y = 6;
  b.shape = structuredClone(domino); b.x = 1; b.y = 6;
  return candidate;
};
const retiled = retileLowerLeftPair(base);
// Every retry after the untouched baseline changes both a real silhouette and
// a colour mapping. This prevents a colour-only retry from masquerading as the
// requested shape-and-colour regeneration.
const variants = [
  base,
  colorSwap(retiled, 'red', 'blue', false),
  colorSwap(retiled, 'red', 'blue', true),
  colorSwap(retiled, 'orange', 'purple', false),
  colorSwap(retiled, 'orange', 'purple', true),
  colorSwap(retiled, 'yellow', 'green', false),
  colorSwap(retiled, 'pink', 'cyan', false),
  swapEqualShapePositions(colorSwap(retiled, 'yellow', 'green', true)),
];

const attempts = [];
let accepted;
const shapeSignature = level => JSON.stringify(level.blocks.map(block => [block.id, block.x, block.y, block.shape]));
const colorSignature = level => JSON.stringify(level.blocks.map(block => [block.id, block.color, block.layers]));
for (let index = 0; index < variants.length; index += 1) {
  const level = variants[index];
  const fingerprint = hash(level);
  const row = {
    index: 63,
    levelId: level.id,
    mutationIndex: index,
    solverAttempt: index + 1,
    fingerprint,
    budget: { maxStates: 16000, maxDragStates: 6000, maxTransitions: 700000, maxMilliseconds: 2500 },
    mutationPolicy: index === 0 ? 'base' : 'bounded shape/color mutation',
  };
  row.shapeChanged = index > 0 && shapeSignature(level) !== shapeSignature(base);
  row.colorChanged = index > 0 && colorSignature(level) !== colorSignature(base);
  if (index > 0 && (!row.shapeChanged || !row.colorChanged)) {
    row.status = 'INVALID_MUTATION';
    row.failureReasons = ['retry-must-change-both-shape-and-color'];
    attempts.push(row);
    continue;
  }
  try {
    runtime.validateLevel(level);
    // Reject accidental non-native silhouettes before spending solver budget.
    for (const block of level.blocks) {
      if (!spatial.matchFormalBlockShape(block.shape)) throw new Error(`non-native shape ${block.id}`);
    }
    const search = runtime.searchRevisedLevel(level, row.budget);
    row.witness = {
      status: search.status,
      termination: search.termination,
      exploredStates: search.exploredStates,
      discoveredStates: search.discoveredStates,
      attemptedTransitions: search.attemptedTransitions,
    };
    if (!search.witnessFound || !search.replay?.valid || !search.replay.complete) {
      row.status = 'REGENERATE_AFTER_FINITE_BUDGET';
      row.failureReasons = search.reasons?.length ? search.reasons : ['no canonical complete route within bounded search'];
      attempts.push(row);
      continue;
    }
    row.replay = { valid: search.replay.valid, complete: search.replay.complete, nonClearingDrags: search.replay.nonClearingDrags, clearEvents: search.replay.clearEvents };
    row.route = search.drags;
    if (search.replay.nonClearingDrags < 21 || search.replay.nonClearingDrags > 30) {
      row.status = 'ROUTE_OUT_OF_SUPER_BAND';
      row.failureReasons = [`canonical route U=${search.replay.nonClearingDrags}; expected 21–30`];
      attempts.push(row);
      continue;
    }
    const lower = searchSpatial(level, spatial, { floor: 21, prove: true, normalize: false, maxStates: 350000, maxTransitions: 2400000, maxMilliseconds: 6000, orderSeed: index });
    row.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, discoveredStates: lower.discoveredStates, attemptedTransitions: lower.attemptedTransitions };
    if (!lower.thresholdProven) {
      row.status = 'ROUTE_ONLY_PENDING_LOWER_BOUND';
      row.failureReasons = ['canonical U in band but fresh spatial L21 proof did not terminate threshold-proven'];
      attempts.push(row);
      continue;
    }
    // A special must be an axis-aligned filled rectangle and every layer exit
    // must occur after half the clear events.  Select up to three deterministically.
    const eventsByBlock = new Map();
    let event = 0;
    for (const drag of search.drags) {
      if (!drag.exitSide) continue;
      const block = level.blocks.find(b => b.id === drag.blockId);
      const layers = block?.layers?.length ?? 1;
      const list = eventsByBlock.get(drag.blockId) ?? [];
      for (let layer = 0; layer < layers; layer += 1) list.push(++event);
      eventsByBlock.set(drag.blockId, list);
    }
    const rectangle = block => {
      const cells = block.shape;
      const maxX = Math.max(...cells.map(([x]) => x));
      const maxY = Math.max(...cells.map(([, y]) => y));
      return cells.length === (maxX + 1) * (maxY + 1) && new Set(cells.map(cellKey)).size === cells.length;
    };
    const specials = level.blocks.filter(rectangle).filter(b => (eventsByBlock.get(b.id) ?? []).every(n => n > event / 2)).slice(0, 3).map(b => b.id);
    const specialAudit = { status: specials.length >= 1 ? 'PASS' : 'PENDING', clearEvents: event, specials, policy: 'filled axis-aligned rectangle; all clear events after latter-half boundary' };
    row.specialAudit = specialAudit;
    if (specialAudit.status !== 'PASS') {
      row.status = 'SPECIAL_TIMING_PENDING';
      row.failureReasons = ['no 1–3 rectangular specials with complete latter-half clear evidence'];
      attempts.push(row);
      continue;
    }
    row.status = 'FORMAL_CANDIDATE_READY';
    row.formalEligibility = true;
    row.level = level;
    row.specials = specials;
    row.specialsPolicy = '1–3 filled axis-aligned rectangles; complete clear events in latter half';
    accepted = row;
    attempts.push(row);
    break;
  } catch (error) {
    row.status = 'INVALID_OR_SOLVER_ERROR';
    row.failureReasons = [String(error?.message ?? error).slice(0, 300)];
    attempts.push(row);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: accepted ? 'FORMAL_CANDIDATE_READY' : 'FINITE_RETRY_EXHAUSTED',
  range: [63, 63],
  finitePolicy: { maxAttempts: variants.length, shapeOrColorMutation: true, infiniteRetry: false },
  attempts,
  acceptedCount: accepted ? 1 : 0,
  accepted: accepted ?? null,
};
fs.writeFileSync(outputFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, attempts: attempts.length, accepted: Boolean(accepted), output: outputFile }, null, 2));
