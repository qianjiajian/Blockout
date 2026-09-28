// Isolated v1.46 batch preflight. Never adopts levels or rewrites old evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {assertBaseline as assertCampaignBaseline,BASELINE as CAMPAIGN_BASELINE} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {verifyDecisions} from './review-remake31to40-decisions.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {verifyLocalMechanismChoices} from './remake21to30-v139.mjs';
import {validate186Source,verify186Mechanisms} from '../deliverables/remake181-190-v146-20260924/source186-190/validate186.mjs';
import {validate183Source,verify183Mechanisms} from '../deliverables/remake181-190-v146-20260924/proof-support/183/verify183.mjs';
import {check183Floor} from '../deliverables/remake181-190-v146-20260924/source183/axis-relaxation.mjs';
import {validate181Source,verify181Mechanisms} from '../deliverables/remake181-190-v146-20260924/source181-185/validate181.mjs';
import {validate184Source,verify184RouteMechanisms,verify184Decisions,verify184BoundFloor} from '../deliverables/remake181-190-v146-20260924/source184/validate184.mjs';
import {validate189Source} from '../deliverables/remake181-190-v146-20260924/source184/validate189-source.mjs';
import {verify189Mechanisms} from '../deliverables/remake181-190-v146-20260924/proof-support/189/validate189-mechanisms.mjs';
import {validate188Source,verify188Mechanisms} from '../deliverables/remake181-190-v146-20260924/source186-190/validate188.mjs';
import {verify188BoundFloor} from '../deliverables/remake181-190-v146-20260924/source186-190/verify188-bound-floor.mjs';

export const ROOT='deliverables/remake181-190-v146-20260924';
export const OUTPUT=ROOT,VERSION='1.47.0';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>181+i));
export const BASELINE=ROOT+'/baseline.json';
export const TRUTH='deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json';
const writeNew=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
const binding=file=>({path:file,sha256:digest(fs.readFileSync(file))});
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,VERSION);return lock;}
export {loadApi};
export function staticChecks(level,api){
 const model=new api.PuzzleModel(level),orientation=level.blocks.map(b=>({id:b.id,stage:b.shutterId??(level.generators??[]).find(g=>g.queueBlockIds.includes(b.id))?.id??'opening',native:api.matchFormalBlockShape(b.shape,'native-only'),legacy:api.matchFormalBlockShape(b.shape)}));
 return {opening:auditOpeningCoverage(model.snapshot()),hidden:auditHiddenCoverage(level),queue:auditGeneratorQueueColors(level),gateSpans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),
  nativeOnly:{passed:orientation.every(r=>r.native?.quarterTurns===0),unsupported:orientation.filter(r=>!r.native||r.native.quarterTurns!==0)},facts:measureDesignFacts(level,api)};
}
export function checkCandidate(data,baseline,api){
 ruleGate();const {level,drags}=data,id=level.id;assert([181,183,184,186,187,188,189,190].includes(id),'Only explicitly implemented source contracts are qualified');
 const old=baseline.levels[id-1],target=baseline.targets.find(t=>t.id===id);
 assert.equal(data.activeRuleVersion,VERSION);assert.equal(level.difficulty,target.difficulty);assert.deepEqual(geometry(level),old.geometry);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
 const mutable=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(old.level),...Object.keys(level)]))if(!mutable.has(k))assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
 api.validateLevel(level);assert(!level.coloredGrids?.length,'Colored grids remain locked before200');
 const audit=staticChecks(level,api);for(const k of ['opening','hidden','queue','gateSpans','art','nativeOnly'])assert(audit[k].passed,JSON.stringify(audit[k]));
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 assert.deepEqual(api.auditRevisedCandidate(level,undefined).issues.filter(i=>!omit.has(i.code)),[]);
 assert(!isGlobalIsometry(old.level,level),'Must be a new layout');
 if(id===187){
  const p='.codex-temp/remaining98-v111/late/source-review-187.json',source=JSON.parse(fs.readFileSync(p));for(const[file,b]of Object.entries(source.bindings))assert.equal(digest(fs.readFileSync(file)),b.sha256.toLowerCase());
  assert.equal(level.blocks.length,21);assert.equal(source.sourceOpeningPieces.length,21);
  for(const s of source.sourceOpeningPieces){const b=level.blocks.find(b=>b.id==='r146-187-'+s.id);assert(b,s.id);assert.equal(b.color,s.id.match(/^[a-z]+/)[0]);assert.equal(b.shape.length,s.shape.length);assert(!b.layers&&!b.frozen&&!b.movementAxis&&!b.keyId&&!b.lockedBy&&!b.star&&!b.timedBombSeconds);}
  assert.equal(audit.facts.mechanisms.exits.ordinaryCount,1);assert.equal(audit.facts.mechanisms.exits.frozenCount,5);
  for(const [color,count]of [['yellow',0],['cyan',1],['blue',1],['purple',5],['red',5],['green',5]])assert.equal(level.gates.find(g=>g.color===color)?.frozen??0,count);
  assert(!(level.shutters?.length||level.generators?.length||level.flipDoors?.length||level.coloredGrids?.length||level.elevators?.length||level.conveyors?.length));
 }
 assert(data.seed&&data.design?.primaryMechanism&&data.design?.concreteDecision);
 const sourceReview=id===181?validate181Source(data,baseline,api):id===184?validate184Source(data,baseline,api):id===188?validate188Source(data,baseline,api):id===189?validate189Source(data,baseline,api):id===186?validate186Source(data,baseline,api):id===183?validate183Source(data,api):null,advanced=id===181?verify181Mechanisms(data,api):id===184?{...verify184BoundFloor(data),mechanisms:verify184RouteMechanisms(data,api),decisions:verify184Decisions(data,api)}:id===188?{...verify188BoundFloor(data),mechanisms:verify188Mechanisms(data,api)}:id===189?{mechanisms:verify189Mechanisms(data,api)}:id===186?verify186Mechanisms(data,api):id===183?{proof:check183Floor(data,api),mechanisms:verify183Mechanisms(data,api)}:null;
 const replay=id===181?advanced.replay:api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=target.range[0]&&replay.nonClearingDrags<=target.range[1]);
 const measurement=measureRoute(level,drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);
 const proof=advanced?.proof??checkSymmetryFloor(level,{floor:target.range[0],maxStates:2000000,maxMilliseconds:180000});assert(proof.thresholdProven,JSON.stringify(proof));
 const decisions=id===181||id===184?advanced.decisions:id===188?advanced.mechanisms.decisionCases:verifyDecisions(data,api),localMechanismChoices=id===190?verifyLocalMechanismChoices(data,api):null,clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 return {activeRuleVersion:VERSION,id,checkedAt:new Date().toISOString(),levelSha256:digest(level),routeSha256:digest(drags),audit,replay,measurement,proof,decisions,sourceReview,mechanismReview:advanced?.mechanisms,projection:advanced?.projection,localMechanismChoices,lowerBound:target.range[0],upperBound:replay.nonClearingDrags,starAssessment:{preserved:old.starTargets,clearLoad,guaranteedMinimumDrags:clearLoad+target.range[0],moveTargetImpossible:clearLoad+target.range[0]>old.starTargets.moveTarget},pointerValidated:false,humanBlindTested:false,released:false};
}
export async function capture(){
 const lock=ruleGate(),{api,inputs}=await loadApi(),original=assertCampaignBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE)));
 for(const id of IDS)assert.equal(digest(api.LEVELS[id-1]),original.levels[id-1].sha256,`Concurrent batch change at ${id}`);
 assert.equal(digest(api.LEVELS.slice(0,30)),original.protected1to30Sha256);
 const baseline={schemaVersion:1,activeRuleVersion:lock.activeVersion,designContract:'1.45.0',createdAt:new Date().toISOString(),scope:IDS,
  originalCampaignBinding:binding(CAMPAIGN_BASELINE),campaignSha256:digest(api.LEVELS),protected1to30Sha256:digest(api.LEVELS.slice(0,30)),
  outsideBatchSha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),levels:api.LEVELS.map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)})),
  targets:campaignCadence().rows.filter(r=>IDS.includes(r.id)),source:binding(TRUTH),inputs:Object.fromEntries([...new Set([...inputs,'tools/remake181to190-v146.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.46.0.md'])].map(p=>[p,digest(fs.readFileSync(p))]))};
 if(fs.existsSync(BASELINE)){
  const previous=JSON.parse(fs.readFileSync(BASELINE));
  assert.deepEqual(previous.scope,IDS);for(const id of IDS)assert.equal(previous.levels[id-1].sha256,baseline.levels[id-1].sha256);
  return {created:false,file:BASELINE};
 }
 writeNew(BASELINE,baseline);return {created:true,file:BASELINE,campaignSha256:baseline.campaignSha256};
}
export async function preflight(){
 ruleGate();const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE)),truth=JSON.parse(fs.readFileSync(TRUTH));
 const rows=IDS.map(id=>{const level=api.LEVELS[id-1],source=truth.levels.find(r=>r.level===id);assert.equal(digest(level),baseline.levels[id-1].sha256,`Current batch drift ${id}`);
  return {id,target:baseline.targets.find(r=>r.id===id),levelSha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level),
   currentFormalAudit:staticChecks(level,api),source:{composition:source.composition,mechanisms:source.mechanisms,provenance:source.provenance,requiredGaps:source.required_exact_fields_missing??[],otherUnclear:source.source_unclear_fields??[]},
   status:'not-remade',completeRouteValidated:false,lowerBoundValidated:false,pointerValidated:false,formalAdoption:false};});
 const output=ROOT+'/preflight-'+Date.now()+'.json';writeNew(output,{createdAt:new Date().toISOString(),activeRuleVersion:'1.46.0',scope:IDS,baseline:binding(BASELINE),source:binding(TRUTH),
  inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),rows,generatedLevels:0,adoptedLevels:0,released:false});
 return {file:output,rows:rows.map(r=>({id:r.id,difficulty:r.target.difficulty,opening:r.currentFormalAudit.opening.passed,hidden:r.currentFormalAudit.hidden.passed,queue:r.currentFormalAudit.queue.passed,native:r.currentFormalAudit.nativeOnly.passed,sourceGaps:r.source.requiredGaps.length,status:r.status}))};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const mode=process.argv[2];if(mode==='capture')console.log(JSON.stringify(await capture()));else if(mode==='preflight')console.log(JSON.stringify(await preflight()));else throw Error('Usage: capture | preflight');
}
