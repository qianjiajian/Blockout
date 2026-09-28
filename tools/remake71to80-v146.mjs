import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi as loadCoreApi,geometry} from './native-block-repair-v143.mjs';
import {loadSpatialApi,searchSpatial,replayDomain,compileSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {checkSource75} from '../deliverables/remake71-80-v146-20260924/root75/source-contract.mjs';
import {checkSource73} from '../deliverables/remake71-80-v146-20260924/root73/source-contract.mjs';
import {checkSource71,checkSource72} from '../deliverables/remake71-80-v146-20260924/source71-75/source-contract.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from '../deliverables/remake71-80-v146-20260924/root71/full-generator-floor-v3.mjs';
import {replayAutomatic71} from '../deliverables/remake71-80-v146-20260924/floor-review/automatic-generator71.mjs';
import {verifyMechanisms71} from '../deliverables/remake71-80-v146-20260924/floor-review/71-author/verify-mechanisms71.mjs';
import {replaySpatialTrace} from '../deliverables/remake71-80-v146-20260924/floor-review/replay-spatial-trace-v2.mjs';
import {checkSource79} from '../deliverables/remake71-80-v146-20260924/floor-review/source-contract79.mjs';
import {verifyMechanisms79} from '../deliverables/remake71-80-v146-20260924/floor-review/verify-mechanisms79.mjs';
import {checkSource78} from '../deliverables/remake71-80-v146-20260924/floor-review/source-contract78.mjs';
import {verifyMechanisms78} from '../deliverables/remake71-80-v146-20260924/floor-review/verify-mechanisms78.mjs';
import {checkSource76} from '../deliverables/remake71-80-v146-20260924/source76-80/source-contract76.mjs';
import {verifyCertificate76,verifyMechanisms76} from '../deliverables/remake71-80-v146-20260924/root76/verify-certificate76.mjs';
import {checkSource77} from '../deliverables/remake71-80-v146-20260924/source76-80/source-contract77.mjs';
import {verifyCertificate77} from '../deliverables/remake71-80-v146-20260924/root77/verify-certificate77.mjs';
import {verifyQuality77} from '../deliverables/remake71-80-v146-20260924/root77/verify-quality77.mjs';
import {verifyGuiRoute77} from '../deliverables/remake71-80-v146-20260924/root77/verify-gui-route77.mjs';
import {checkSource74} from '../deliverables/remake71-80-v146-20260924/source71-75/74-author/source-contract74-v3.mjs';
import {verifyMechanisms74} from '../deliverables/remake71-80-v146-20260924/source71-75/74-author/verify-mechanisms74.mjs';
import {verifyCertificate74} from '../deliverables/remake71-80-v146-20260924/root74/verify-certificate74.mjs';
import {assertBaseline as assertCampaignBaseline,BASELINE as CAMPAIGN_BASELINE} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {verifyDecisions} from './review-remake71to80-decisions-v146.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
export async function loadApi(){const core=await loadCoreApi(),spatial=await loadSpatialApi();return {...core,api:{...core.api,resolveMatchingGatePortal:spatial.resolveMatchingGatePortal,exitFrontierFacesBoundary:spatial.exitFrontierFacesBoundary}};}
export const ROOT='deliverables/remake71-80-v146-20260924';
export const OUTPUT=ROOT,VERSION='1.51.0',BASELINE=CAMPAIGN_BASELINE;
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>71+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,r])));
export const writeNew=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});};
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.46.0','1.47.0','1.48.0','1.49.0','1.50.0','1.51.0'].includes(lock.activeVersion),'Only reviewed v1.46-v1.51 rule versions qualified');return lock;}
export function baseline(){return assertCampaignBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE)));}
export function auditLayout(level,api){
  ruleGate();assert(IDS.includes(level.id));const b=baseline().levels[level.id-1],target=TARGETS[level.id];
  assert.deepEqual(geometry(level),b.geometry);assert.deepEqual(api.levelStarTargets(level),b.starTargets);
  for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(level[k],b.level[k],`Preserve ${k}`);
  assert.equal(level.difficulty,target.difficulty);api.validateLevel(level);
  for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,`Locked or legacy ${k}`);
  for(const block of level.blocks){assert(!block.star&&!block.rotationBadge&&block.timedBombSeconds===undefined);assert.equal(api.matchFormalBlockShape(block.shape)?.quarterTurns,0,`Native artwork ${block.id}`);}
  assert(level.gates.every(g=>!g.star));
  const ignored=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
  const hard=api.auditRevisedCandidate(level,undefined).issues.filter(i=>!ignored.has(i.code));assert.deepEqual(hard,[]);
  const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
  for(const [name,c]of Object.entries(checks))assert(c.passed,`${name}: ${JSON.stringify(c)}`);
  return {passed:true,checks,sourceAlignmentValidated:false,lowerBoundValidated:false,pointerValidated:false};
}
export function checkCandidate(data,b,api){
  const lock=ruleGate(),l=data.level;assert([71,72,73,74,75,76,77,78,79,80].includes(l.id),'Only completed source contracts are qualified');
  const audit=auditLayout(l,api),old=b.levels[l.id-1];
  const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
  for(const k of new Set([...Object.keys(old.level),...Object.keys(l)]))if(!mutable.has(k))assert.deepEqual(l[k],old.level[k],`Preserve ${k}`);
  assert(!isGlobalIsometry(old.level,l),'Original spatial arrangement required');
  if(l.id===71){
    const source=checkSource71(l,api),proof=checkFullGeneratorFloor(l,api,{floor:16,maxStates:3000000,maxMilliseconds:180000});assert(proof.thresholdProven,JSON.stringify(proof));
    const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20);
    const domainReplay=replayAutomatic71(l,data.drags,api);assert(domainReplay.complete);assert.equal(domainReplay.cost,replay.nonClearingDrags);assert.equal(domainReplay.arrivals.length,6);
    const projection=verifyFullGeneratorRouteProjection(l,data.drags,api),measurement=measureRoute(l,data.drags,api);assert(projection.valid,projection.error);assert(measurement.multiCellDrags>measurement.singleCellDrags);
    const decisions=verifyDecisions(data,api),mechanisms=verifyMechanisms71(data,api);
    return{id:l.id,activeRuleVersion:lock.activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source,proof,replay,domainReplay,projection,measurement,decisions,mechanisms,lowerBound:16,upperBound:replay.nonClearingDrags,pointerValidated:false,humanBlindTested:false,released:false};
  }
  if(l.id===74){
    const source=checkSource74(l,api),proof=verifyCertificate74(l,api);assert(proof.thresholdProven);source.bindings={...source.bindings,...proof.bindings};
    const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=17&&replay.nonClearingDrags<=30);
    const domainReplay=replaySpatialTrace(l,data.drags,api);assert(domainReplay.complete);assert.equal(domainReplay.cost,replay.nonClearingDrags);
    const mechanisms=verifyMechanisms74(data,api),measurement=measureRoute(l,data.drags,api),decisions=verifyDecisions(data,api);assert.equal(mechanisms.units,313);assert.equal(mechanisms.coverEvents.length,5);
    return{id:l.id,activeRuleVersion:lock.activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source,proof,replay,domainReplay:{...domainReplay,state:undefined},measurement,decisions,mechanisms,lowerBound:17,upperBound:replay.nonClearingDrags,pointerValidated:false,humanBlindTested:false,released:false};
  }
  if(l.id===77){
    const source=checkSource77(l,api),proof=verifyCertificate77(l,api);assert(proof.thresholdProven);source.bindings={...source.bindings,...proof.bindings};
    const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
    const domainReplay=verifyGuiRoute77(data,api);assert(domainReplay.complete);assert.equal(domainReplay.cost,replay.nonClearingDrags);assert.equal(domainReplay.arrivals.length,3);
    const decisions=verifyDecisions(data,api),mechanisms=verifyQuality77(data,api),measurement=mechanisms.measurement;
    return{id:l.id,activeRuleVersion:lock.activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source,proof,replay,domainReplay,measurement,decisions,mechanisms,lowerBound:11,upperBound:replay.nonClearingDrags,pointerValidated:false,humanBlindTested:false,released:false};
  }
  if([72,73,75,76,78,79].includes(l.id)){
    const lower=l.id===78?16:[73,76].includes(l.id)?11:5,upper=l.id===78?20:[73,76].includes(l.id)?15:10;
    const source=({72:checkSource72,73:checkSource73,75:checkSource75,76:checkSource76,78:checkSource78,79:checkSource79})[l.id](l,api),proof=l.id===76?verifyCertificate76(l,api):searchSpatial(l,api,{prove:true,floor:lower,maxStates:1500000,maxMilliseconds:180000,maxTransitions:30000000});assert(proof.thresholdProven,JSON.stringify(proof));
    if(l.id===76)source.bindings={...source.bindings,...proof.bindings};
    const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=lower&&replay.nonClearingDrags<=upper);
    const domainReplay=[72,76,78,79].includes(l.id)?replaySpatialTrace(l,data.drags,api):replayDomain(compileSpatial(l,api),data.drags,api);assert(domainReplay.complete);assert.equal(domainReplay.cost,replay.nonClearingDrags);
    const measurement=measureRoute(l,data.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);const decisions=verifyDecisions(data,api);
    const mechanisms=l.id===79?verifyMechanisms79(data,api):l.id===78?verifyMechanisms78(data,api):l.id===76?verifyMechanisms76(data,api):undefined;
    return{id:l.id,activeRuleVersion:lock.activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source,proof,replay,domainReplay:{...domainReplay,state:undefined},measurement,decisions,mechanisms,lowerBound:lower,upperBound:replay.nonClearingDrags,pointerValidated:false,humanBlindTested:false,released:false};
  }
  assert(!l.shutters?.length&&!l.generators?.length);assert.equal(l.blocks.length,18);assert.equal(l.gates.length,4);
  const counts={};for(const body of l.blocks){const native=api.matchFormalBlockShape(body.shape,'native-only');assert([1,2].includes(native.shapeId));const k=`${body.color}:${native.shapeId}`;counts[k]=(counts[k]??0)+1;assert(!body.layers&&!body.frozen&&!body.shutterId&&!body.movementAxis);}
  assert.deepEqual(counts,{'blue:2':5,'green:2':6,'red:1':1,'cyan:2':3,'red:2':1,'cyan:1':1,'green:1':1});
  assert.deepEqual(l.gates.map(g=>g.color).sort(),['blue','cyan','green','red']);assert(l.gates.every(g=>!g.frozen));
  const keys=l.blocks.filter(x=>x.keyId),locks=l.blocks.filter(x=>x.lockedBy);assert.equal(keys.length,2);assert.equal(locks.length,2);
  for(const [color,target]of [['red','blue'],['green','red']]){const key=keys.find(x=>x.color===color);assert(key&&key.shape.length===1);const matches=locks.filter(x=>x.lockedBy===key.keyId);assert.equal(matches.length,1);assert.equal(matches[0].color,target);assert.equal(matches[0].shape.length,2);assert.equal(matches[0].lockCount,1);}
  const source=JSON.parse(fs.readFileSync(ROOT+'/root80/source80.json'));for(const [p,h]of Object.entries(source.bindings))assert.equal(digest(fs.readFileSync(p)),h);
  assert.equal(source.openingArea,29);assert.equal(source.openingBlocks,16);assert.equal(l.playable.length,33);
  const projected=structuredClone(l);for(const body of projected.blocks){delete body.keyId;delete body.lockedBy;delete body.lockCount;}
  const proof=checkSymmetryFloor(projected,{floor:11,maxStates:2000000,maxMilliseconds:60000});assert(proof.thresholdProven,JSON.stringify(proof));
  const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
  const measurement=measureRoute(l,data.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);const decisions=verifyDecisions(data,api);
  return {id:80,activeRuleVersion:lock.activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source,proof,projection:{sourceLevelSha256:digest(l),projectedLevelSha256:digest(projected),reason:'Remove only key/lock movement restrictions; retain every body, position, color, shape and gate. Every original legal gesture remains legal with identical clearing and reposition cost.'},replay,measurement,decisions,lowerBound:11,upperBound:replay.nonClearingDrags,pointerValidated:false,humanBlindTested:false,released:false};
}
export async function capture(){
  const lock=ruleGate(),b=baseline(),{api,inputs}=await loadApi();
  for(const id of IDS)assert.deepEqual(api.LEVELS[id-1],b.levels[id-1].level,`Lv${id} already changed: review concurrent writer`);
  assert.equal(digest(api.LEVELS.slice(0,30)),b.protected1to30Sha256);
  const file=ROOT+'/session-baseline.json';
  if(fs.existsSync(file)){const prior=JSON.parse(fs.readFileSync(file));assert.equal(prior.campaignSha256,digest(api.LEVELS));return {file,created:false};}
  const record={createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,scope:IDS,campaignBaseline:CAMPAIGN_BASELINE,designBaselineSha256:b.campaignSha256,campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),levels:structuredClone(api.LEVELS),targets:TARGETS,inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),formalAdoptions:0};
  writeNew(file,record);return {file,created:true,campaignSha256:record.campaignSha256};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,...files]=process.argv.slice(2);
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='audit'){const {api}=await loadApi();for(const f of files){const d=JSON.parse(fs.readFileSync(f));const r=auditLayout(d.level,api);console.log(JSON.stringify({file:f,id:d.level.id,...r}));}}
  else throw Error('Usage: capture | audit CANDIDATES...');
}
