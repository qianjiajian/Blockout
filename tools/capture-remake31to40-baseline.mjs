// Immutable task-start snapshot; never re-label old data as a new certificate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi,geometry} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.28.0');
const {api,inputs}=await loadApi(),scope=Array.from({length:10},(_,i)=>31+i);
assert.equal(api.LEVELS.length,200);
const levels=JSON.parse(JSON.stringify(api.LEVELS)).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
const result={schemaVersion:1,ruleVersion:'1.28.0',runtimeProfile:'revised-2026-09-23-v1.4',createdAt:new Date().toISOString(),scope,levels,lock,
  campaignSha256:digest(levels.map(r=>r.level)),other190Sha256:digest(levels.filter(r=>!scope.includes(r.level.id)).map(r=>r.level)),
  inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
const folder='deliverables/remake31-40-rhythm-20260924',file=folder+'/baseline.json';
fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,campaignSha256:result.campaignSha256,other190Sha256:result.other190Sha256}));
