import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Static inspection only: no runtime, model, replay, solver, ledger or frozen
// tool imports. Findings are conditional on the original route being legal.
// A closed held gesture in this narrow domain changes no puzzle variable;
// move/history counters and elapsed time cannot enable any later move here.
export const VERSION = 'provided-route-static-closed-gesture-audit-v198-1';
const ownPath = fileURLToPath(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
export const routeAuditValueHash = value => hash(JSON.stringify(canonical(value)));
const point = value => Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger);
const samePoint = (a,b) => a[0] === b[0] && a[1] === b[1];
const sides = new Set(['top','right','bottom','left']);
const levelFields = new Set(['id','name','difficulty','reward','width','height','playable','blocked','timeSeconds','mechanismRules','blocks','gates',
  'par','parMoves','starMoves','starSeconds','threeStarMoves','threeStarSeconds','starThresholds']);
const emptyMechanisms = new Set(['seams','flipDoors','coloredGrids','shutters','generators','elevators','conveyors']);
const blockFields = new Set(['id','x','y','shape','color','layers']);
const gateFields = new Set(['id','side','offset','size','color']);

function supportedDomain(candidate) {
  const reasons = [], level = candidate.level;
  if (Object.hasOwn(candidate,'timeSchedule')) reasons.push('Scheduled time is outside the static held-world domain');
  if (level.mechanismRules !== 'revised-2026-09-27-v1.5') reasons.push('Only the explicitly reviewed v1.5 gesture contract is supported');
  for (const key of Object.keys(level)) {
    if (levelFields.has(key)) continue;
    if (emptyMechanisms.has(key) && Array.isArray(level[key]) && level[key].length === 0) continue;
    reasons.push('Unsupported level field or active mechanism: '+key);
  }
  for (const block of level.blocks ?? []) for (const key of Object.keys(block)) {
    if (!blockFields.has(key)) reasons.push('Unsupported block field: '+block.id+'.'+key);
  }
  for (const gate of level.gates ?? []) for (const key of Object.keys(gate)) {
    if (!gateFields.has(key)) reasons.push('Unsupported gate field: '+gate.id+'.'+key);
  }
  return {supported:reasons.length === 0, name:'static-ordinary-gates-and-optional-shell-layers', reasons};
}

function identities(candidate) {
  const levelSha256 = routeAuditValueHash(candidate.level), routeSha256 = routeAuditValueHash(candidate.drags);
  const route = candidate.route, lower = candidate.lowerBound;
  const routeEvidence = route ? {
    inputLevelSha256:route.inputLevelSha256 ?? null, routeSha256:route.routeSha256 ?? null,
    matchesCandidate:route.inputLevelSha256 === levelSha256 && route.routeSha256 === routeSha256,
    canonicalComplete:route.canonicalReplay?.valid === true && route.canonicalReplay?.complete === true,
    independentComplete:route.independentReplay?.valid === true && route.independentReplay?.complete === true,
    reportedNonClearingDrags:route.independentReplay?.nonClearingDrags ?? null,
    revalidatedByThisAudit:false,
  } : null;
  const lowerEvidence = lower ? {
    method:lower.method ?? null, inputLevelSha256:lower.inputLevelSha256 ?? null,
    matchesCandidate:lower.inputLevelSha256 === levelSha256,
    projectedLevelSha256:lower.projectedLevelSha256 ?? null,
    resultSourceLevelSha256:lower.result?.sourceLevelSha256 ?? lower.result?.inputLevelSha256 ?? null,
    reportedStatus:lower.result?.status ?? null, reportedTermination:lower.result?.termination ?? null,
    revalidatedByThisAudit:false,
  } : null;
  return {candidate:{computedLevelSha256:levelSha256,declaredLevelSha256:candidate.levelSha256 ?? null,
    computedRouteSha256:routeSha256,declaredRouteSha256:candidate.routeSha256 ?? null},routeEvidence,lowerEvidence};
}

/** Positions/layers below are declared-route bookkeeping, not game simulation.
 * Exit legality, collisions, auto-exit and completeness are deliberately not
 * verified. No shortened route or new bound is emitted. An absent finding is
 * never a difficulty, mechanism-strength or acceptance certificate. */
export function auditProvidedRouteCyclesV198(candidate, {sourceFile = null} = {}) {
  const report = {version:VERSION,status:'NOT_AUDITED_INVALID_INPUT',sourceFile,
    scope:'Static closed-gesture inspection of the supplied original route; no new mathematical proof',
    domain:null,identity:null,reasons:[],findings:[],avoidableParkingDrags:null,
    consecutiveParkingFusionAudited:false,completeRouteValidated:false,shortenedRouteReplayed:false,
    newLowerBound:null,newUpperBound:null,accepted:false,formalReady:false,
    execution:{models:0,searches:0,replays:0,ledgerClaims:0,originalFilesWritten:0}};
  if (!candidate || typeof candidate !== 'object' || !candidate.level || typeof candidate.level !== 'object'
    || Array.isArray(candidate.level) || !Array.isArray(candidate.drags)) {
    report.reasons.push('Expected an input/candidate containing level and drags'); return report;
  }
  report.identity = identities(candidate);
  const identity = report.identity;
  if ((candidate.levelSha256 !== undefined && candidate.levelSha256 !== identity.candidate.computedLevelSha256)
    || (candidate.routeSha256 !== undefined && candidate.routeSha256 !== identity.candidate.computedRouteSha256)
    || identity.routeEvidence?.matchesCandidate === false || identity.lowerEvidence?.matchesCandidate === false) {
    report.status = 'NOT_AUDITED_IDENTITY_MISMATCH'; report.reasons.push('Declared candidate or original proof identity does not match supplied bytes'); return report;
  }
  if (!Array.isArray(candidate.level.blocks) || !Array.isArray(candidate.level.gates)
    || [...candidate.level.blocks,...candidate.level.gates].some(value => !value || typeof value !== 'object' || Array.isArray(value))) {
    report.reasons.push('Expected explicit blocks and ordinary gates'); return report;
  }
  report.domain = supportedDomain(candidate);
  if (!report.domain.supported) {report.status='NOT_AUDITED_UNSUPPORTED_DOMAIN';report.reasons=[...report.domain.reasons];return report;}
  const positions = new Map(), findings = [];
  try {
    for (const block of candidate.level.blocks) {
      if (!block || typeof block.id !== 'string' || positions.has(block.id) || !point([block.x,block.y])
        || !Array.isArray(block.shape) || !block.shape.length || !block.shape.every(point)
        || typeof block.color !== 'string' || (block.layers !== undefined && (!Array.isArray(block.layers)
          || !block.layers.length || block.layers.some(color => typeof color !== 'string')))) throw Error('Malformed or duplicate block');
      positions.set(block.id,{position:[block.x,block.y],layers:block.layers?.length ?? 1});
    }
    for (const [index,drag] of candidate.drags.entries()) {
      if (!drag || Object.keys(drag).some(key => !['blockId','path','exitSide'].includes(key)) || !Array.isArray(drag.path)
        || !drag.path.every(point) || (Object.hasOwn(drag,'exitSide') && !sides.has(drag.exitSide))) throw Error('Malformed gesture at index '+index);
      const block = positions.get(drag.blockId);
      if (!block || block.layers < 1) throw Error('Unknown or already removed body at index '+index);
      const start = [...block.position]; let previous=start;
      for (const [pathIndex,p] of drag.path.entries()) {
        if (Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1]) !== 1) throw Error('Non-unit or unchanged path step at drag '+index+', path '+pathIndex);
        previous=p;
      }
      if (!drag.exitSide && !drag.path.length) throw Error('Empty non-exit gesture at index '+index);
      if (!drag.exitSide && samePoint(start,previous)) findings.push({
        kind:'CLOSED_NON_CLEARING_GESTURE',dragIndex:index,dragNumber:index+1,blockId:drag.blockId,
        start,endpoint:[...previous],path:structuredClone(drag.path),pathIndices:drag.path.map((_,i)=>i),
        exitSide:null,avoidableParkingDrags:1,
        basis:'No exit or intervening gesture; same body returns to its start in a domain with no move-triggered or timed mechanisms',
        conditionalOnOriginalRouteLegality:true,
      });
      block.position=[...previous]; if (drag.exitSide) block.layers--;
    }
  } catch (error) {report.reasons.push(error.message);return report;}
  report.findings=findings;report.avoidableParkingDrags=findings.length;
  report.status=findings.length ? 'STATIC_AVOIDABLE_CLOSED_GESTURES_FOUND' : 'STATIC_NO_CLOSED_GESTURES_FOUND';
  report.reasons.push('This audit does not prove route legality, difficulty, optimality, mechanism quality or formal readiness');
  return report;
}

export async function auditProvidedRouteFileV198(inputPath, outputPath) {
  const input=path.resolve(inputPath), output=path.resolve(outputPath);
  if (input === output) throw Error('A new output path distinct from the input is required');
  const bytes=await fs.readFile(input);
  const report=auditProvidedRouteCyclesV198(JSON.parse(bytes),{sourceFile:{path:input,sha256:hash(bytes)}});
  report.auditTool={path:ownPath,sha256:hash(await fs.readFile(ownPath))};
  // Exclusive creation also rejects aliases to an existing input or old report.
  await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === ownPath) {
  try {
    if (process.argv.length !== 4) throw Error('Usage: node provided-route-cycle-audit-v198.mjs <input-or-candidate.json> <NEW-report.json>');
    const report=await auditProvidedRouteFileV198(process.argv[2],process.argv[3]);
    console.log(JSON.stringify({status:report.status,avoidableParkingDrags:report.avoidableParkingDrags,report:path.resolve(process.argv[3])}));
    process.exitCode=report.status.startsWith('NOT_AUDITED') ? 3 : report.findings.length ? 2 : 0;
  } catch (error) {console.error(error.message);process.exitCode=1;}
}
