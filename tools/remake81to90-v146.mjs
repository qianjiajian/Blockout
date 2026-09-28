// Isolated authoring gates for Lv81–90. Static/witness checks are not adoption.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi as loadCoreApi,geometry} from './native-block-repair-v143.mjs';
import {loadSpatialApi} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {assertBaseline as assertCampaignBaseline,BASELINE as CAMPAIGN_BASELINE} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {searchSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain-v2.mjs';
import {replaySpatialTrace} from '../deliverables/remake71-80-v146-20260924/floor-review/replay-spatial-trace-v2.mjs';
import {checkSource8586} from '../deliverables/remake81-90-v146-20260924/agent85-87/source-contract.mjs';
import {verifyDecisions,observeMechanismProcess} from './review-remake71to80-decisions-v146.mjs';
import {checkSource81,checkSource82} from '../deliverables/remake81-90-v146-20260924/agent81-84/source-contract.mjs';
import {checkSource83} from '../deliverables/remake81-90-v146-20260924/agent81-84/source-contract83.mjs';
import {checkSource89} from '../deliverables/remake81-90-v146-20260924/agent88-90/source-contract89.mjs';
import {verifyMechanisms89} from './remake81to90-mechanisms89-v146.mjs';
import {verifyKeyProcess} from './remake81to90-key-review-v146.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake81to90-generator-floor-v146.mjs';
import {checkSource87} from '../deliverables/remake81-90-v146-20260924/agent85-87/source-contract87.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute} from './remake81to90-immediate-generator-floor-v146.mjs';
import {verifyIceBranches} from './remake81to90-ice-branches-v146.mjs';

export const ROOT='deliverables/remake81-90-v146-20260924';
export const BASELINE=CAMPAIGN_BASELINE,OUTPUT=ROOT,VERSION='1.47.0';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>81+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence(90).rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,{...r,min:r.range[0],max:r.range[1]}])));
export const writeNew=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});};
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.47.0');return lock;}
export function baseline(){return assertCampaignBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE)));}
export async function loadApi(){
 const core=await loadCoreApi(),spatial=await loadSpatialApi();
 return {...core,api:{...core.api,resolveMatchingGatePortal:spatial.resolveMatchingGatePortal,exitFrontierFacesBoundary:spatial.exitFrontierFacesBoundary}};
}
export function auditLayout(level,api,{requireOriginality=true}={}){
 const lock=ruleGate();assert(IDS.includes(level.id),'Only Lv81–90');
 const old=baseline().levels[level.id-1],target=TARGETS[level.id];
 const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(old.level),...Object.keys(level)]))if(!mutable.has(k))assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(level),old.geometry,'Preserve physical board');
 assert.deepEqual(api.levelStarTargets(level),old.starTargets,'Preserve actual star targets');
 assert.equal(level.difficulty,target.difficulty);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 api.validateLevel(level);
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Locked or legacy ${k}`);
 for(const block of level.blocks){
  assert(!block.star&&!block.rotationBadge&&block.timedBombSeconds===undefined,'No not-yet-unlocked/legacy block mechanism');
  assert.equal(api.matchFormalBlockShape(block.shape,'native-only')?.quarterTurns,0,`Native complete artwork: ${block.id}`);
 }
 assert(level.gates.every(g=>!g.star),'Star gates locked until 100');
 for(const s of level.shutters??[])assert((s.skin===undefined||['shutter','lift'].includes(s.skin))&&s.triggerBlockIds===undefined,'Only actual spatial regions');
 const sourceOnly=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
 const issues=api.auditRevisedCandidate(level,undefined).issues.filter(i=>!(i.category==='source'&&sourceOnly.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 assert.deepEqual(issues,[],'Unmodified current geometry/composition/mechanism checks');
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
 for(const [name,result]of Object.entries(checks))assert(result.passed,`${name}: ${JSON.stringify(result)}`);
 if(requireOriginality)assert(!isGlobalIsometry(old.level,level),'A recolour or whole-board isometry is not a new layout');
 return{passed:true,activeRuleVersion:lock.activeVersion,levelSha256:digest(level),target,checks,geometryPreserved:true,starTargetsPreserved:true,
  sourceAlignmentValidated:false,lowerBoundValidated:false,pointerValidated:false,humanBlindTested:false,adoptionReady:false};
}
export function checkWitness(data,api){
 const audit=auditLayout(data.level,api),replay=api.replayRevisedRoute(data.level,data.drags);
 assert(replay.valid&&replay.complete,JSON.stringify(replay));
 const target=TARGETS[data.level.id];assert(replay.nonClearingDrags>=target.min&&replay.nonClearingDrags<=target.max,`Route upper bound ${replay.nonClearingDrags} outside ${target.min}–${target.max}`);
 const measurements=measureRoute(data.level,data.drags,api);
 return{audit,replay,measurements,routeSha256:digest(data.drags),upperBound:replay.nonClearingDrags,lowerBoundValidated:false,adoptionReady:false};
}
export function verifyRestrictions(data,api){
 const expected=data.level.blocks.flatMap(b=>[...(b.movementAxis?[{kind:'axis',blockId:b.id,fields:['movementAxis']}]:[]),...(b.lockedBy?[{kind:'lock',blockId:b.id,fields:['lockedBy','lockCount']}]:[])]);
 assert.equal(data.mechanismCases?.length,expected.length,'Review every axis and locked body');
 return expected.map(e=>{
  const c=data.mechanismCases.find(c=>c.kind===e.kind&&c.blockId===e.blockId);assert(c);
  assert(Number.isInteger(c.beforeDrag)&&c.beforeDrag>=1&&c.beforeDrag<=data.drags.length);
  const prefix=data.drags.slice(0,c.beforeDrag-1);assert.deepEqual(c.prefix,prefix);assert.deepEqual(c.onlyRemovedFields,e.fields);
  const before=api.replayRevisedRoute(data.level,prefix);assert(before.valid&&!before.complete);
  const source=JSON.parse(before.finalStateKey),body=source.blocks.find(b=>b.id===e.blockId);assert(body);assert(e.kind==='axis'?body.movementAxis:body.lockCount>0);
  const projected=structuredClone(data.level),b=projected.blocks.find(b=>b.id===e.blockId);for(const field of e.fields)delete b[field];
  const before2=api.replayRevisedRoute(projected,prefix);assert(before2.valid);
  const normalize=s=>{const x=structuredClone(s.blocks.find(b=>b.id===e.blockId));for(const k of e.fields)delete x[k];return {...s,blocks:s.blocks.map(b=>b.id===e.blockId?x:b)};};
  assert.deepEqual(normalize(JSON.parse(before2.finalStateKey)),normalize(source),'Only the stated constraint may differ at the fork');
  assert.equal(c.blockedAction.blockId,e.blockId);
  const rejected=api.replayRevisedRoute(data.level,[...prefix,c.blockedAction]),allowed=api.replayRevisedRoute(projected,[...prefix,c.blockedAction]);assert(!rejected.valid);assert(allowed.valid,allowed.error);
  return{kind:e.kind,blockId:e.blockId,beforeDrag:c.beforeDrag,onlyRemovedFields:e.fields,action:c.blockedAction,sourceRejection:rejected.error,localConstraintVerified:true,globalOrderProven:false};
 });
}
export function checkCandidate(data,_baseline,api){
 const w=checkWitness(data,api),id=data.level.id;
 assert([81,82,83,85,86,87,89].includes(id),'A dedicated strict source contract is required before accepting this ID');
 const source=id===81?checkSource81(data.level,api):id===82?checkSource82(data.level,api):id===83?checkSource83(data.level,api):id===87?checkSource87(data.level,api):id===89?checkSource89(data.level,api):checkSource8586(data.level,api);
 if(id===81){
  for(const b of data.level.blocks)assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','frozen','keyId','lockedBy','lockCount'].includes(k)),'No source-external body attributes');
  for(const g of data.level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)),'No source-external gate attributes');
 }
 if([81,82].includes(id)){source.sourceFile=ROOT+`/agent81-84/source${id}.json`;source.bindings=JSON.parse(fs.readFileSync(source.sourceFile)).bindings;}
 source.bindings={...(source.frameBindings??source.bindings),[source.sourceFile]:source.sourceSha256};
 const proof=id===87?checkImmediateGeneratorFloor(data.level,api,{floor:11,maxStates:2000000,maxMilliseconds:180000}):id===89?checkFullGeneratorFloor(data.level,api,{floor:5,maxStates:2000000,maxMilliseconds:180000,relaxKeysAxis:true}):searchSpatial(data.level,api,{prove:true,floor:TARGETS[id].min,maxStates:2000000,maxMilliseconds:180000,maxTransitions:40000000});assert(proof.thresholdProven,JSON.stringify(proof));
 const domainReplay=id===87?projectImmediateRoute(data.level,data.drags,api):id===89?verifyFullGeneratorRouteProjection(data.level,data.drags,api,{relaxKeysAxis:true}):replaySpatialTrace(data.level,data.drags,api),decisions=verifyDecisions(data,api),mechanisms=[81,82,83].includes(id)?verifyKeyProcess(data,api):id===87?verifyIceBranches(data,api):id===89?verifyMechanisms89(data,api):verifyRestrictions(data,api),process=observeMechanismProcess(data.level,data.drags,api);
 if(id===89){assert(domainReplay.valid,domainReplay.error);assert(domainReplay.projectedNonClearingDrags<=w.upperBound);}else if(id===87){assert(domainReplay.passed);assert.equal(domainReplay.steps.reduce((n,s)=>n+s.cost,0),w.upperBound);}else assert.equal(domainReplay.cost,w.upperBound);
 return{id,activeRuleVersion:VERSION,levelSha256:digest(data.level),routeSha256:digest(data.drags),...w,source,proof,domainReplay,decisions,mechanisms,process,lowerBound:proof.floor,lowerBoundValidated:true,pointerValidated:false,humanBlindTested:false,adoptionReady:false};
}
export async function capture(){
 const lock=ruleGate(),b=baseline(),{api,inputs}=await loadApi();
 assert.equal(digest(api.LEVELS.slice(0,30)),b.protected1to30Sha256);
 for(const id of IDS)assert.deepEqual(api.LEVELS[id-1],b.levels[id-1].level,`Lv${id} concurrent changes require review`);
 const record={createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,scope:IDS,campaignBaseline:CAMPAIGN_BASELINE,designBaselineSha256:b.campaignSha256,
  campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),levels:structuredClone(api.LEVELS),targets:TARGETS,
  inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),formalAdoptions:0,adoptionReady:false};
 const file=ROOT+'/session-baseline.json';writeNew(file,record);return{file,campaignSha256:record.campaignSha256};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const[mode,...files]=process.argv.slice(2);
 if(mode==='capture')console.log(JSON.stringify(await capture()));
 else if(['audit','witness','check'].includes(mode)){const{api}=await loadApi();for(const file of files){const d=JSON.parse(fs.readFileSync(file)),r=mode==='audit'?auditLayout(d.level,api):mode==='witness'?checkWitness(d,api):checkCandidate(d,baseline(),api);const output=ROOT+'/root-'+mode+'-'+d.level.id+'-'+Date.now()+'.json';writeNew(output,{candidate:file,...r});console.log(JSON.stringify({file,output,id:d.level.id,lower:r.lowerBound,upper:r.upperBound}));}}
 else throw Error('Usage: capture | audit FILES | witness FILES');
}
