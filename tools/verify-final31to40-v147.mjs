import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,checkCandidate,OUTPUT} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const {api,inputs}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/native-remake31to40-v147.json'));
assert.deepEqual(fixture.rows.map(r=>r.id),Array.from({length:10},(_,i)=>31+i));
const bindings=Object.fromEntries([...inputs,'tools/remake31to40-v147.mjs',BASELINE,'docs/rules/manifest.json'].map(p=>[p,digest(fs.readFileSync(p))]));
const rows=[];
for(const row of fixture.rows){
 const manifest=JSON.parse(fs.readFileSync(row.manifestPath)),entry=manifest.rows.find(r=>r.id===row.id),data=JSON.parse(fs.readFileSync(entry.candidatePath));
 assert.equal(digest(fs.readFileSync(entry.candidatePath)),entry.candidateFileSha256);assert.deepEqual(api.LEVELS[row.id-1],data.level);
 const checks=checkCandidate({...data,level:api.LEVELS[row.id-1]},baseline,api);rows.push(checks);
 console.log(JSON.stringify({id:row.id,status:'PASS',L:checks.lowerBound,U:checks.upperBound}));
}
const final=(await loadApi()).api;
for(const row of fixture.rows)assert.deepEqual(final.LEVELS[row.id-1],row.level);
// The immutable baseline is JSON: explicitly undefined optional properties
// are absent there. Compare the same serialization without changing game data.
assert.equal(digest(final.LEVELS.slice(0,30)),digest(baseline.levels.slice(0,30).map(r=>r.level)));
const dataOnly=new Set(['src/core/levels.ts','src/core/remake181to190.ts','src/core/remake71to80.ts']),concurrentOutsideChanges=[];
for(const [p,h]of Object.entries(bindings))if(digest(fs.readFileSync(p))!==h){assert(dataOnly.has(p),`Runtime/validation input drift: ${p}`);concurrentOutsideChanges.push(p);}
const path=`${OUTPUT}/final-ten-verification-${Date.now()}.json`;
fs.writeFileSync(path,JSON.stringify({status:'PASS',ruleVersion:'1.47.0',rows,bindings,concurrentOutsideChanges,protected1to30Unchanged:true,finalLevelsMatched:true,campaignSha256:digest(final.LEVELS),humanBlindTested:false,releaseApproved:false},null,2));
console.log(JSON.stringify({path,status:'PASS',levels:rows.length}));
