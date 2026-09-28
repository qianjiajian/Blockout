import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi as loadBaseApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {checkAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {checkBombFloor} from './remake111to120-bomb-floor-v147.mjs';
import {replayBombRoute,bombSpatialApi} from './remake111to120-bomb-replay-v147.mjs';
import {checkSource113,checkSource120} from './remake111to120-source-v147.mjs';
import {checkSource112} from './remake111to120-source112-v147.mjs';
import {checkSource111} from './remake111to120-source111-v147.mjs';
import {checkSource116} from './remake111to120-source116-v147.mjs';
import {checkSource114} from './remake111to120-source114-v147.mjs';
import {checkSource117} from '../deliverables/remake111-120-v146-20260924/redesign117-20260927/source117-check.mjs';
import {check117Floor} from '../deliverables/remake111-120-v146-20260924/agent111-114/floor117-delayed-lift.mjs';
import {checkSource118} from '../deliverables/remake111-120-v146-20260924/redesign118-20260927/source118-check.mjs';
import {checkSource119} from './remake111to120-source119-v172.mjs';
import {check119Floor} from './remake111to120-floor119-v173.mjs';
import {checkSource115} from '../deliverables/remake111-120-v146-20260924/assist115-20260927/accepted81/source115-check.mjs';
import {checkNativeStatic115} from '../deliverables/remake111-120-v146-20260924/review115-20260927/native-proof-v3.mjs';
import {checkCompactStaticFloor} from './remake111to120-boundary-static-floor-v147.mjs';
import {checkCachedAdvance114} from '../deliverables/remake111-120-v146-20260924/agent119-120/114/cached-advance114.mjs';
import {check116Floor,replay116} from '../deliverables/remake111-120-v146-20260924/agent111-114/floor116-fifo.mjs';
import {checkLiftSuffixFloor} from './remake111to120-lift-suffix-floor-v147.mjs';
import {loadSpatialApi,searchSpatial} from './remake111to120-spatial-floor-v147.mjs';
import {verifyDecisions} from './review-remake111to120-decisions-v147.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export async function loadApi(){const base=await loadBaseApi();return{...base,api:{...base.api,...await loadSpatialApi()}};}
export const VERSION='1.73.0';
export const OUTPUT='deliverables/remake111-120-v146-20260924';
export const BASELINE=OUTPUT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>111+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,{difficulty:r.difficulty,min:r.range[0],max:r.range[1]}])));
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.46.0','1.47.0','1.48.0','1.49.0','1.50.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0','1.56.0','1.57.0','1.58.0','1.59.0','1.60.0','1.61.0','1.62.0','1.63.0','1.64.0','1.65.0','1.66.0','1.67.0','1.68.0','1.69.0','1.70.0','1.71.0','1.72.0','1.73.0'].includes(lock.activeVersion),'Only the reviewed contract and its unchanged successors');return lock;}
export function baseline(){
 const b=JSON.parse(fs.readFileSync(BASELINE));
 assert.equal(b.ruleVersion,'1.46.0');assert.deepEqual(b.scope,IDS);
 assert.equal(b.campaignSha256,'e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb');
 assert.equal(b.levels.length,200);assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
 assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
 assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other190Sha256);
 for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}
 return b;
}
// This is a spatial draft gate. Source review, decisions, bounds, and actual
// Pointer/time evidence remain separate mandatory gates before any adoption.
export function auditDraft(data,api,b=baseline()){
 ruleGate();
 const l=data.level,t=TARGETS[l?.id];assert(t,'Only 111–120');
 const old=b.levels[l.id-1];
 const mutable=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(old.level),...Object.keys(l)]))if(!mutable.has(k))assert.deepEqual(l[k],old.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(l),old.geometry);assert.deepEqual(api.levelStarTargets(l),old.starTargets);
 assert.equal(l.mechanismRules,'revised-2026-09-23-v1.4');assert.equal(l.difficulty,t.difficulty);
 api.validateLevel(l);
 for(const gate of l.gates)for(const portal of gate.portals??[])assert.deepEqual(Object.keys(portal).sort(),['origin','side','size'],'Portals must use the exact GatePortalSpec fields');
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length,`Locked or legacy ${k}`);
 for(const block of l.blocks){assert(!block.rotationBadge);if(l.id<120)assert(block.timedBombSeconds===undefined,'Bomb unlock is 120');}
 if(l.id===120)assert(l.blocks.some(block=>block.timedBombSeconds!==undefined),'Bomb teaching requires an actual bomb');
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
 const hard=api.auditRevisedCandidate(l,undefined);
 assert.deepEqual(hard.issues.filter(i=>!(i.category==='source'&&omit.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile')),[],'Hard gameplay rules');
 const opening=auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden=auditHiddenCoverage(l),spans=auditGateSpanLimits(l),queue=auditGeneratorQueueColors(l),art=api.auditCandidateBlockArt(l);
 for(const report of [opening,hidden,spans,queue,art])assert(report.passed,JSON.stringify(report));
 const native=l.blocks.map(block=>({id:block.id,match:api.matchFormalBlockShape(block.shape,'native-only')}));
 assert(native.every(row=>row.match?.quarterTurns===0),'Every opening/hidden/queued block needs complete native q0 artwork');
 assert(!isGlobalIsometry(old.level,l),'A new layout cannot just recolour, rotate, or mirror the old one');
 return {passed:true,levelSha256:digest(l),target:t,opening,hidden,spans,queue,art,native,facts:measureDesignFacts(l,api),sourceValidated:false,lowerBoundValidated:false,pointerValidated:false,adoptionReady:false};
}
export async function checkDraftRoute(data,api,options={}){
 const audit=auditDraft(data,api),l=data.level,t=TARGETS[l.id];
 const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
 assert(replay.nonClearingDrags>=t.min&&replay.nonClearingDrags<=t.max,`Route upper bound ${replay.nonClearingDrags} outside ${t.min}–${t.max}`);
 const floor=await checkAdvancedFloor(l,{floor:t.min,maxStates:options.maxStates??200000,maxMilliseconds:options.maxMilliseconds??60000});
 return {audit,replay,floor,levelSha256:digest(l),routeSha256:digest(data.drags),lowerBoundValidated:floor.thresholdProven,sourceValidated:false,naturalTimeValidated:false,pointerValidated:false,adoptionReady:false};
}
export function checkCandidate(data,_baseline,api,options={}){
 const audit=auditDraft(data,api),level=data.level,target=TARGETS[level.id];
 assert([111,112,113,114,115,116,117,118,119,120].includes(level.id),'Only independently reviewed source/proof combinations may reach the candidate gate');
 assert(data.seed&&data.design?.primaryMechanism&&data.design?.concreteDecision);
 for(const k of ['layoutIntent','alignment','changes','constraints']){
  const value=data.originality?.[k];
  assert(typeof value==='string'||(Array.isArray(value)&&value.length&&value.every(x=>typeof x==='string'&&x.trim())),`Originality review ${k} type`);
  assert((Array.isArray(value)?value.join('\n'):value).trim().length>=8,`Originality review ${k}`);
 }
 const source=({111:checkSource111,112:checkSource112,113:checkSource113,114:checkSource114,115:checkSource115,116:checkSource116,117:checkSource117,118:checkSource118,119:checkSource119,120:checkSource120}[level.id])(level,api),replay=level.id===120?replayBombRoute(level,data.drags,api,{timed:true}):api.replayRevisedRoute(level,data.drags);
 assert(replay.valid&&replay.complete,JSON.stringify(replay));
 assert(replay.nonClearingDrags>=target.min&&replay.nonClearingDrags<=target.max);
 const budgets={floor:target.min,maxStates:options.maxStates??(level.id===115?7000000:1000000),maxMilliseconds:options.maxMilliseconds??(level.id===118?300000:level.id===119?60000:180000)};
 const proof=level.id===115?checkNativeStatic115(level,api,budgets):level.id===120?checkBombFloor(level,api,budgets):level.id===119?check119Floor(level,api,{...budgets,drags:data.drags}):level.id===118?checkCompactStaticFloor(level,api,budgets):level.id===117?check117Floor(level,api,budgets):level.id===116?check116Floor(level,api,budgets):level.id===114?checkCachedAdvance114(level,api,budgets):[111,112].includes(level.id)?checkLiftSuffixFloor(level,api,budgets):searchSpatial(level,api,{...budgets,prove:true});
 assert(proof.thresholdProven,JSON.stringify(proof));
 const independentUnitReplay=level.id===116?replay116(level,data.drags,api):undefined;
 const decisions=verifyDecisions(data,bombSpatialApi(api)),measurements=measureRoute(level,data.drags,api),stars=baseline().levels[level.id-1].starTargets;
 if(level.id===120){decisions.spatialOnly=true;decisions.timedRecoveries=data.decisionCases.filter(c=>c.legalWrongParking).map(c=>{const r=replayBombRoute(level,c.fullRecoveredRoute,api,{timed:true});assert(r.valid&&r.complete,JSON.stringify(r));return r;});}
 const clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 return {id:level.id,ruleVersion:ruleGate().activeVersion,checkedAt:new Date().toISOString(),levelSha256:digest(level),routeSha256:digest(data.drags),
  audit,source,replay,proof,independentUnitReplay,decisions,measurements,lowerBound:target.min,upperBound:replay.nonClearingDrags,
  exactNecessaryRepositions:target.min===replay.nonClearingDrags?target.min:null,
  starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+target.min,moveTargetImpossible:clearLoad+target.min>stars.moveTarget,timeAndStarsCalibrated:false},
  naturalTimeValidated:false,pointerValidated:false,humanBlindTested:false,adoptionReady:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 ruleGate();const [mode,...files]=process.argv.slice(2);assert(['audit','route','check'].includes(mode));
 const {api}=await loadApi();
 for(const file of files){const data=JSON.parse(fs.readFileSync(file)),report=mode==='audit'?auditDraft(data,api):mode==='check'?checkCandidate(data,null,api):await checkDraftRoute(data,api);console.log(JSON.stringify({file,report}));}
}
