import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {BASELINE as CAMPAIGN_BASELINE,assertBaseline} from './campaign31-200-baseline-v145.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
export {loadApi,geometry};
export const ROOT='deliverables/remake161-170-v146-20260924';
export const BASELINE=ROOT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>161+i));
export const TARGETS=Object.freeze(Object.fromEntries(campaignCadence().rows.filter(r=>IDS.includes(r.id)).map(r=>[r.id,r])));
export const writeNew=(file,data)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});};
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.46.0');return lock;}
export function readBaseline(){
 const b=JSON.parse(fs.readFileSync(BASELINE));
 const original=assertBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE)));
 assert.deepEqual(b.scope,IDS);assert.equal(b.ruleVersion,'1.46.0');
 assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
 assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other190Sha256);
 for(const row of b.levels){assert.equal(digest(row.level),row.sha256);if(IDS.includes(row.level.id))assert.deepEqual(row,original.levels[row.level.id-1],'Batch must preserve original campaign inputs');}
 return b;
}
export async function capture(){
 const lock=ruleGate(),original=assertBaseline(JSON.parse(fs.readFileSync(CAMPAIGN_BASELINE))),{api,inputs}=await loadApi();
 if(fs.existsSync(BASELINE))return readBaseline();
 for(const id of IDS)assert.deepEqual(api.LEVELS[id-1],original.levels[id-1].level,'Concurrent target changes must be reviewed');
 const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
 const files=[...new Set([...inputs,'tools/remake161-170-v146.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.46.0.md',CAMPAIGN_BASELINE])];
 const b={schemaVersion:1,ruleVersion:lock.activeVersion,createdAt:new Date().toISOString(),scope:IDS,levels,targets:TARGETS,campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),inputs:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]))};
 writeNew(BASELINE,b);return readBaseline();
}
// Pure geometry/art subgate. It intentionally makes no source, route or difficulty claim.
export function auditSpatial(level,api,b=readBaseline()){
 const target=TARGETS[level.id],old=b.levels[level.id-1];assert(target,'Only 161–170');
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.difficulty,target.difficulty);assert.deepEqual(geometry(level),old.geometry);
 for(const key of ['id','name','timeSeconds','reward'])assert.deepEqual(level[key],old.level[key],`Preserve ${key}`);
 assert.deepEqual(api.levelStarTargets(level),old.starTargets);
 assert(!level.coloredGrids?.length,'Colored grid unlock is 200');
 api.validateLevel(level);
 const native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));
 assert(native.every(r=>r.match?.quarterTurns===0),'Every opening/hidden/cargo body needs whole native orientation art');
 const legacy=api.auditRevisedCandidate(level,undefined);
 const issues=legacy.issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 assert.deepEqual(issues,[],'Hard spatial and mechanism rules');
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),queue:auditGeneratorQueueColors(level)};
 for(const [name,result]of Object.entries(checks))assert(result.passed,name+': '+JSON.stringify(result));
 return {passed:true,levelSha256:digest(level),target,checks,native,sourceValidated:false,routeValidated:false,lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const[mode,...files]=process.argv.slice(2);ruleGate();
 if(mode==='capture'){const b=await capture();console.log(JSON.stringify({baseline:BASELINE,campaignSha256:b.campaignSha256,other190Sha256:b.other190Sha256,targets:TARGETS}));}
 else if(mode==='spatial'){const{api}=await loadApi();for(const file of files){const d=JSON.parse(fs.readFileSync(file));console.log(JSON.stringify(auditSpatial(d.level??d,api)));}}
 else throw Error('Usage: capture | spatial candidate.json ...');
}
