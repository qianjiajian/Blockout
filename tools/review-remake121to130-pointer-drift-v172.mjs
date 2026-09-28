import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {inspectDisjointWiring,inspectScopedAxisChange} from './remake121to130-wiring-drift.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
const p=process.argv[2],old=JSON.parse(fs.readFileSync(p));
assert.equal(old.status,'FAIL');assert(old.error.includes('Non-data or existing wiring change detected'));
assert.deepEqual(old.errors,[]);assert(old.rows.length&&old.rows.every(r=>r.status==='PASS'));
for(const [f,h]of Object.entries(old.bindings))assert.equal(digest(fs.readFileSync(path.join(old.sourceSnapshot,f))),h,`Snapshot ${f}`);
for(const [f,h]of Object.entries(old.sourceBindings))assert.equal(digest(fs.readFileSync(f)),h,`Source ${f}`);
const accepted=[];
for(const[f,h]of Object.entries(old.bindings))if(/^(src\/|public\/assets\/art\/)/.test(f)&&digest(fs.readFileSync(f))!==h){
 const text=fs.readFileSync(path.join(old.sourceSnapshot,f),'utf8');
 if(['src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(f))accepted.push(inspectDisjointWiring(f,old.requestedIds,text));
 else if(f==='src/core/axisRectangularRepairs.ts')accepted.push(inspectScopedAxisChange(f,old.requestedIds,text));
 else if(/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+)\.ts$/.test(f))accepted.push(inspectDisjointData(f,old.requestedIds,text));
 else assert.fail('Unqualified runtime/art change '+f);
}
const report={...old,status:'PASS',originalReport:p,originalReportSha256:digest(fs.readFileSync(p)),originalFailurePreserved:old.error,error:undefined,reviewedAt:new Date().toISOString(),acceptedConcurrentData:accepted,
 supplementalReview:'All four Pointer/timing/native-art rows passed in the byte-verified private snapshot. Independently review the exact concurrent131–140 JSON append, explanatory comment and disjoint pure-data updates; do not rewrite original FAIL. Current whole LEVELS loading is a separate formal gate.'};
const out=path.dirname(p)+'/reviewed-disjoint-drift-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,rows:report.rows.map(r=>({id:r.id,status:r.status})),concurrent:accepted.map(x=>x.file)}));
