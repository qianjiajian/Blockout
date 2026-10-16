/**
 * Isolated v1.124 acceptance gate for the Lv202/Lv206 hidden-batch repair.
 * It replays the current LevelSpec objects and requires matching route/floor
 * fingerprints. Pointer, natural-clock and live settlement are separate gates.
 */
import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { auditHiddenCoverage } from './revised-hidden-coverage.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaults = {
  routes: 'tests/fixtures/remake201-210-hidden-repair-20260930.json',
  formal: 'deliverables/continue201-210-20260930/formal-isolated-hidden-repair.json',
  floors: 'deliverables/continue201-210-20260930/fresh-floor-hidden-repair.json',
  prior: 'deliverables/continue201-210-20260930/formal-isolated-adjacency-repair.json',
};
const targets = [202, 206];
const expectedCanonical = {
  202: '8f46cd15027db1045e46ad03d28a7f4d8c40496fcc0c039278e7ea142c4718e0',
  206: '020e1b1ad71442bf1d2a5f824d2df5e45a5f88dd8ade06797f93a9f96ce87b9a',
};
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const proofSha = value => sha(canonical(value));
const readJson = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const sameColourPairs = level => {
  const occupied = new Map(), pairs = new Map();
  for (const block of level.blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    const owners = occupied.get(key) ?? [];
    owners.push(block); occupied.set(key, owners);
  }
  for (const [key, owners] of occupied) {
    const [x, y] = key.split(',').map(Number);
    for (const next of [`${x + 1},${y}`, `${x},${y + 1}`]) {
      for (const a of owners) for (const b of occupied.get(next) ?? []) {
        if (a.id === b.id || (a.layers?.[0] ?? a.color) !== (b.layers?.[0] ?? b.color)) continue;
        const ids = [a.id, b.id].sort(); pairs.set(ids.join('|'), ids);
      }
    }
  }
  return [...pairs.values()];
};
function parseArgs(args) {
  const paths = {...defaults};
  for (let i = 0; i < args.length; i++) {
    const field = {'--routes':'routes','--formal':'formal','--floors':'floors','--prior':'prior'}[args[i]];
    if (!field || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error(`Unexpected argument ${args[i]}`);
    }
    paths[field] = args[++i];
  }
  return paths;
}
const paths = parseArgs(process.argv.slice(2));
const [routeFixture, formal, floorSummary, prior] = await Promise.all([
  readJson(paths.routes), readJson(paths.formal), readJson(paths.floors), readJson(paths.prior),
]);
const source = `
  export {FORMAL_ISOLATED_201_210_LEVELS} from './src/core/formal201to210Data.ts';
  export {LEVELS,getLevelStrict} from './src/core/levels.ts';
  export {PuzzleModel} from './src/core/PuzzleModel.ts';
  export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
  export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
  export {GAME_ART} from './src/game/artManifest.ts';
  export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';
`;
const bundle = await build({stdin:{contents:source,resolveDir:root,sourcefile:'hidden-repair-verifier.ts'},
  platform:'node',format:'esm',bundle:true,write:false,logLevel:'silent'});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fail = (failures, condition, message) => { if (!condition) failures.push(message); };
const production = {count:api.LEVELS.length,firstId:api.LEVELS[0]?.id,lastId:api.LEVELS.at(-1)?.id,
  rejects201:false};
try { api.getLevelStrict(201); } catch { production.rejects201 = true; }
production.passed = production.count === 200 && production.firstId === 1
  && production.lastId === 200 && production.rejects201;
const otherEight = api.FORMAL_ISOLATED_201_210_LEVELS.filter(level => !targets.includes(level.id)).map(level => {
  const record = prior.levels?.find(record => record.id === level.id);
  return {id:level.id,unchanged:sha(level) === record?.levelSha256,
    actualSha256:sha(level),priorSha256:record?.levelSha256 ?? null};
});
const rows = [];
for (const id of targets) {
  const failures = [];
  const level = api.FORMAL_ISOLATED_201_210_LEVELS.find(level => level.id === id);
  const fixture = routeFixture.levels?.[String(id)];
  const record = formal.levels?.find(record => record.id === id);
  const floor = floorSummary.records?.[String(id)];
  fail(failures, Boolean(level && fixture && record && floor), 'missing-level-route-formal-or-floor');
  if (!level || !fixture || !record || !floor) {
    rows.push({id,passed:false,failures}); continue;
  }
  const rawHash = sha(level), canonicalHash = proofSha(level), result = floor.result;
  fail(failures, canonicalHash === expectedCanonical[id], 'unexpected-current-level-fingerprint');
  fail(failures, record.levelSha256 === rawHash, 'formal-record-raw-fingerprint-mismatch');
  if (record.currentCanonicalLevelSha256 !== undefined) {
    fail(failures, record.currentCanonicalLevelSha256 === canonicalHash,
      'formal-record-canonical-fingerprint-mismatch');
  }
  fail(failures, result?.sourceLevelSha256 === canonicalHash, 'floor-fingerprint-mismatch');
  fail(failures, result?.status === 'threshold-proven' && result.thresholdProven === true
    && result.floor >= 12, 'floor-12-not-proven');
  fail(failures, floor.levelId === id, 'floor-level-id-mismatch');
  fail(failures, record.currentObjectLowerBoundCertified === true
    && record.certifiedLowerBound >= 12, 'formal-record-lower-bound-not-certified');
  fail(failures, level.difficulty === 'normal'
    && level.designTargets?.minimumRepositionOverhead === 12, 'normal-difficulty-contract-drift');
  fail(failures, record.lowerBound === 12 && fixture.lowerBound === 12,
    'lower-bound-target-drift');
  fail(failures, Array.isArray(record.structuralPending) && record.structuralPending.length === 0,
    'formal-record-structural-pending');
  fail(failures, record.status?.startsWith('FORMAL_DATA_PRESENT_'), 'formal-record-status-invalid');
  fail(failures, record.releaseApproved !== true && formal.productionBoundary?.releaseApproved === false,
    'release-approval-drift');
  const hidden = auditHiddenCoverage(level);
  const opening = auditOpeningCoverage(new api.PuzzleModel(level).snapshot());
  const adjacency = sameColourPairs(level);
  fail(failures, hidden.passed && hidden.regionCount === 2 && hidden.totalCells === 12
    && hidden.coveredCells === 12 && hidden.missingCells === 0
    && hidden.regions.every(region => region.regionCells === 6 && region.coveredCells === 6),
  'hidden-region-not-fully-covered');
  fail(failures, opening.passed && opening.playableCells === 54 && opening.coveredCells === 54,
    'opening-not-fully-covered');
  fail(failures, adjacency.length === 0, 'same-colour-adjacency');
  const art = [];
  for (const block of level.blocks) {
    const match = api.matchFormalBlockShape(block.shape, 'native-only');
    const color = block.layers?.[0] ?? block.color;
    const path = api.GAME_ART.gameplay.formalBlocks[color]?.solid?.[match?.shapeId];
    let exists = false;
    if (path) { try { await access(resolve(root, 'public', path)); exists = true; } catch {} }
    art.push({blockId:block.id,shapeId:match?.shapeId ?? null,quarterTurns:match?.quarterTurns ?? null,
      path:path ?? null,exists});
  }
  fail(failures, art.every(item => item.shapeId !== null && item.quarterTurns === 0 && item.exists),
    'missing-or-rotated-block-art');
  const repaired = art.filter(item => item.blockId.endsWith('-q21-hidden-0-14')
    || item.blockId.endsWith('-q21-hidden-1-15'));
  fail(failures, repaired.length === 2 && repaired.every(item => item.shapeId === 21),
    'repaired-blocks-not-native-3x2');
  const replay = api.replayRevisedRoute(level, fixture.route);
  fail(failures, replay.valid && replay.complete && replay.effectiveDrags === fixture.totalDrags
    && replay.effectiveDrags <= 31 && replay.nonClearingDrags === fixture.upperBound
    && replay.nonClearingDrags <= 15 && replay.nonClearingDrags >= 12,
  'route-invalid-or-outside-normal-band');
  fail(failures, record.upperBound === fixture.upperBound, 'formal-record-upper-bound-mismatch');
  const stars = api.levelStarTargets(level);
  const atTargetTime = api.evaluateLevelStars(level,
    {moves:replay.effectiveDrags,elapsedSeconds:stars.timeTargetSeconds});
  fail(failures, stars.moveTarget === 31 && stars.timeTargetSeconds === 86
    && JSON.stringify(stars) === JSON.stringify(fixture.starTargets)
    && JSON.stringify(stars) === JSON.stringify(record.starTargets)
    && atTargetTime.earnedStars === 3, 'three-star-target-not-achievable-in-model');
  rows.push({id,passed:failures.length===0,failures,rawLevelSha256:rawHash,
    canonicalLevelSha256:canonicalHash,hidden:{passed:hidden.passed,coveredCells:hidden.coveredCells,
      totalCells:hidden.totalCells,missingCells:hidden.missingCells},
    opening:{passed:opening.passed,coveredCells:opening.coveredCells,playableCells:opening.playableCells},
    adjacency:{passed:adjacency.length===0,pairs:adjacency},
    art:{passed:art.every(item=>item.shapeId!==null&&item.quarterTurns===0&&item.exists),repaired},
    route:{valid:replay.valid,complete:replay.complete,effectiveDrags:replay.effectiveDrags,
      nonClearingDrags:replay.nonClearingDrags,error:replay.error ?? null},
    floor:{status:result?.status,thresholdProven:result?.thresholdProven,floor:result?.floor},
    starFormula:{moveTarget:stars.moveTarget,timeTargetSeconds:stars.timeTargetSeconds,
      earnedStarsAtTargetTime:atTargetTime.earnedStars}});
}
const report = {status:production.passed && otherEight.every(item => item.unchanged)
    && rows.every(row => row.passed) ? 'PASS_ISOLATED_MODEL_GATES' : 'FAIL',
  passed:production.passed && otherEight.every(item => item.unchanged)
    && rows.every(row => row.passed),production,otherEight,levels:rows,
  pointerValidated:false,naturalClockValidated:false,starsValidated:false,releaseApproved:false};
console.log(JSON.stringify(report,null,2));
if (!report.passed) process.exitCode = 1;
