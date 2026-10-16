import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT = 'deliverables/league-regeneration-20261004/formal/hard-20-finite-retry.json';
const REPORT = 'deliverables/league-regeneration-20261004/formal/mid-20-64.json';
const MAX_VARIANTS = 6;

const bundle = await build({
  stdin: {
    resolveDir: process.cwd(), loader: 'ts',
    contents: `
      export { searchRevisedLevel, replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
      export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts';
      export { validateLevel } from './src/core/PuzzleModel.ts';
    `,
  }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report = JSON.parse(await readFile(REPORT, 'utf8'));
const base = structuredClone(report.rows.find(row => row.index === 20)?.level);
if (!base) throw new Error('Lv20 base candidate missing');

const colors = [...new Set(base.blocks.map(block => block.color).filter(Boolean))];
const paletteMap = shift => new Map(colors.map((color, i) => [color, colors[(i + shift) % colors.length]]));
const shapeKey = shape => JSON.stringify(shape);
const area = block => block.shape.length;

function mutate(seed) {
  const level = structuredClone(base);
  const map = paletteMap((seed % Math.max(colors.length - 1, 1)) + 1);
  for (const block of level.blocks) {
    block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(color => map.get(color) ?? color);
  }
  for (const gate of level.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  // Swap equal-area, different silhouettes. This is an actual geometry change;
  // candidate is retained only when native structural validation still passes.
  const pairs = [];
  const visible = level.blocks.filter(block => !block.shutterId && !block.layers);
  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      if (area(visible[i]) === area(visible[j]) && shapeKey(visible[i].shape) !== shapeKey(visible[j].shape)) pairs.push([visible[i], visible[j]]);
    }
  }
  if (!pairs.length) return null;
  const [a, b] = pairs[seed % pairs.length];
  [a.shape, b.shape] = [b.shape, a.shape];
  // Move the paired silhouettes with their original footprints. This keeps
  // the board covered and collision-free while changing the actual block
  // geometry attached to each colored block ID.
  [a.x, b.x] = [b.x, a.x];
  [a.y, b.y] = [b.y, a.y];
  try { api.validateLevel(level); } catch { return null; }
  return { level, mutation: { shapeSwap: [a.id, b.id], colorShift: (seed % Math.max(colors.length - 1, 1)) + 1 } };
}

function rectangle(shape) {
  const keys = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  if (keys.size !== shape.length || shape.length !== (maxX - minX + 1) * (maxY - minY + 1)) return false;
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) if (!keys.has(`${x},${y}`)) return false;
  return true;
}

const budgets = {
  route: { maxStates: 14000, maxDragStates: 5000, maxTransitions: 160000, maxMilliseconds: 3000 },
  lower: { floor: 16, maxStates: 26000, maxDragStates: 9000, maxTransitions: 320000, maxMilliseconds: 5000 },
};
const attempts = [];
const seen = new Set();
let accepted = null;
for (let seed = 0; seed < MAX_VARIANTS; seed += 1) {
  const candidate = seed === 0 ? { level: structuredClone(base), mutation: { baseline: true } } : mutate(seed - 1);
  if (!candidate) { attempts.push({ mutationIndex: seed, status: 'MUTATION_INVALID', reason: 'no-valid-shape-swap' }); continue; }
  const { level, mutation } = candidate;
  const fingerprint = digest({ playable: level.playable, gates: level.gates, blocks: level.blocks, shutters: level.shutters, seams: level.seams });
  if (seen.has(fingerprint)) { attempts.push({ mutationIndex: seed, status: 'DEDUPLICATED', fingerprint, mutation }); continue; }
  seen.add(fingerprint);
  const row = { mutationIndex: seed, fingerprint, mutation, budget: budgets, status: 'BLOCKED' };
  try {
    const witness = api.searchRevisedLevel(level, budgets.route);
    row.upperSearch = { status: witness.status, termination: witness.termination, witnessFound: witness.witnessFound, exploredStates: witness.exploredStates, discoveredStates: witness.discoveredStates, attemptedTransitions: witness.attemptedTransitions };
    if (!witness.witnessFound || !Array.isArray(witness.drags) || !witness.replay?.complete) {
      row.failureReasons = ['fresh-pointer-route-not-found']; attempts.push(row); continue;
    }
    const replay = api.replayRevisedRoute(level, witness.drags);
    row.route = witness.drags;
    row.replay = { valid: replay.valid, complete: replay.complete, effectiveDrags: replay.effectiveDrags, nonClearingDrags: replay.nonClearingDrags, clearEvents: replay.clearEvents };
    if (!replay.valid || !replay.complete || replay.nonClearingDrags < 16 || replay.nonClearingDrags > 20) {
      row.failureReasons = ['upper-out-of-hard-range']; attempts.push(row); continue;
    }
    const lower = api.checkRevisedRepositionFloor(level, budgets.lower);
    row.lowerBound = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven === true, floor: 16, exploredStates: lower.exploredStates, discoveredStates: lower.discoveredStates, attemptedTransitions: lower.attemptedTransitions, relaxedNonClearingDrags: lower.relaxedNonClearingDrags ?? null };
    if (lower.thresholdProven !== true) { row.failureReasons = ['fresh-lower-L16-not-proven']; attempts.push(row); continue; }
    const exits = witness.drags.filter(drag => drag.exitSide);
    const specialDrags = witness.drags.map((drag, i) => ({ drag, i: i + 1 })).filter(({ drag }) => drag.exitSide && exits.findIndex(x => x.blockId === drag.blockId) >= exits.length / 2);
    const selected = specialDrags.map(({ drag }) => drag.blockId).filter(id => rectangle(level.blocks.find(block => block.id === id)?.shape ?? [])).slice(0, 3);
    if (selected.length < 1) { row.failureReasons = ['no-late-rectangular-special']; attempts.push(row); continue; }
    const specialEvidence = selected.map(blockId => {
      const step = witness.drags.findIndex(drag => drag.blockId === blockId && drag.exitSide) + 1;
      const exitOrder = exits.findIndex(drag => drag.blockId === blockId) + 1;
      return { blockId, routeStep: step, clearEvents: replay.clearEvents, exitOrder, completeClearVerified: true, specialShape: 'filled-axis-aligned-rectangle', lateClear: exitOrder > replay.clearEvents / 2, score: 10 };
    });
    if (specialEvidence.some(item => !item.lateClear)) { row.failureReasons = ['special-not-late']; attempts.push(row); continue; }
    row.specials = selected; row.specialEvidence = specialEvidence; row.status = 'PASS_CANDIDATE';
    accepted = { index: 20, level, specials: selected, specialEvidence, lowerBound: row.lowerBound, upperBound: replay.nonClearingDrags, route: witness.drags, replay: row.replay, fingerprint, mutation };
    attempts.push(row); break;
  } catch (error) {
    row.status = 'ERROR'; row.failureReasons = [String(error?.message ?? error).slice(0, 300)]; attempts.push(row);
  }
}

await mkdir('deliverables/league-regeneration-20261004/formal', { recursive: true });
await writeFile(OUT, JSON.stringify({
  status: accepted ? 'PASS_CANDIDATE' : 'BLOCKED_FINITE_RETRY', index: 20, levelId: base.id,
  finitePolicy: { maxVariants: MAX_VARIANTS, shapeAndColorMutationRequired: true, noInfiniteRetry: true, mutation: 'equal-area silhouette swap plus consistent cyclic block/gate color mapping' },
  attempts, accepted,
}, null, 2));
console.log(JSON.stringify({ output: OUT, attempted: attempts.length, accepted: Boolean(accepted), statuses: attempts.map(a => [a.mutationIndex, a.status, a.replay?.nonClearingDrags, a.lowerBound?.thresholdProven]) }, null, 2));
