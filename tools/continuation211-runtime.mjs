import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
export const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const modelBinding = () => sha256(Object.fromEntries([
  'src/core/PuzzleModel.ts', 'src/core/revisedLevelSearch.ts', 'src/core/revisedRepositionFloor.ts',
  'src/core/blockExitFrontier.ts', 'tools/continuation211-policy.mjs',
].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')])));

let runtime;
export function loadContinuationRuntime() {
  return runtime ??= build({ stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
    export * from './src/core/rejected211to220Rim.ts';
    export { PuzzleModel } from './src/core/PuzzleModel.ts';
    export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
    export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts';
    export { auditRevisedMechanismContract } from './src/core/revisedMechanismContract.ts';
    export { auditRevisedCandidate } from './src/core/revisedCandidateAudit.ts';
    export { evaluateLevelStars, timeTargetForLevel } from './src/core/levelStarConditions.ts';
    export { matchFormalBlockShape } from './src/game/formalBlockShapes.ts';
  ` }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' })
    .then(result => import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')));
}

/** Historical counterexample only. This route disproves all three rim families. */
export function rejectedRimRoute(level) {
  const edge = (suffix, exitSide) => ({ blockId: `l${level.id}-${suffix}`, path: [], exitSide });
  const drags = [edge('edge-2', 'right'), edge('edge-3', 'right'), edge('edge-6', 'left'),
    edge('edge-7', 'left'), edge('hidden-red', 'top'), edge('hidden-purple', 'bottom'),
    edge('hidden-orange', 'bottom'), edge('hidden-pink', 'left')];
  for (let row = 1; row <= 5; row++) {
    for (const block of level.blocks.filter(b => b.id.startsWith(`l${level.id}-inner-`) && b.y === row).sort((a,b) => a.x-b.x)) {
      drags.push({blockId:block.id,path:Array.from({length:block.x},(_,i)=>[block.x-i-1,block.y]),exitSide:'left'});
    }
    if (row === 1) drags.push(edge('edge-0','top'),edge('edge-1','top'));
  }
  drags.push(edge('edge-4','bottom'),edge('edge-5','bottom'));
  return drags;
}
