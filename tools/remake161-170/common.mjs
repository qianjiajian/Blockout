import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {BASELINE as ORIGINAL,assertBaseline} from '../campaign31-200-baseline-v145.mjs';
import {campaignCadence} from '../campaign31-200-plan-v145.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from '../layout-originality-v140.mjs';
export {loadApi,geometry,digest};
export const ROOT='deliverables/remake161-170-20260927';
export const BASELINE=ROOT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>161+i));
export const PROFILE='revised-2026-09-27-v1.5';
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,r])));
export const writeNew=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert(l.verified.some(r=>r.version==='1.103.0'),'161–170 authorization must remain locked');return l;}
export const original=()=>assertBaseline(JSON.parse(fs.readFileSync(ORIGINAL)));
// v1.5 only changes frozen flip timing. Authored region membership, dimensions,
// queue membership and block footprints remain identical to v1.4. The legacy
// coverage checker only uses the profile to recognize revised lift regions.
// This labeled copy is a static coverage adapter, never a gameplay/proof model.
export function auditHiddenV15(level){
 assert.equal(level.mechanismRules,PROFILE);
 const copy=structuredClone(level);copy.mechanismRules='revised-2026-09-23-v1.4';
 const result=auditHiddenCoverage(copy);
 return {...result,sourceProfile:PROFILE,coverageProfile:copy.mechanismRules,levelSha256:digest(level),adapter:'unchanged authored region footprint semantics; no runtime or difficulty claim'};
}
export function readBaseline(){const b=JSON.parse(fs.readFileSync(BASELINE));assert.deepEqual(b.scope,IDS);assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);for(const r of b.levels)assert.equal(digest(r.level),r.sha256);return b;}
export async function capture(){
 const lock=ruleGate(),old=original(),{api,inputs}=await loadApi();
 const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
 for(const id of IDS){const r=levels[id-1],b=old.levels[id-1];assert.deepEqual(r.geometry,b.geometry);assert.deepEqual(r.starTargets,b.starTargets);for(const k of ['id','name','timeSeconds','reward'])assert.deepEqual(r.level[k],b.level[k]);}
 const b={createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,scope:IDS,levels,campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),targets:TARGETS,inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),sourceAudit:'deliverables/remake161-170-v146-20260924/source-audit/SOURCE-REVIEW.md'};
 writeNew(BASELINE,b);return b;
}
export function auditSpatial(level,api){
 ruleGate();const b=original().levels[level.id-1],t=TARGETS[level.id];assert(t);assert.equal(level.mechanismRules,PROFILE);assert.equal(level.difficulty,t.difficulty);
 const mutable=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','difficulty','mechanismRules','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(level),...Object.keys(b.level)]))if(!mutable.has(k))assert.deepEqual(level[k],b.level[k],`Preserve ${k}`);
 assert.deepEqual(geometry(level),b.geometry);assert.deepEqual(api.levelStarTargets(level),b.starTargets);assert(!level.coloredGrids?.length);
 api.validateLevel(level);
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 assert.deepEqual(api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code)),[]);
 assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),'q0 whole art');
 for(const b of level.blocks.filter(b=>b.movementAxis))assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))),'Axis rectangle');
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenV15(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),art:api.auditCandidateBlockArt(level)};
 for(const [key,value]of Object.entries(checks))assert(value.passed,key+': '+JSON.stringify(value));assert(!isGlobalIsometry(b.level,level),'Original layout');
 return {passed:true,levelSha256:digest(level),target:t,checks,sourceValidated:false,routeValidated:false,lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [mode,...files]=process.argv.slice(2);if(mode==='capture'){const b=await capture();console.log(JSON.stringify({baseline:BASELINE,campaignSha256:b.campaignSha256,targets:IDS.map(id=>({id,difficulty:TARGETS[id].difficulty,range:TARGETS[id].range,profile:b.levels[id-1].level.mechanismRules}))}));}
 else if(mode==='spatial'){const{api}=await loadApi();for(const file of files){const d=JSON.parse(fs.readFileSync(file));console.log(JSON.stringify(auditSpatial(d.level??d,api)));}}
 else throw Error('capture | spatial files');
}
