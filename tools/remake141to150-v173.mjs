import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi as loadBase,geometry} from './native-block-repair-v143.mjs';
import {apiLoad,projection} from './remake121to130-bomb-replay-v172.mjs';
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
import {checkAxisFloor} from './remake131to140-axis-floor-v172.mjs';
import {searchSpatial} from './remake111to120-spatial-floor-v147.mjs';
import {projectAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {check141Floor,verify141Prefix} from './campaign-v145/lv141-150/round2-root/floor141.mjs';
import {check143Floor,verify143Prefix} from './campaign-v145/lv141-150/round2-root/floor143.mjs';
import {check147Floor} from './campaign-v145/lv141-150/round2-root/floor147.mjs';
import {check145Floor} from './campaign-v145/lv141-150/round2-root/floor145.mjs';
import {checkNativePrunedFloor} from './campaign-v145/lv141-150/round2-c/native96.mjs';
import {checkNativeStars} from './campaign-v145/lv141-150/round2-c/assist146/native-stars.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {verifyAcceptedSourceDesign} from './remake141to150-source-acceptance-v174.mjs';
export {BASELINE,projection};
export const OUTPUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';
export const VERSION='1.74.0',IDS=Array.from({length:10},(_,i)=>141+i);
export const TARGETS=Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,{difficulty:r.difficulty,min:r.range[0],max:r.range[1]}]));
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert.equal(l.activeVersion,VERSION);return l;}
export const baseline=()=>assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
export async function loadApi(){const b=await loadBase();return {...b,api:{...b.api,...await apiLoad()}};}
export const bombSpatialApi=api=>({...api,replayRevisedRoute:(l,d)=>{
 const r=api.replayRevisedRoute(projection(l),d);if(!r.valid)return r;
 const m=new api.PuzzleModel(structuredClone(l));m.startCountdown();
 for(const drag of d){m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());}
 const {moves,...state}=m.snapshot();return {...r,finalStateKey:JSON.stringify(state)};
}});
export function auditDraft(data,api){
 ruleGate();const l=data.level,b=baseline().levels[l.id-1],t=TARGETS[l.id];assert(t);
 const mutable=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(l),...Object.keys(b.level)]))if(!mutable.has(k))assert.deepEqual(l[k],b.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(l),b.geometry);assert.deepEqual(api.levelStarTargets(l),b.starTargets);assert.equal(l.difficulty,t.difficulty);api.validateLevel(l);
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 assert.deepEqual(api.auditRevisedCandidate(l).issues.filter(i=>!omit.has(i.code)),[]);
 const opening=auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden=auditHiddenCoverage(l),spans=auditGateSpanLimits(l),queue=auditGeneratorQueueColors(l),art=api.auditCandidateBlockArt(l);
 for(const r of [opening,hidden,spans,queue,art])assert(r.passed,JSON.stringify(r));
 assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
 for(const b of l.blocks.filter(b=>b.movementAxis))assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))));
 assert(!isGlobalIsometry(b.level,l));return {passed:true,opening,hidden,spans,queue,art,facts:measureDesignFacts(l,api)};
}
const sorted=a=>a.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
export const mechanismInventory=l=>({
 bodies:l.blocks.length,shells:l.blocks.filter(b=>b.layers?.length>1).length,
 bombs:sorted(l.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>b.timedBombSeconds)),
 ice:sorted(l.blocks.filter(b=>b.frozen!==undefined).map(b=>b.frozen)),
 axes:sorted(l.blocks.filter(b=>b.movementAxis).map(b=>b.movementAxis)),stars:l.blocks.filter(b=>b.star).length,
 keys:sorted(l.blocks.filter(b=>b.keyId).map(b=>b.keyId)),locks:sorted(l.blocks.filter(b=>b.lockedBy).map(b=>({key:b.lockedBy,count:b.lockCount??1}))),
 covers:sorted((l.shutters??[]).map(s=>({skin:s.skin??'shutter',count:s.count}))),
 generators:sorted((l.generators??[]).map(g=>g.queueBlockIds.length)),
 gates:sorted(l.gates.map(g=>({color:g.color,frozen:g.frozen??0,star:!!g.star}))),
 flips:sorted((l.flipDoors??[]).map(g=>({color:g.color,frozen:g.frozen??0,initiallyOpen:g.initiallyOpen}))),
});
export async function checkCandidate(data,_baseline,api){
 assert(data.sourceReview?.passed,'Current source review required');verifyAcceptedSourceDesign(data);return checkPlayableCandidate(data,_baseline,api);
}
// Diagnostic input runs may exercise a concrete candidate with explicitly
// unresolved source fields. Formal adoption always calls checkCandidate above.
export async function checkPlayableCandidate(data,_baseline,api){
 const l=data.level,t=TARGETS[l.id],audit=auditDraft(data,api);assert(data.sourceReview);
 const sourceBindings=data.sourceReview.bindings;assert(sourceBindings&&Object.keys(sourceBindings).length);
 for(const[p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Source drift ${p}`);
 assert.deepEqual(mechanismInventory(l),data.sourceReview.expectedInventory,'Reviewed mechanism inventory');
 const spatial=projection(l),replay=api.replayRevisedRoute(spatial,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=t.min&&replay.nonClearingDrags<=t.max);
 const budget={floor:t.min,maxStates:2000000,maxMilliseconds:60000};
 if([146,148].includes(l.id)){const q=data.proofQualification;assert(q);assert.equal(digest(fs.readFileSync(q.file)),q.sha256);for(const[p,h]of Object.entries(q.bindings))assert.equal(digest(fs.readFileSync(p)),h,`Proof implementation drift ${p}`);}
 const proof=l.id===141?check141Floor(l,api,budget):l.id===143?check143Floor(l,api,budget):l.id===144?searchSpatial(spatial,api,{...budget,prove:true}):l.id===145?check145Floor(l,api,budget):l.id===146?checkNativeStars(spatial,api,{floor:21,maxStates:400000,maxMilliseconds:10000}):l.id===147?check147Floor(spatial,api,budget):l.id===148?checkNativePrunedFloor(spatial,api,{floor:11,maxStates:500000,maxMilliseconds:10000}):l.id===150?checkAxisFloor(projectAdvancedFloor(l,api).level,api,budget):[142,149].includes(l.id)?checkAxisFloor(spatial,api,budget):checkSymmetryFloor(spatial,budget);
 if(l.id===141)verify141Prefix(l,data.drags,api);
 if(l.id===143)verify143Prefix(l,data.drags,api);
 assert(proof.thresholdProven,JSON.stringify(proof));
 const measurements=measureRoute(spatial,data.drags,api);assert(measurements.multiCellDrags>measurements.singleCellDrags,'Multi-cell repositioning must dominate');
 const stars=api.levelStarTargets(l),clearLoad=l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 return {id:l.id,ruleVersion:VERSION,levelSha256:digest(l),routeSha256:digest(data.drags),audit,source:{sourceBindings,review:data.sourceReview},replay,proof,measurements,lowerBound:t.min,upperBound:replay.nonClearingDrags,starAssessment:{preservedTargets:stars,clearLoad,minimumDrags:clearLoad+t.min,moveTargetImpossible:clearLoad+t.min>stars.moveTarget,witnessWithinMoveTarget:data.drags.length<=stars.moveTarget},pointerValidated:false,naturalClockValidated:false,humanBlindTested:false,adoptionReady:false};
}
