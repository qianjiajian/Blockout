import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {assertBaseline,BASELINE} from '../../campaign31-200-baseline-v145.mjs';
import {campaignCadence} from '../../campaign31-200-plan-v145.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest,measureDesignFacts} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from '../../layout-originality-v140.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {checkUniqueCurtainSumFloor} from '../../remake21to30-unique-suffix-v139.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake61to70-full-generator-floor-v146.mjs';
import {projectGeneratorOpening,verifyGeneratorRouteProjection} from './remake61to70-generator-floor-v146.mjs';
import {loadAdvancedFloorApi} from '../../campaign31-200-advanced-floor-v145.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
export {loadApi,BASELINE,geometry};
export const VERSION='1.46.0',OUTPUT='deliverables/remake31-200-v145-20260924/batches/lv061-070',IDS=Array.from({length:10},(_,i)=>61+i);
export const TARGETS=Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,{difficulty:r.difficulty,min:r.range[0],max:r.range[1],role:r.role}]));
export const writeNew=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});};
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert(['1.46.0','1.47.0'].includes(l.activeVersion));return l;}
export function auditStructure(data,api){
 const baseline=assertBaseline(JSON.parse(fs.readFileSync(BASELINE))),l=data.level,old=baseline.levels[l.id-1],target=TARGETS[l.id];assert(target);
 const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
 for(const key of new Set([...Object.keys(old.level),...Object.keys(l)]))if(!mutable.has(key))assert.deepEqual(l[key],old.level[key],`Preserve ${key}`);
 assert.deepEqual(geometry(l),old.geometry);assert.deepEqual(api.levelStarTargets(l),old.starTargets);assert.equal(l.difficulty,target.difficulty);
 assert.equal(l.mechanismRules,'revised-2026-09-23-v1.4');api.validateLevel(l);
 for(const key of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!(l[key]?.length),`Locked/legacy ${key}`);
 for(const b of l.blocks){assert(!b.star&&!b.rotationBadge&&b.timedBombSeconds===undefined);assert(!b.layers||b.layers.length<=2);}
 assert(l.gates.every(g=>!g.star));for(const s of l.shutters??[])assert((!s.skin||s.skin==='shutter'||s.skin==='lift'&&l.id>=65)&&s.triggerBlockIds===undefined);
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>!omit.has(i.code));assert.deepEqual(issues,[],'Spatial and construction rules');
 const orientation=l.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(orientation.every(r=>r.match?.quarterTurns===0));
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage(l),spans:auditGateSpanLimits(l),art:api.auditCandidateBlockArt(l),queue:auditGeneratorQueueColors(l)};
 for(const check of Object.values(checks))assert(check.passed,JSON.stringify(check));
 assert(!isGlobalIsometry(old.level,l),'Original spatial arrangement required');
 return {passed:true,geometryPreserved:true,starsPreserved:true,orientation,...checks,facts:measureDesignFacts(l,api),sourceAlignmentValidated:false};
}
export async function proveFloor(l,api,options={}){
 const budget={floor:TARGETS[l.id].min,maxStates:options.maxStates??2000000,maxMilliseconds:options.maxMilliseconds??180000};
 const advanced=l.blocks.some(b=>b.keyId||b.lockedBy||b.lockCount)||(l.shutters??[]).some(s=>s.skin==='lift');
 if(advanced){const a=await loadAdvancedFloorApi();return {...a.checkRevisedRepositionFloor(l,budget),sourceLevelSha256:digest(l)};}
 // Deleting only printed axis restrictions adds translations and exits; optional
 // exit contact makes every real gesture still available at no greater cost.
 // Geometry, all cargo, layers, identities, ice and reveal counters remain.
 const p=structuredClone(l),axes=[];for(const b of p.blocks)if(b.movementAxis){axes.push({id:b.id,axis:b.movementAxis});delete b.movementAxis;}
 let proof,projection=null;
 if(p.generators?.length){projection=projectGeneratorOpening(p,api);proof=checkSymmetryFloor(projection.level,budget);
  if(proof.thresholdProven)proof={...proof,abstraction:'opening-visible-no-future-no-countdowns-v146+symmetry',projectedLevelSha256:projection.projectedLevelSha256,projection};
  else proof=checkFullGeneratorFloor(p,api,budget);
 }else{proof=checkUniqueCurtainSumFloor(p,budget);if(proof.status==='unsupported')proof=checkSymmetryFloor(p,budget);}
 return {...proof,sourceLevelSha256:digest(l),axisRelaxation:axes,axisProjectedLevelSha256:digest(p)};
}
export async function checkMechanical(data,api,options={}){
 const audit=auditStructure(data,api),l=data.level,t=TARGETS[l.id],replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=t.min&&replay.nonClearingDrags<=t.max);
 const measurements=measureRoute(l,data.drags,api);assert(measurements.multiCellDrags>measurements.singleCellDrags);
 const proof=await proveFloor(l,api,options);assert(proof.thresholdProven,JSON.stringify(proof));
 let projectionReplay=null;
 if(l.generators?.length){const p=structuredClone(l);for(const b of p.blocks)delete b.movementAxis;projectionReplay=proof.abstraction.startsWith('opening-visible')?verifyGeneratorRouteProjection(p,data.drags,api):verifyFullGeneratorRouteProjection(p,data.drags,api);assert(projectionReplay.valid,projectionReplay.error);}
 const old=JSON.parse(fs.readFileSync(BASELINE)).levels[l.id-1],clearLoad=l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 return {id:l.id,ruleVersion:VERSION,checkedAt:new Date().toISOString(),levelSha256:digest(l),routeSha256:digest(data.drags),target:t,audit,replay,measurements,proof,projectionReplay,lowerBound:t.min,upperBound:replay.nonClearingDrags,starAssessment:{preservedTargets:old.starTargets,clearLoad,guaranteedMinimumDrags:clearLoad+t.min,moveTargetImpossible:clearLoad+t.min>old.starTargets.moveTarget},sourceAlignmentValidated:false,decisionsValidated:false,pointerValidated:false,formalAdopted:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 ruleGate();const[mode,...files]=process.argv.slice(2),{api}=await loadApi();
 for(const file of files){const d=JSON.parse(fs.readFileSync(file));const r=mode==='structure'?auditStructure(d,api):await checkMechanical(d,api);const out=`${OUTPUT}/checks/${d.level.id}-${mode}-${Date.now()}.json`;writeNew(out,r);console.log(JSON.stringify({file,out,status:'mechanical-subgate-pass',L:r.lowerBound,U:r.upperBound}));}
}
