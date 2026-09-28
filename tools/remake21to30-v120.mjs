import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest,loadPreviewCore,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';

export const IDS=Object.freeze(Array.from({length:10},(_,i)=>21+i));
export const OUTPUT='deliverables/remake21-30-v120-20260923';
export const BASELINE=OUTPUT+'/baseline.json';
export const GEOMETRY_FIELDS=['width','height','playable','blocked','seams'];
export const floorFor=id=>id%10===0?20:[3,5,8].includes(id%10)?15:10;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeNew=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});};
export const geometry=level=>Object.fromEntries(GEOMETRY_FIELDS.filter(k=>Object.hasOwn(level,k)).map(k=>[k,level[k]]));
export function ruleGate(){const result=verifyRulesLock();assert(result.ok,result.errors.join('\n'));assert.equal(result.activeVersion,'1.20.0');return result;}

export async function loadApi(){
  const core=await loadPreviewCore();
  const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`
    export {LEVELS} from './src/core/levels.ts';
    export {validateLevel} from './src/core/PuzzleModel.ts';
    export {levelStarTargets} from './src/core/levelStarConditions.ts';
    export {searchRevisedLevel} from './src/core/revisedLevelSearch.ts';
    export {matchingPortalForExitFrontier} from './src/core/blockExitFrontier.ts';
  `},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  const module=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  return {api:{...core.api,...module},inputs:[...new Set([...core.inputs,...Object.keys(compiled.metafile.inputs)].filter(p=>p!=='<stdin>'))]};
}

export function assertBaseline(baseline){
  assert.equal(baseline.ruleVersion,'1.20.0');assert.deepEqual(baseline.scope,IDS);
  assert.equal(baseline.levels.length,200);assert.equal(digest(baseline.levels.map(r=>r.level)),baseline.campaignSha256);
  assert.deepEqual(baseline.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
  for(const row of baseline.levels){assert.equal(digest(row.level),row.sha256);assert.deepEqual(geometry(row.level),row.geometry);}
}

// Historical validator still provides useful geometry checks on the actual
// v1.4 model. Only obsolete SOURCE-contract requirements and its v1.2 profile
// label are replaced here by this explicit v1.20 baseline/profile contract.
// Never change the level's profile to make that historical checker pass.
const OLD_SOURCE_ONLY=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
export function auditCandidate(level,baseline,api){
  assertBaseline(baseline);assert(IDS.includes(level.id),'Only Lv21–30 authorized');
  const old=baseline.levels.find(r=>r.level.id===level.id);
  assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
  assert.deepEqual(geometry(level),old.geometry,'Original physical board must remain byte-for-byte equal');
  for(const k of ['name','difficulty','timeSeconds','reward'])assert.deepEqual(level[k],old.level[k],`Preserved ${k}`);
  assert.deepEqual(api.levelStarTargets(level),old.starTargets,'Actual star targets must remain');
  api.validateLevel(level);
  for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!(level[k]?.length),`Locked/legacy ${k}`);
  for(const b of level.blocks){
    for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined,`Locked ${k}`);
    assert(!b.star&&!b.rotationBadge,'Locked star or legacy rotation');
    assert(b.layers===undefined || (b.layers.length>=1&&b.layers.length<=2),'At most one shell');
  }
  for(const s of level.shutters??[])assert((s.skin===undefined||s.skin==='shutter')&&s.triggerBlockIds===undefined,'Only real countdown curtains unlocked');
  assert(level.gates.every(g=>!g.star),'Star gates not unlocked');
  const legacy=api.auditRevisedCandidate(level,undefined);
  const issues=legacy.issues.filter(i=>!(i.category==='source'&&OLD_SOURCE_ONLY.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
  const snapshot=new api.PuzzleModel(structuredClone(level)).snapshot();
  const coverage=auditOpeningCoverage(snapshot),spans=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level);
  assert.deepEqual(issues,[],'Geometry/composition/mechanism violations');
  assert(coverage.passed,JSON.stringify(coverage));assert(spans.passed,JSON.stringify(spans));assert(art.passed,JSON.stringify(art));
  return {passed:true,profile:level.mechanismRules,geometryPreserved:true,metadataPreserved:true,coverage,spans,art,
    measurements:legacy.measurements,facts:measureDesignFacts(level,api),sourceAlignment:'not-applicable-new-authorized-design',
    historicalChecksReplaced:legacy.issues.filter(i=>!issues.includes(i)).map(i=>({category:i.category,code:i.code})),difficultyCertified:false};
}

export function checkCandidate(raw,baseline,api){
  const level=raw.level,drags=raw.drags??raw.route;
  assert(typeof raw.seed==='string'&&raw.seed.length,'Construction seed required');
  assert(raw.design&&typeof raw.design.primaryMechanism==='string','Explicit main-mechanism design required');
  assert(Array.isArray(drags)&&drags.length,'Full no-booster route required');
  const audit=auditCandidate(level,baseline,api),replay=api.replayRevisedRoute(level,drags);
  assert(replay.valid&&replay.complete,`Lv${level.id}: ${JSON.stringify(replay)}`);
  // This function deliberately does NOT certify agent-supplied floor claims.
  // Separate reviewed proof code and actual UI replay must bind this level SHA.
  return {levelId:level.id,levelSha256:digest(level),routeSha256:digest(drags),audit,replay,
    floorRequired:floorFor(level.id),lowerBoundCertified:false,pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}

export async function captureBaseline(){
  const lock=ruleGate(),{api,inputs}=await loadApi();
  assert.equal(api.LEVELS.length,200);
  const levels=JSON.parse(JSON.stringify(api.LEVELS)).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
  const result={schemaVersion:1,ruleVersion:'1.20.0',runtimeProfile:'revised-2026-09-23-v1.4',createdAt:new Date().toISOString(),scope:IDS,
    campaignSha256:digest(levels.map(r=>r.level)),other190Sha256:digest(levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),levels,
    lock,inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
  assertBaseline(result);writeNew(BASELINE,result);return {path:BASELINE,campaignSha256:result.campaignSha256,other190Sha256:result.other190Sha256};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,...args]=process.argv.slice(2);
  if(mode==='capture')console.log(JSON.stringify(await captureBaseline(),null,2));
  else if(mode==='check'){
    ruleGate();const baseline=read(BASELINE),{api}=await loadApi();
    for(const file of args){const result=checkCandidate(read(file),baseline,api);console.log(JSON.stringify({...result,audit:{passed:result.audit.passed},replay:{...result.replay,finalStateKey:undefined}},null,2));}
  }else throw new Error('Usage: node tools/remake21to30-v120.mjs capture | check candidate.json ...');
}
