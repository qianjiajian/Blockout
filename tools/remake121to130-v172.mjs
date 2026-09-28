import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi as loadBase,geometry} from './native-block-repair-v143.mjs';
import {apiLoad,projection,replayBomb} from './remake121to130-bomb-replay-v172.mjs';
import {check127Floor,verify127RouteProjection} from './campaign-v145/lv121-130/round3-b/check127.mjs';
import {check129Floor,verify129RouteProjection} from './campaign-v145/lv121-130/round3-c/check129.mjs';
import {BASELINE,assertBaseline} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {searchSpatial} from './remake111to120-spatial-floor-v147.mjs';
import {checkAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export {BASELINE,projection};
export const OUTPUT='deliverables/campaign121-130-v146-20260924';
export const VERSION='1.72.0';
export const IDS=Array.from({length:10},(_,i)=>121+i);
export const TARGETS=Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,{difficulty:r.difficulty,min:r.range[0],max:r.range[1]}]));
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert(['1.71.0','1.72.0'].includes(l.activeVersion));return l;}
export const baseline=()=>assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
export async function loadApi(){const b=await loadBase();return{...b,api:{...b.api,...await apiLoad()}};}
export const bombSpatialApi=api=>({...api,replayRevisedRoute:(l,d)=>{
 const canonical=api.replayRevisedRoute(projection(l),d);if(!canonical.valid)return canonical;
 const m=new api.PuzzleModel(structuredClone(l));m.startCountdown();
 for(const drag of d){m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());}
 const {moves,...state}=m.snapshot();return{...canonical,finalStateKey:JSON.stringify(state)};
}});
export function auditDraft(data,api){
 ruleGate();const l=data.level,b=baseline().levels[l.id-1],t=TARGETS[l.id];assert(t);const mutable=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(l),...Object.keys(b.level)]))if(!mutable.has(k))assert.deepEqual(l[k],b.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(l),b.geometry);assert.deepEqual(api.levelStarTargets(l),b.starTargets);assert.equal(l.difficulty,t.difficulty);api.validateLevel(l);
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 assert.deepEqual(api.auditRevisedCandidate(l).issues.filter(i=>!omit.has(i.code)),[]);
 const opening=auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden=auditHiddenCoverage(l),spans=auditGateSpanLimits(l),queue=auditGeneratorQueueColors(l),art=api.auditCandidateBlockArt(l);
 for(const r of[opening,hidden,spans,queue,art])assert(r.passed,JSON.stringify(r));
 assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));assert(!isGlobalIsometry(b.level,l));
 return{passed:true,opening,hidden,spans,queue,art,facts:measureDesignFacts(l,api)};
}
export const mechanismInventory=l=>({bombs:l.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>b.timedBombSeconds).sort((a,b)=>a-b),ice:l.blocks.filter(b=>b.frozen!==undefined).map(b=>b.frozen).sort((a,b)=>a-b),shells:l.blocks.filter(b=>b.layers?.length>1).length,keys:l.blocks.filter(b=>b.keyId).length,locks:l.blocks.filter(b=>b.lockedBy).map(b=>b.lockCount??1).sort((a,b)=>a-b),covers:(l.shutters??[]).map(s=>s.count).sort((a,b)=>a-b),generators:(l.generators??[]).map(g=>g.queueBlockIds.length).sort((a,b)=>a-b),gates:l.gates.map(g=>({color:g.color,frozen:g.frozen??0})).sort((a,b)=>a.color.localeCompare(b.color))});
export async function checkCandidate(data,_baseline,api){
 const l=data.level,t=TARGETS[l.id],audit=auditDraft(data,api);assert(data.sourceReview?.passed,'Frame-reviewed source contract required');
 const sourceBindings=data.sourceReview.bindings;assert(sourceBindings&&Object.keys(sourceBindings).length);for(const[p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Source drift ${p}`);
 assert.deepEqual(mechanismInventory(l),data.sourceReview.expectedInventory,'Reviewed physical mechanism inventory');
 const spatial=projection(l),replay=api.replayRevisedRoute(spatial,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=t.min&&replay.nonClearingDrags<=t.max);
 const timed=l.blocks.some(b=>b.timedBombSeconds)?replayBomb(l,data.drags,api,true):null;if(timed)assert(timed.valid&&timed.complete,JSON.stringify(timed));
 // Lv126's complete946,152-state graph was independently exhausted by both
 // native and original JS provers. Allow one bounded90s fresh JS verification.
 const budgets={floor:t.min,maxStates:2000000,maxMilliseconds:l.id===126?90000:60000};
 const proof=l.id===127?check127Floor(l,api,budgets):l.id===129?check129Floor(l,api,budgets):l.generators?.length?await checkAdvancedFloor(l,budgets):l.blocks.some(b=>b.keyId||b.lockedBy)?searchSpatial(spatial,api,{...budgets,prove:true}):checkSymmetryFloor(spatial,budgets);
 if(l.id===127){const projectionCheck=verify127RouteProjection(l,data.drags,api);assert(projectionCheck.valid,JSON.stringify(projectionCheck));}
 if(l.id===129){const projectionCheck=verify129RouteProjection(l,data.drags,api);assert(projectionCheck.valid,JSON.stringify(projectionCheck));}
 assert(proof.thresholdProven,JSON.stringify(proof));const measurements=measureRoute(spatial,data.drags,api);
 return{id:l.id,ruleVersion:ruleGate().activeVersion,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source:{sourceBindings,review:data.sourceReview},replay,timed,proof,measurements,lowerBound:t.min,upperBound:replay.nonClearingDrags,pointerValidated:false,naturalClockValidated:false,humanBlindTested:false,adoptionReady:false};
}
