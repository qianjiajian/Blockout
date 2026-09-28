import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {assertBaseline as assertCampaign,BASELINE as CAMPAIGN_BASELINE} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence,SOURCE_FILES} from './campaign31-200-plan-v145.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';

export {loadApi,geometry,digest};
export const OUTPUT='deliverables/remake91-100-v146-20260924';
export const BASELINE=OUTPUT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>91+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,r])));
export function ruleGate(){const r=verifyRulesLock();assert(r.ok,r.errors.join('\n'));assert(['1.46.0','1.47.0','1.50.0','1.51.0'].includes(r.activeVersion),'Only reviewed v1.46, v1.47, v1.50, or current inherited v1.51 qualified');return r;}
export function writeNew(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export function assertBaseline(b){
 assert.equal(b.ruleVersion,'1.46.0');assert.deepEqual(b.scope,IDS);
 assert.equal(b.campaignSha256,'e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb','Batch baseline must remain the immutable v1.45 design campaign');
 assert.equal(b.levels.length,200);assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
 for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}
 return b;
}
export async function capture(){
 ruleGate();const campaign=assertCampaign(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE))),{api,inputs}=await loadApi();
 for(const id of [...Array.from({length:30},(_,i)=>i+1),...IDS])assert.equal(digest(api.LEVELS[id-1]),campaign.levels[id-1].sha256,`Protected initial level ${id}`);
 if(fs.existsSync(BASELINE))return assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
 const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
 const b={ruleVersion:'1.46.0',createdAt:new Date().toISOString(),scope:IDS,levels,campaignSha256:digest(api.LEVELS),
  other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),protected1to30Sha256:digest(api.LEVELS.slice(0,30)),
  parentBaseline:{file:CAMPAIGN_BASELINE,sha256:digest(fs.readFileSync(CAMPAIGN_BASELINE))},
  inputs:Object.fromEntries([...new Set([...inputs,SOURCE_FILES[0],'docs/rules/manifest.json','docs/mechanism-rules-v1.46.0.md'])].map(p=>[p,digest(fs.readFileSync(p))]))};
 assertBaseline(b);writeNew(BASELINE,b);return b;
}
export function auditSpatial(level,api){
 api.validateLevel(level);
 const legacy=api.auditRevisedCandidate(level,undefined),sourceOnly=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
 const issues=legacy.issues.filter(i=>!(i.category==='source'&&sourceOnly.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),spans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
 const nonNative=level.blocks.filter(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns!==0).map(b=>b.id);
 return {passed:issues.length===0&&nonNative.length===0&&Object.values(checks).every(c=>c.passed),issues,nonNative,...checks};
}
export function assertProtected(level,b,api){
 const old=b.levels[level.id-1];assert(IDS.includes(level.id));assert.deepEqual(geometry(level),old.geometry);
 for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
 assert.deepEqual(old.starTargets,api.levelStarTargets(old.level));assert.deepEqual(api.levelStarTargets(level),old.starTargets);assert.equal(level.difficulty,TARGETS[level.id].difficulty);
 assert(!level.flipDoors?.length&&!level.coloredGrids?.length&&!level.elevators?.length&&!level.conveyors?.length);
 assert(!level.blocks.some(b=>b.timedBombSeconds!==undefined||b.rotationBadge));
 if(level.id<100)assert(!level.blocks.some(b=>b.star)&&!level.gates.some(g=>g.star));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 ruleGate();const [mode,...files]=process.argv.slice(2);
 if(mode==='capture'){const b=await capture();console.log(JSON.stringify({path:BASELINE,sha256:b.campaignSha256,targets:TARGETS}));}
 else if(mode==='audit'){
  const {api}=await loadApi(),b=assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
  for(const f of files){const d=JSON.parse(fs.readFileSync(f)),l=d.level??d;assertProtected(l,b,api);const r=auditSpatial(l,api);console.log(JSON.stringify({file:f,id:l.id,...r}));if(!r.passed)process.exitCode=1;}
 }else throw Error('Usage: capture | audit FILES');
}
