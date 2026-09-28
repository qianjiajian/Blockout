// Immutable campaign input for independent ten-level authors; never edits production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';

export const OUTPUT='deliverables/remake31-200-v145-20260924';
export const BASELINE=OUTPUT+'/baseline.json';
export const BASELINE_CAMPAIGN_SHA='e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb';
export const IDS=Object.freeze(Array.from({length:170},(_,i)=>31+i));
export const BATCHES=Object.freeze(Array.from({length:17},(_,i)=>Object.freeze({first:31+10*i,last:40+10*i})));
export function assertBaseline(b){
  assert.equal(b.designVersion,'1.45.0');
  assert.equal(b.campaignSha256,BASELINE_CAMPAIGN_SHA,'Do not silently recapture a changed campaign');
  assert.deepEqual(b.scope,IDS);
  assert.equal(b.levels.length,200);
  assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
  assert.equal(digest(b.levels.slice(0,30).map(r=>r.level)),b.protected1to30Sha256);
  for(const row of b.levels){assert.equal(digest(row.level),row.sha256);assert.deepEqual(geometry(row.level),row.geometry);}
  return b;
}
export async function capture(){
  const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.46.0');
  const {api,inputs}=await loadApi();
  assert.equal(digest(api.LEVELS),BASELINE_CAMPAIGN_SHA,'Concurrent changes must be reviewed, not overwritten');
  if(fs.existsSync(BASELINE)){
    const b=assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));
    for(const row of b.levels)assert.deepEqual(api.levelStarTargets(row.level),row.starTargets);
    return {path:BASELINE,created:false,campaignSha256:b.campaignSha256};
  }
  const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
  const files=[...new Set([...inputs,'tools/campaign31-200-baseline-v145.mjs','docs/rules/manifest.json','docs/mechanism-rules-v1.45.0.md','docs/mechanism-rules-v1.46.0.md'])];
  const b={schemaVersion:1,designVersion:'1.45.0',activeRuleVersion:lock.activeVersion,createdAt:new Date().toISOString(),scope:IDS,levels,
    campaignSha256:digest(api.LEVELS),protected1to30Sha256:digest(api.LEVELS.slice(0,30)),
    inputs:Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))])),generatedLevels:0,formalAdoptions:0};
  assertBaseline(b);fs.mkdirSync(path.dirname(BASELINE),{recursive:true});fs.writeFileSync(BASELINE,JSON.stringify(b,null,2)+'\n',{flag:'wx'});
  return {path:BASELINE,created:true,campaignSha256:b.campaignSha256};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const mode=process.argv[2];
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='check'){assertBaseline(JSON.parse(fs.readFileSync(BASELINE)));console.log('PASS immutable 31–200 baseline');}
  else throw Error('Usage: capture | check');
}
