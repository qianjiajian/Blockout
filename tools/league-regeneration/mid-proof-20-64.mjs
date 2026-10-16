import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const input = JSON.parse(await readFile('deliverables/league-regeneration-20261004/mid-experiments/candidates-20-64.json', 'utf8'));
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    export { searchRevisedLevel, replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
    export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts';
    export { PuzzleModel, validateLevel } from './src/core/PuzzleModel.ts';
  ` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const budgets = { maxStates: 5000, maxDragStates: 1000, maxTransitions: 100000, maxMilliseconds: 1500 };

const mutateColorAndShape = level => {
  const candidate = structuredClone(level);
  const colors = [...new Set(candidate.blocks.map(block => block.color).filter(Boolean))];
  if (colors.length < 2) return candidate;
  const map = new Map(colors.map((color, index) => [color, colors[(index + 1) % colors.length]]));
  for (const block of candidate.blocks) {
    block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(color => map.get(color) ?? color);
  }
  for (const gate of candidate.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  for (const grid of candidate.coloredGrids ?? []) grid.color = map.get(grid.color) ?? grid.color;
  const playable = new Set((candidate.playable ?? []).map(([x, y]) => `${x},${y}`));
  const shapeFits = block => {
    const maxX = Math.max(...block.shape.map(([x]) => x));
    const reflected = block.shape.map(([x, y]) => [maxX - x, y]);
    return reflected.every(([dx, dy]) => playable.has(`${block.x + dx},${block.y + dy}`));
  };
  const target = candidate.blocks.find(block => !block.shutterId && !block.keyId && !block.lockedBy && shapeFits(block));
  if (target) {
    const maxX = Math.max(...target.shape.map(([x]) => x));
    target.shape = target.shape.map(([x, y]) => [maxX - x, y]);
  }
  return candidate;
};

const run = (level, mutationIndex, solverAttempt) => {
  const levelSha256 = fingerprint(level);
  const row = { levelId: level.id, mutationIndex, solverAttempt, fingerprint: levelSha256, budget: budgets };
  try { api.validateLevel(level); } catch (error) { return { ...row, status: 'invalid', failureReasons: [String(error?.message ?? error)] }; }
  let witness;
  try { witness = api.searchRevisedLevel(level, budgets); } catch (error) {
    return { ...row, status: 'solver-error', failureReasons: [String(error?.message ?? error)] };
  }
  row.witness = { status: witness.status, termination: witness.termination, exploredStates: witness.exploredStates, discoveredStates: witness.discoveredStates, attemptedTransitions: witness.attemptedTransitions };
  if (!witness.witnessFound || !witness.replay?.complete) {
    return { ...row, status: 'REGENERATE_AFTER_FINITE_BUDGET', failureReasons: witness.reasons?.length ? witness.reasons : [witness.termination] };
  }
  const route = witness.drags;
  const target = level.difficulty === 'super' ? 21 : 16;
  let lower;
  try {
    lower = api.checkRevisedRepositionFloor(level, { floor: target, ...budgets });
  } catch (error) {
    return { ...row, status: 'lower-bound-error', U: route.length, failureReasons: [String(error?.message ?? error)], route };
  }
  row.U = route.length;
  row.L = lower.thresholdProven ? target : null;
  row.lower = { status: lower.status, termination: lower.termination, thresholdProven: lower.thresholdProven, exploredStates: lower.exploredStates, discoveredStates: lower.discoveredStates, attemptedTransitions: lower.attemptedTransitions };
  row.route = route;
  row.status = lower.thresholdProven && route.length <= (level.difficulty === 'super' ? 30 : 20) ? 'CANDIDATE_SPATIAL_ACCEPTED' : 'ROUTE_ONLY_PENDING_LOWER_BOUND';
  return row;
};

const results = [];
for (const original of input.candidates) {
  if (!original.level) { results.push({ levelId: 900000 + original.index, status: 'BLOCKED_MECHANISM_TRANSFORM', failureReasons: [original.validationError] }); continue; }
  const attempts = [structuredClone(original.level)];
  const rows = [];
  for (let mutationIndex = 0; mutationIndex < 2 && attempts[mutationIndex]; mutationIndex += 1) {
    const row = run(attempts[mutationIndex], mutationIndex, mutationIndex + 1);
    rows.push(row);
    if (row.status === 'CANDIDATE_SPATIAL_ACCEPTED') break;
    if (mutationIndex === 0) attempts.push(mutateColorAndShape(attempts[0]));
  }
  results.push({ levelId: original.level.id, sourceIndex: original.index, attempts: rows, selected: rows.find(row => row.status === 'CANDIDATE_SPATIAL_ACCEPTED')?.fingerprint ?? null });
}
const accepted = results.flatMap(row => row.attempts ?? []).filter(row => row.status === 'CANDIDATE_SPATIAL_ACCEPTED');
const report = { status: 'FINITE_CANDIDATE_AUDIT', generatedAt: new Date().toISOString(), policy: { finiteAttemptsPerLevel: 2, mutateAfterTimeout: true, mutation: 'cyclic color permutation plus one safe in-bounds horizontal shape reflection; mechanism topology preserved', lowerBound: 'hard L16, super L21', budgets }, acceptedCount: accepted.length, results };
await writeFile('deliverables/league-regeneration-20261004/mid-experiments/proof-20-64.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, acceptedCount: report.acceptedCount, routeOnly: results.flatMap(row => row.attempts ?? []).filter(row => row.status === 'ROUTE_ONLY_PENDING_LOWER_BOUND').length, regenerated: results.flatMap(row => row.attempts ?? []).filter(row => row.status === 'REGENERATE_AFTER_FINITE_BUDGET').length, output: 'deliverables/league-regeneration-20261004/mid-experiments/proof-20-64.json' }, null, 2));
