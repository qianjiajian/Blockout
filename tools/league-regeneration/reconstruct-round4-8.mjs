/* Reconstruct the finite round-4 index-8 candidate so its raw level/route
 * payload is available for the independent merge audit.  This is read-only
 * with respect to production data. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { retileAndRecolor, gameplayFingerprint } from './finite-search-policy.mjs';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';

const ROOT = process.cwd();
const output = path.join(ROOT, 'deliverables/league-regeneration-20261006/early-repair/reconstructed-8.json');
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const clone = value => structuredClone(value);
const bundle = await build({
  stdin: { resolveDir: ROOT, loader: 'ts', contents: `
    export { LEVELS } from './src/core/levels.ts';
    export { FORMAL_BLOCK_SHAPES } from './src/game/formalBlockShapes.ts';
  ` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, FORMAL_BLOCK_SHAPES } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const base = clone(LEVELS[197]);
for (const block of base.blocks ?? []) {
  delete block.keyId; delete block.lockedBy; delete block.lockCount;
  delete block.frozen; delete block.layers; delete block.shutterId;
}
delete base.shutters;
base.mechanismRules = 'revised-2026-09-27-v1.5';
const variants = retileAndRecolor(base, FORMAL_BLOCK_SHAPES, 80);
if (!variants.length) throw new Error('no round4 index-8 retile candidate');
const level = variants[0];
const shift = 1 + ((8 * 17) % 7);
const palette = new Map(colors.map((color, index) => [color, colors[(index + shift) % colors.length]]));
for (const item of [...(level.blocks ?? []), ...(level.gates ?? []), ...(level.flipDoors ?? []), ...(level.coloredGrids ?? [])]) {
  if (item.color) item.color = palette.get(item.color) ?? item.color;
  if (item.layers) item.layers = item.layers.map(color => palette.get(color) ?? color);
}
level.id = 995008;
level.name = '荣耀联赛8·第四轮早段候选';
level.difficulty = 'super'; level.timeSeconds = 180; level.reward = 0;
level.mechanismRules = 'revised-2026-09-27-v1.5';
const spatial = await loadSpatialApi();
const runtime = await loadContinuationRuntime();
console.log(JSON.stringify({candidateLevelSha256: sha(level), gameplayFingerprint: gameplayFingerprint(level)}));
const route = searchSpatial(level, spatial, { floor: 31, normalize: true, orderSeed: 8000, maxStates: 450000, maxTransitions: 2200000, maxMilliseconds: 3500 });
if (route.status !== 'witness' || !route.drags) throw new Error(`route ${route.status}`);
const replay = runtime.replayRevisedRoute(level, route.drags);
if (!replay.valid || !replay.complete || replay.nonClearingDrags < 21 || replay.nonClearingDrags > 30) throw new Error(`route out of band ${replay.nonClearingDrags}`);
const proof = searchSpatial(level, spatial, { floor: 21, prove: true, normalize: false, orderSeed: 8000, maxStates: 1000000, maxTransitions: 5000000, maxMilliseconds: 9000 });
if (proof.thresholdProven !== true) throw new Error(`lower ${proof.status}`);
const outputRow = {
  index: 8, difficulty: 'super', target: { lower: 21, upper: 30 }, sourceLevelId: 198,
  status: 'FORMAL_CANDIDATE_READY', formalEligibility: true,
  levelSha256: sha(level), routeSha256: sha(route.drags), level, drags: route.drags,
  route: { status: route.status, cost: route.cost ?? null, sourceLevelSha256: route.sourceLevelSha256 ?? null },
  replay: { valid: replay.valid, complete: replay.complete, nonClearingDrags: replay.nonClearingDrags, effectiveDrags: replay.effectiveDrags },
  lowerBound: { status: proof.status, thresholdProven: true, sourceLevelSha256: proof.sourceLevelSha256 ?? null, termination: proof.termination ?? null, exploredStates: proof.exploredStates ?? null, attemptedTransitions: proof.attemptedTransitions ?? null },
  mutation: { kind: 'retile-plus-palette', variant: 0, paletteMap: Object.fromEntries(palette), sourceLevelId: 198 },
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(outputRow, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, output).replaceAll('\\', '/'), levelSha256: outputRow.levelSha256, lowerSourceLevelSha256: outputRow.lowerBound.sourceLevelSha256, routeSha256: outputRow.routeSha256, U: outputRow.replay.nonClearingDrags }, null, 2));
