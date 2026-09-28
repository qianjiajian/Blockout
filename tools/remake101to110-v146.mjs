// Isolated ten-level workspace. This tool never adopts or edits a formal level.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {assertBaseline as assertCampaignBaseline,BASELINE as CAMPAIGN_BASELINE} from './campaign31-200-baseline-v145.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {checkAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export {loadApi,geometry,digest};
export const ROOT='deliverables/remake101-110-v146-20260924';
export const OUTPUT=ROOT;
export const BASELINE=ROOT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>101+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,r])));
export const save=(file,data)=>{assert(path.resolve(file).startsWith(path.resolve(ROOT)+path.sep));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.46.0','1.47.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0','1.56.0','1.57.0'].includes(lock.activeVersion),'Only reviewed rule versions through v1.57 are permitted');return lock;}
export function baseline(){const b=JSON.parse(fs.readFileSync(BASELINE));assert.equal(b.ruleVersion,'1.46.0');assert.deepEqual(b.scope,IDS);assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other190Sha256);for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}return b;}
export async function capture(){
 ruleGate();const {api,inputs}=await loadApi(),campaign=assertCampaignBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE)));
 for(const id of IDS){assert.deepEqual(api.LEVELS[id-1],campaign.levels[id-1].level,'Review concurrent edits before capturing '+id);assert.deepEqual(api.levelStarTargets(api.LEVELS[id-1]),campaign.levels[id-1].starTargets);}
 if(fs.existsSync(BASELINE))return {path:BASELINE,created:false,sha256:baseline().campaignSha256};
 const levels=structuredClone(api.LEVELS).map(level=>({level,geometry:geometry(level),sha256:digest(level),starTargets:api.levelStarTargets(level)}));
 const files=[...new Set([...inputs,'tools/remake101to110-v146.mjs','tools/campaign31-200-plan-v145.mjs',CAMPAIGN_BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.46.0.md'])];
 save(BASELINE,{schemaVersion:1,ruleVersion:'1.46.0',generationContract:'1.45.0',scope:IDS,createdAt:new Date().toISOString(),campaignBaselineSha256:digest(fs.readFileSync(CAMPAIGN_BASELINE)),levels,targets:TARGETS,campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),protected1to30Sha256:digest(api.LEVELS.slice(0,30)),inputs:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))});
 return {path:BASELINE,created:true,sha256:baseline().campaignSha256};
}
const SOURCE_ONLY=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
export function auditSpatial(level,api,b=baseline()){
 assert(IDS.includes(level.id));const old=b.levels[level.id-1],target=TARGETS[level.id];
 const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
 for(const k of new Set([...Object.keys(old.level),...Object.keys(level)]))if(!mutable.has(k))assert.deepEqual(level[k],old.level[k],'Preserve '+k);
 assert.deepEqual(geometry(level),old.geometry);assert.deepEqual(api.levelStarTargets(level),old.starTargets);assert.equal(level.difficulty,target.difficulty);
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');api.validateLevel(level);
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,'Unavailable/legacy mechanism '+k);
 for(const block of level.blocks){assert(block.timedBombSeconds===undefined&&!block.rotationBadge,'Bomb/rotation unavailable');assert(!block.layers||block.layers.length<=2);}
 for(const s of level.shutters??[])assert(s.skin===undefined||['shutter','lift'].includes(s.skin),'Only physical cover/lift');
 const legacy=api.auditRevisedCandidate(level,undefined);const issues=legacy.issues.filter(i=>!(i.category==='source'&&SOURCE_ONLY.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 assert.deepEqual(issues,[],'Spatial/mechanism hard rules');
 const orientation=level.blocks.map(block=>({id:block.id,match:api.matchFormalBlockShape(block.shape,'native-only')}));assert(orientation.every(r=>r.match?.quarterTurns===0),'All complete sprites must be unrotated');
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gateSpans:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),art:api.auditCandidateBlockArt(level)};
 for(const [label,check] of Object.entries(checks))assert(check.passed,label+': '+JSON.stringify(check));
 return {passed:true,geometryPreserved:true,starsPreserved:true,checks,orientation,sourceValidated:false,originalityValidated:false,lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};
}
export function assertProtected(level,b,api){
 const old=b.levels[level.id-1];assert(IDS.includes(level.id));assert.deepEqual(geometry(level),old.geometry);
 for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(level[k],old.level[k],'Preserve '+k);
 assert.deepEqual(api.levelStarTargets(level),old.starTargets);assert.equal(level.difficulty,TARGETS[level.id].difficulty);
}
export async function numericalDiagnostic(data,api,options={}){
 const level=data.level,target=TARGETS[level.id],audit=auditSpatial(level,api),replay=api.replayRevisedRoute(level,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
 const measurement=measureRoute(level,data.drags,api);const proof=await checkAdvancedFloor(level,{floor:target.range[0],maxStates:options.maxStates??100000,maxMilliseconds:options.maxMilliseconds??30000});
 return {activeRuleVersion:ruleGate().activeVersion,levelSha256:digest(level),routeSha256:digest(data.drags),audit,replay,measurement,proof,target,numericalPassed:proof.thresholdProven&&replay.nonClearingDrags<=target.range[1],notJustGlobalIsometry:!isGlobalIsometry(baseline().levels[level.id-1].level,level),sourceValidated:false,mechanismReviewValidated:false,pointerValidated:false,formalAdopted:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [mode,...files]=process.argv.slice(2);ruleGate();
 if(mode==='capture')console.log(JSON.stringify(await capture()));
 else if(mode==='spatial'||mode==='numeric'){
  const {api}=await loadApi();for(const file of files){const data=JSON.parse(fs.readFileSync(file)),result=mode==='spatial'?auditSpatial(data.level,api):await numericalDiagnostic(data,api);const out=save(`${ROOT}/checks/${mode}-${data.level.id}-${Date.now()}.json`,{input:file,inputSha256:digest(fs.readFileSync(file)),...result});console.log(JSON.stringify({out,id:data.level.id,spatial:result.audit?.passed??result.passed,numerical:result.numericalPassed??null}));}
 }else throw Error('Usage: capture | spatial FILES | numeric FILES');
}
