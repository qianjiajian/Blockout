import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,geometry} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.41.0');
const {api,inputs}=await loadApi(),scope=Array.from({length:10},(_,i)=>31+i);
const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
assert.equal(levels.length,200);
assert.equal(digest(api.LEVELS),'8921d97b65e425c74aa3c6a612c42e2698b1d09014560438aff9d30adea241f1','Fresh task baseline must match the reviewed current production campaign');
const out='deliverables/remake31-40-v141-20260924/baseline.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,ruleVersion:'1.41.0',createdAt:new Date().toISOString(),scope,levels,lock,
  campaignSha256:digest(api.LEVELS),other190Sha256:digest(api.LEVELS.filter(l=>!scope.includes(l.id))),
  inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),solvabilityValidated:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:out,campaignSha256:digest(api.LEVELS)}));
