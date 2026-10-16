import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, dirname } from 'node:path';
import { build } from 'esbuild';
import { auditGeneratorQueueColors } from '../../revised-generator-queue-colors.mjs';
import { auditHiddenCoverage } from '../../revised-hidden-coverage.mjs';
import { checkPlainFloor, assertPlainProofDomain } from './proof-plain.mjs';
import { projectStaticConstraints, CONSTRAINT_PROJECTION_METHOD } from './constraint-projection.mjs';
import { projectOpeningOuterBodies } from './inventory-projection.mjs';
import { projectFullPhysicalShutters, SHUTTER_MATERIALIZATION_METHOD } from './shutter-materialization-projection.mjs';
import { validateTimeSchedule, replayScheduledRoute } from './proof-scheduled-route.mjs';

export const CONTRACT_VERSION = 'daily-formal-v2.1';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sha = value => createHash('sha256').update(value).digest('hex');
export const canonicalJson = value => Array.isArray(value) ? value.map(canonicalJson)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined).map(key => [key, canonicalJson(value[key])])) : value;
// Entire JSON object, including seams, profile, clocks, rescue fields and IDs.
// This is a binding hash, deliberately not a geometry/deduplication key.
export const levelSha256 = level => sha(JSON.stringify(canonicalJson(level)));
export const routeSha256 = route => sha(JSON.stringify(canonicalJson(route)));
export const BANDS = Object.freeze({ 1: Object.freeze({ lower: 16, upper: 20 }),
  2: Object.freeze({ lower: 21, upper: 30 }), 3: Object.freeze({ lower: 31, upper: null }) });
export const DEFAULT_BUDGET = Object.freeze({ maxStates: 25_000, maxDragStates: 2_000,
  maxTransitions: 500_000, maxMilliseconds: 5_000 });
const MAX_BUDGET = Object.freeze({ maxStates: 500_000, maxDragStates: 20_000,
  maxTransitions: 10_000_000, maxMilliseconds: 60_000 });
export function finiteBudget(input = {}) {
  const result = { ...DEFAULT_BUDGET, ...input };
  for (const key of Object.keys(result)) {
    if (!(key in MAX_BUDGET) || !Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > MAX_BUDGET[key]) {
      throw new Error(`Invalid or unbounded solver budget ${key}: ${result[key]}`);
    }
  }
  return result;
}

let runtimePromise;
export const loadRuntime = () => runtimePromise ??= (async () => {
  const built = await build({ stdin: { resolveDir: ROOT, loader: 'ts', contents: [
    'export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";',
    'export { resolveMatchingGatePortal, exitFrontierFacesBoundary } from "./src/core/blockExitFrontier.ts";',
    'export { searchRevisedLevel, replayRevisedRoute } from "./src/core/revisedLevelSearch.ts";',
    'export { checkRevisedRepositionFloor } from "./src/core/revisedRepositionFloor.ts";',
    'export { auditRevisedCandidate } from "./src/core/revisedCandidateAudit.ts";',
    'export { matchFormalBlockShape } from "./src/game/formalBlockShapes.ts";',
    'export { GAME_ART } from "./src/game/artManifest.ts";',
    'export { choosePortalReleaseCandidate, matchingContinuousExitPortals } from "./src/game/continuousDrag.ts";',
    'export { shellPeelDuration } from "./src/game/exitMaterialAnimation.ts";',
  ].join('\n') }, bundle: true, metafile: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  // Source data is loaded separately and each exact selected source is bound
  // per candidate. It must not enter the solver digest or adopting a registry
  // containing those digests would create a recursive/self-invalidating hash.
  const sources = await build({ stdin:{resolveDir:ROOT,loader:'ts',contents:[
    'export { LEVELS } from "./src/core/levels.ts";',
    'export { MECHANISM_GUIDE } from "./src/core/mechanismCatalog.ts";',
  ].join('\n')},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent' });
  const sourceApi=await import(`data:text/javascript;base64,${Buffer.from(sources.outputFiles[0].text).toString('base64')}`);
  const animationSource=await readFile(resolve(ROOT,'src/game/ColorEscapeGame.ts'),'utf8');
  const ingest=animationSource.match(/const GATE_EXIT_INGEST_DURATION = (\d+(?:\.\d+)?);/);
  if(!ingest)throw new Error('Unqualified gate departure timing implementation');
  const animationTiming={normalGateSeconds:Number(ingest[1]),normalShellSeconds:api.shellPeelDuration(false)};
  animationTiming.minimumSettledExitSeconds=Math.max(animationTiming.normalGateSeconds,animationTiming.normalShellSeconds);
  const proofMeta = await build({ entryPoints: [resolve(ROOT, 'tools/daily-challenge/formal-v2/proof-plain.mjs')],
    absWorkingDir: ROOT, bundle:true, packages:'external', metafile:true, write:false, platform:'node', format:'esm', logLevel:'silent' });
  const emittedPaths = meta => Object.values(meta.outputs).flatMap(output=>Object.entries(output.inputs)
    .filter(([path,input])=>path!=='<stdin>'&&input.bytesInOutput>0).map(([path])=>path));
  const paths = [...new Set([...emittedPaths(built.metafile), ...emittedPaths(proofMeta.metafile),
    relative(ROOT, fileURLToPath(import.meta.url)), 'tools/revised-generator-queue-colors.mjs',
    'tools/revised-hidden-coverage.mjs', 'tools/daily-challenge/formal-v2/constraint-projection.mjs',
    'tools/daily-challenge/formal-v2/inventory-projection.mjs',
    'tools/daily-challenge/formal-v2/shutter-materialization-projection.mjs',
    'tools/daily-challenge/formal-v2/proof-scheduled-route.mjs','src/game/ColorEscapeGame.ts',
    'src/core/mechanismCatalog.ts'])].sort();
  const bindings = Object.fromEntries(await Promise.all(paths.map(async path => [path.replaceAll('\\', '/'), sha(await readFile(resolve(ROOT, path)))])));
  return { ...api, ...sourceApi, animationTiming, mechanismsUsedByDailyLevel: mechanismsUsedByDailyCandidate, checkPlainFloor, assertPlainProofDomain,
    toolchainBindings: bindings, toolchainSha256: levelSha256(bindings) };
})();

// Standalone inspection avoids importing the production daily registry into
// its own proof fingerprint. Selection/UI data do not define puzzle physics.
export function mechanismsUsedByDailyCandidate(level) {
  const used=new Set(), blocks=level.blocks;
  if(level.gates.length)used.add('color-exit');
  if(level.gates.some(g=>(g.frozen??0)>0))used.add('frozen-exit');
  if(level.gates.some(g=>g.star)||blocks.some(b=>b.star))used.add('star');
  if(blocks.some(b=>(b.frozen??0)>0))used.add('numeric-ice');
  if(blocks.some(b=>(b.layers?.length??1)>1))used.add('multilayer-shell');
  if(blocks.some(b=>b.movementAxis))used.add('axis-block');
  if(blocks.some(b=>b.keyId||b.lockedBy))used.add('key-lock');
  if(blocks.some(b=>typeof b.timedBombSeconds==='number'))used.add('bomb');
  const rectangular=shape=>{
    const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
    return new Set(shape.map(p=>p.join(','))).size===(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);
  };
  if(blocks.some(b=>!rectangular(b.shape)))used.add('irregular-block');
  if((level.playable?.length>0&&level.playable.length<level.width*level.height)||level.blocked?.length)used.add('irregular-board');
  if(level.flipDoors?.length)used.add('flip-door');
  if(level.coloredGrids?.length)used.add('colored-grid');
  if(level.elevators?.length||level.shutters?.some(s=>s.skin==='lift'))used.add('layered-lift');
  if(level.shutters?.some(s=>!['lift','staging','staged-frame'].includes(s.skin)))used.add('shutter');
  if(level.generators?.length)used.add('generator');
  return [...used];
}

const pointKey = ([x, y]) => `${x},${y}`;
const sortPoints = points => [...points].sort(([x,y],[xx,yy]) => x - xx || y - yy);
const boardCells = level => {
  const excluded = new Set((level.blocked ?? []).map(pointKey));
  return (level.playable ?? Array.from({ length: level.width * level.height }, (_, i) => [i % level.width, Math.floor(i / level.width)]))
    .filter(point => !excluded.has(pointKey(point)));
};
// Mask symmetry is used only to preserve the mainline board baseline.
const boardOrbitKey = level => {
  const cells = boardCells(level), W = level.width, H = level.height;
  return [ [W,H,cells], [W,H,cells.map(([x,y]) => [W-1-x,y])],
    [W,H,cells.map(([x,y]) => [x,H-1-y])], [W,H,cells.map(([x,y]) => [W-1-x,H-1-y])],
    [H,W,cells.map(([x,y]) => [y,x])], [H,W,cells.map(([x,y]) => [H-1-y,x])],
    [H,W,cells.map(([x,y]) => [y,W-1-x])], [H,W,cells.map(([x,y]) => [H-1-y,W-1-x])],
  ].map(([w,h,points]) => JSON.stringify([w,h,sortPoints(points)])).sort()[0];
};

export function solverSupport(level, { timeSchedule } = {}) {
  const reasons = [];
  const fields=['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget','mechanismRules',
    'width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','designTargets',
    'onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation','seams','shutters','generators','elevators','conveyors'];
  for (const field of Object.keys(level)) if (!fields.includes(field)) reasons.push(`unknown-or-special-level-field:${field}`);
  const records=[['blocks',['id','x','y','shape','color','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','timedBombSeconds','shutterId']],
    ['gates',['id','side','offset','size','color','portals','frozen','star']],
    ['flipDoors',['id','side','offset','size','color','portals','frozen','star','initiallyOpen']],
    ['shutters',['id','x','y','width','height','count','skin','triggerBlockIds']],
    ['generators',['id','side','offset','rimSpan','rimMount','rimAnchor','spawn','queueBlockIds','trigger','intervalSeconds','initialDelaySeconds']],
    ['coloredGrids',['id','color','cells']]];
  for (const [kind,allowed] of records) for (const record of level[kind]??[]) for(const field of Object.keys(record)) {
    if (!allowed.includes(field)) reasons.push(`unknown-or-special-${kind}-field:${field}`);
  }
  if (!['revised-2026-09-21-v1.1','revised-2026-09-21-v1.2','revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules)) reasons.push('unqualified-rules-profile');
  if (level.dailyProof || level.seams?.length) reasons.push('seam-or-synthetic-component-certificate-not-daily-v2');
  if (level.blocks.some(block => block.timedBombSeconds !== undefined && block.timedBombSeconds <= level.timeSeconds)) {
    try { validateTimeSchedule(timeSchedule); } catch { reasons.push('active-bomb-needs-explicit-qualified-time-schedule'); }
  }
  if (level.generators?.some(machine => machine.trigger === 'time' || machine.intervalSeconds !== undefined || machine.initialDelaySeconds !== undefined)) reasons.push('timed-generator-not-qualified');
  if (level.elevators?.length || level.conveyors?.length) reasons.push('autonomous-motion-not-qualified');
  if (level.blocks.some(block => block.rotationBadge)) reasons.push('rotation-badge-not-qualified');
  if (level.shutters?.some(cover => ![undefined,'shutter','lift'].includes(cover.skin))) reasons.push('legacy-staging-not-qualified');
  return { supported: reasons.length === 0, reasons };
}

function openingCoverage(runtime, level) {
  const snapshot = new runtime.PuzzleModel(structuredClone(level)).snapshot();
  const legal = new Set(boardCells(level).map(pointKey)), occupied = new Map();
  const add = (point, owner) => { const key = pointKey(point); occupied.set(key, [...(occupied.get(key) ?? []), owner]); };
  for (const block of snapshot.blocks) {
    if (block.shutterId && !snapshot.shutters.find(cover => cover.id === block.shutterId)?.revealed) continue;
    for (const [dx,dy] of block.shape) add([block.x+dx,block.y+dy], block.id);
  }
  for (const cover of snapshot.shutters) {
    if (cover.revealed || cover.skin === 'lift' || cover.count <= 0) continue;
    for (let y=cover.y;y<cover.y+cover.height;y++) for (let x=cover.x;x<cover.x+cover.width;x++) add([x,y], `cover:${cover.id}`);
  }
  const missing = [...legal].filter(key => !occupied.has(key));
  const overlap = [...occupied].filter(([,owners]) => owners.length > 1);
  const outside = [...occupied.keys()].filter(key => !legal.has(key));
  return { passed: !missing.length && !overlap.length && !outside.length, missing, overlap, outside, playableCells: legal.size };
}

export async function auditStaticCandidate(runtime, candidate) {
  const { level, formalId, stageKey, difficulty, sourceLevelId } = candidate;
  const issues = [], warnings = [];
  const source = runtime.LEVELS.find(entry => entry.id === sourceLevelId);
  const stage = runtime.MECHANISM_GUIDE.find(entry => `mechanisms-${entry.id}-${entry.unlockLevel}` === stageKey);
  const inputHash = levelSha256(level), sourceHash = source ? levelSha256(source) : null;
  if (!BANDS[difficulty]) issues.push('unknown-difficulty');
  if (typeof formalId !== 'string' || !formalId.startsWith(`daily-${stageKey}-d${difficulty}-`)) issues.push('formal-id-stage-difficulty-mismatch');
  if (!source) issues.push('source-not-in-mainline-LEVELS');
  if (!stage) issues.push('stage-not-in-mechanism-guide');
  if (candidate.levelSha256 !== undefined && candidate.levelSha256 !== inputHash) issues.push('declared-level-sha-mismatch');
  if (candidate.sourceLevelSha256 !== undefined && candidate.sourceLevelSha256 !== sourceHash) issues.push('declared-source-sha-mismatch');
  if (!level || typeof level !== 'object') return { passed: false, issues: [...issues, 'missing-level'], levelSha256: inputHash, sourceLevelSha256: sourceHash };
  if (level.dailyProof || level.seams?.length) issues.push('synthetic-proof-board-or-seams-rejected');
  if (level.id !== sourceLevelId) issues.push('runtime-level-id-must-equal-source-id');
  if (level.reward !== 0) issues.push('daily-runtime-reward-must-be-zero');
  if (level.rocketRescue || level.pulseRescue) issues.push('campaign-booster-rescue-not-a-no-booster-daily');
  if (source && boardOrbitKey(level) !== boardOrbitKey(source)) issues.push('mainline-board-baseline-mismatch');
  if (source && level.timeSeconds !== source.timeSeconds) issues.push('mainline-time-limit-mismatch');
  let valid = false, used = [], composition, opening;
  try { runtime.validateLevel(level); valid = true; } catch (error) { issues.push(`validateLevel:${error.message}`); }
  if (valid) {
    used = runtime.mechanismsUsedByDailyLevel(level);
    if (stage && !used.includes(stage.id)) issues.push(`missing-current-stage-mechanism:${stage.id}`);
    const unlock = new Map(runtime.MECHANISM_GUIDE.map(entry => [entry.id, entry.unlockLevel]));
    for (const mechanism of used) if (stage && unlock.get(mechanism) > stage.unlockLevel) issues.push(`mechanism-before-unlock:${mechanism}`);
    // Only the generic construction checks are reused. The old checker asks
    // for competitor-source identity and v1.2; neither is this daily contract.
    // Source identity and profile are independently checked above/below.
    composition = runtime.auditRevisedCandidate(level, undefined);
    for (const issue of composition.issues) {
      if (issue.category === 'source' || issue.code === 'wrong-rule-profile') continue;
      issues.push(`construction:${issue.code}`);
    }
    opening = openingCoverage(runtime, level);
    if (!opening.passed) issues.push('opening-not-filled-or-overlapping');
  }
  const hidden = auditHiddenCoverage(level), queue = auditGeneratorQueueColors(level);
  if (!hidden.passed) issues.push(...hidden.issues.map(issue => `hidden:${issue.code}`));
  if (!queue.passed) issues.push(...queue.issues.map(issue => `queue:${issue.code}`));
  const artRequirements = [], assetBindings = {};
  for (const block of level.blocks ?? []) {
    const match = runtime.matchFormalBlockShape(block.shape, 'native-only');
    if (!match || match.quarterTurns !== 0) { issues.push(`non-native-art-shape:${block.id}`); continue; }
    const layers = block.layers?.length ? block.layers : [block.color];
    for (let index=0;index<layers.length;index++) for (const kind of index < layers.length-1 ? ['solid','shell'] : ['solid']) {
      const color = layers[index], path = runtime.GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[match.shapeId];
      if (!path) { issues.push(`missing-art:${block.id}:${color}:${kind}`); continue; }
      artRequirements.push({ blockId: block.id, color, kind, shapeId: match.shapeId, path });
      if (!assetBindings[path]) {
        try { assetBindings[path] = sha(await readFile(resolve(ROOT, 'public', path))); }
        catch { issues.push(`missing-art-file:${path}`); }
      }
    }
  }
  return { passed: issues.length === 0, issues: [...new Set(issues)], warnings, levelSha256: inputHash,
    sourceLevelSha256: sourceHash, mechanisms: used, opening, hidden, queue,
    constructionMeasurements: composition?.measurements, artRequirements, assetBindings, support: solverSupport(level,{timeSchedule:candidate.timeSchedule}) };
}

/** Separate fresh model, counts clears/peels from state deltas, not exitSide. */
export function independentReplay(runtime, level, drags, { timeSchedule } = {}) {
  const out = { valid: false, complete: false, failed: false, effectiveDrags: 0, nonClearingDrags: 0, clearEvents: 0, trace: [], error: null };
  try {
    if (!Array.isArray(drags) || !drags.length) throw new Error('A nonempty complete route is required');
    const supported=solverSupport(level,{timeSchedule});
    if(!supported.supported)throw new Error(supported.reasons.join(';'));
    const model = new runtime.PuzzleModel(structuredClone(level), { deferExitCompletion: true });
    model.startCountdown();
    const schedule=timeSchedule?validateTimeSchedule(timeSchedule,runtime):null;
    let elapsed=0;
    const tick=seconds=>{model.tick(seconds);elapsed+=seconds;if(model.snapshot().failed)throw new Error('Original deadline expired in independent replay');};
    for (const [index, drag] of drags.entries()) {
      if (!drag || Object.keys(drag).some(key => !['blockId','path','exitSide'].includes(key)) || !Array.isArray(drag.path)) throw new Error(`Invalid drag ${index}`);
      if(schedule)tick(schedule.secondsPerDrag);
      const before = model.snapshot(); model.beginAction();
      for (const point of drag.path) {
        if(schedule)tick(schedule.secondsPerUnitStep);
        if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isSafeInteger) || !model.moveBlockStep(drag.blockId, ...point)) throw new Error(`Rejected step at drag ${index}`);
      }
      let departure;
      if (drag.exitSide) {
        departure=model.tryExit(drag.blockId, drag.exitSide);
        if (!departure.ok) throw new Error(`Rejected exit at drag ${index}`);
      }
      if (!model.commitAction()) throw new Error(`No effective action at drag ${index}`);
      const beforeCompletion=model.snapshot();
      if(schedule&&departure)tick(schedule.secondsPerExitAnimation);
      if (departure?.exitAnimationId && !model.completeExitAnimation(departure.exitAnimationId)) throw new Error(`Rejected exit completion at drag ${index}`);
      const after = model.snapshot(), clearDelta = after.cleared - before.cleared;
      if (after.pendingExitAnimations?.length) throw new Error(`Unsettled departure at drag ${index}`);
      if (after.failed || after.moves !== before.moves + 1 || clearDelta < 0) throw new Error(`Invalid state at drag ${index}`);
      out.effectiveDrags++; out.clearEvents += clearDelta; if (!clearDelta) out.nonClearingDrags++;
      out.trace.push({ index, blockId: drag.blockId, clearDelta, moves: after.moves, complete: after.complete,
        exitCompletionAcknowledged: Boolean(departure?.exitAnimationId),...(schedule?{elapsedSeconds:elapsed,remainingSeconds:after.remainingSeconds}:{}),
        flipDoorsBeforeCompletion:beforeCompletion.flipDoors.map(door=>({id:door.id,open:door.open,frozen:door.frozen})),
        flipDoorsAfterCompletion:after.flipDoors.map(door=>({id:door.id,open:door.open,frozen:door.frozen})), stateSha256: levelSha256(after) });
    }
    const snapshot = model.snapshot();
    Object.assign(out, { valid: true, complete: snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0,
      failed: snapshot.failed, finalStateSha256: levelSha256(snapshot), remainingBodies: snapshot.blocks.length, remainingQueued: snapshot.queuedBlocks.length,
      animationPolicy:'complete-each-departure-before-next-gesture', timeValidated:false,
      ...(schedule?{simulationTimeValidated:snapshot.complete&&!snapshot.failed,naturalTimeValidated:false,elapsedSeconds:elapsed,timeSchedule:schedule}:{}) });
  } catch (error) { out.error = error.message; }
  return out;
}

/** Lower-only entry point. It NEVER certifies an original route or elapsed time.
 * Static constraints may be erased only by the fully checked projection, and
 * its entire object as well as the original is hashed into fresh evidence.
 */
export function proveCandidateLower(runtime, level, difficulty, budget = {}) {
  const band=BANDS[difficulty];if(!band)throw new Error('Unknown daily difficulty');
  const budgets=finiteBudget(budget), before=levelSha256(level);
  runtime.validateLevel(level);
  let plain=false, projection=null;
  try { runtime.assertPlainProofDomain(level);plain=true; } catch { /* Check constraint-only projection next. */ }
  if(!plain) {
    for (const project of [() => projectStaticConstraints(level),
      () => projectFullPhysicalShutters(level,runtime), () => projectOpeningOuterBodies(level,runtime)]) {
      try {
        const attempt=project();
        runtime.validateLevel(attempt.projectedLevel);
        runtime.assertPlainProofDomain(attempt.projectedLevel);
        if(attempt.sourceLevelSha256!==before||attempt.projectedLevelSha256!==levelSha256(attempt.projectedLevel))throw new Error('Projection SHA mismatch');
        projection=attempt;break;
      } catch { /* Unsupported projections remain on the generic checker. */ }
    }
  }
  const input=projection?.projectedLevel??level;
  const support=solverSupport(level);
  const lowerReasons=[...support.reasons,...(level.flipDoors?.length?['flip-lower-needs-qualified-projection']:[])];
  const result=plain||projection?runtime.checkPlainFloor(input,runtime,{floor:band.lower,...budgets})
    :lowerReasons.length?{status:'unsupported',thresholdProven:false,floor:band.lower,termination:'unsupported',reasons:lowerReasons}
      :runtime.checkRevisedRepositionFloor(input,{floor:band.lower,...budgets});
  if(levelSha256(level)!==before)throw new Error('Lower solver mutated original level');
  if(projection&&levelSha256(input)!==projection.projectedLevelSha256)throw new Error('Lower solver mutated projected level');
  const projectionMethods={
    'opening-outer-bodies-inventory-erasure-v1':'fresh-opening-inventory-erasure-plain-floor-v2',
    [SHUTTER_MATERIALIZATION_METHOD]:'fresh-full-physical-shutter-materialization-plain-floor-v2',
    [CONSTRAINT_PROJECTION_METHOD]:'fresh-static-constraint-erasure-plain-floor-v2',
  };
  if(projection&&!projectionMethods[projection.method])throw new Error(`Unqualified projection method ${projection.method}`);
  return {method:projection?projectionMethods[projection.method]:plain?'fresh-plain-monotone-floor-v2':'fresh-revised-reposition-floor',
    inputLevelSha256:before,projectedLevelSha256:projection?.projectedLevelSha256??null,projection,
    toolchainSha256:runtime.toolchainSha256,requiredFloor:band.lower,budgets,result};
}

export async function verifyCandidate(runtime, candidate, options = {}) {
  const level = structuredClone(candidate.level), band = BANDS[candidate.difficulty];
  const result = { schemaVersion: 2, contractVersion: CONTRACT_VERSION, formalId: candidate.formalId, stageKey: candidate.stageKey,
    difficulty: candidate.difficulty, sourceLevelId: candidate.sourceLevelId, status: 'BLOCKED_STATIC', accepted: false, formalReady: false,
    levelSha256: levelSha256(level), sourceLevelSha256: null, routeSha256: null, level, drags: [], band, L: null, U: null,
    staticAudit: null, route: null, lowerBound: null, reasons: [], toolchainBindings: runtime.toolchainBindings,
    toolchainSha256: runtime.toolchainSha256, pointerValidated: false, timeValidated: false,
    ...(candidate.timeSchedule?{timeSchedule:structuredClone(candidate.timeSchedule),timeScheduleSha256:levelSha256(candidate.timeSchedule)}:{}) };
  const routeBudget = finiteBudget(options.routeBudget), lowerBudget = finiteBudget(options.lowerBudget);
  const before = levelSha256(level);
  const audit = await auditStaticCandidate(runtime, { ...candidate, level });
  result.staticAudit = audit; result.sourceLevelSha256 = audit.sourceLevelSha256;
  if (!audit.passed) { result.reasons.push(...audit.issues); return result; }
  if (!audit.support.supported) { result.status = 'UNSUPPORTED_SOLVER_DOMAIN'; result.reasons.push(...audit.support.reasons); return result; }
  let drags = candidate.drags;
  let search = null;
  if (!drags) {
    search = runtime.searchRevisedLevel(level, routeBudget);
    if (!search.witnessFound) { result.status = search.status === 'unsupported' ? 'UNSUPPORTED_ROUTE' : 'PENDING_ROUTE'; result.route = { search }; result.reasons.push(`route:${search.termination}`); return result; }
    drags = search.drags;
  }
  result.drags = structuredClone(drags); result.routeSha256 = routeSha256(drags);
  if (candidate.routeSha256 !== undefined && candidate.routeSha256 !== result.routeSha256) { result.status = 'REJECTED_ROUTE_SHA'; result.reasons.push('declared-route-sha-mismatch'); return result; }
  if (candidate.timeScheduleSha256 !== undefined && candidate.timeScheduleSha256 !== result.timeScheduleSha256) { result.status = 'REJECTED_SCHEDULE_SHA'; result.reasons.push('declared-time-schedule-sha-mismatch'); return result; }
  const canonicalReplay = candidate.timeSchedule?replayScheduledRoute(runtime,level,drags,candidate.timeSchedule):runtime.replayRevisedRoute(level, drags);
  const direct = independentReplay(runtime, level, drags,{timeSchedule:candidate.timeSchedule});
  result.route = { search, canonicalReplay, independentReplay: direct, inputLevelSha256: before, routeSha256: result.routeSha256,
    ...(candidate.timeSchedule?{timeSchedule:structuredClone(candidate.timeSchedule),timeScheduleSha256:levelSha256(candidate.timeSchedule)}:{}) };
  if (!canonicalReplay.valid || !canonicalReplay.complete || !direct.valid || !direct.complete || direct.failed
      || canonicalReplay.effectiveDrags !== direct.effectiveDrags || canonicalReplay.nonClearingDrags !== direct.nonClearingDrags || canonicalReplay.clearEvents !== direct.clearEvents) {
    result.status = 'REJECTED_ROUTE'; result.reasons.push(canonicalReplay.error ?? direct.error ?? 'fresh-replay-incomplete-or-counter-disagreement'); return result;
  }
  result.U = direct.nonClearingDrags;
  if (result.U < band.lower) { result.status = 'COUNTEREXAMPLE_BELOW_BAND'; result.reasons.push(`complete-route-U${result.U}-below-L${band.lower}`); return result; }
  if (band.upper !== null && result.U > band.upper) { result.status = 'PENDING_ROUTE_WITHIN_UPPER_BAND'; result.reasons.push(`witness-U${result.U}-exceeds-upper${band.upper}`); return result; }
  // No caller-supplied lowerBound/proof status is read. Certification happens
  // now on this exact immutable object and is bound to all implementation bytes.
  result.lowerBound=proveCandidateLower(runtime,level,candidate.difficulty,lowerBudget);
  const lower=result.lowerBound.result,plain=result.lowerBound.method!=='fresh-revised-reposition-floor';
  if (levelSha256(level) !== before) { result.status = 'REJECTED_INPUT_MUTATION'; result.reasons.push('solver-mutated-level'); return result; }
  if (lower.status !== 'threshold-proven' || lower.thresholdProven !== true || lower.floor !== band.lower || lower.termination !== 'below-threshold-exhausted'
    || lower.abstraction !== (plain ? 'plain-optional-gesture-monotone-clear-identical-body-quotient-v2' : 'optional-exit-unit-step-gesture-superset-v1')
    || (plain && lower.sourceLevelSha256 !== (result.lowerBound.projectedLevelSha256??before))) {
    result.status = lower.status === 'unsupported' ? 'UNSUPPORTED_LOWER_BOUND' : 'PENDING_LOWER_BOUND';
    result.reasons.push(`lower:${lower.status}:${lower.termination}`, ...(lower.reasons ?? [])); return result;
  }
  result.L = band.lower; result.accepted = true;
  result.status = 'SPATIAL_DIFFICULTY_VERIFIED_AWAITING_POINTER_TIME';
  result.reasons.push('Fresh same-object lower floor and full route verified; browser Pointer/time gates remain outstanding.');
  return result;
}
