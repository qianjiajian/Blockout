import fs from 'node:fs';import path from 'node:path';
import {witness} from './design-witness.mjs';import {runStaticNative} from './design-native.mjs';
import {relaxedClearClosure} from './source-design-relaxed-closure.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';import assert from 'node:assert/strict';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const folder=process.argv[2],out='deliverables/lv11-remake-20260927/source-design-witness-'+Date.now();fs.mkdirSync(out,{recursive:true});
const candidates=fs.readdirSync(folder).filter(f=>/^attempt-.*\.json$/.test(f)).map(f=>({f:path.join(folder,f),raw:JSON.parse(fs.readFileSync(path.join(folder,f)))})).filter(v=>v.raw.native?.status==='unknown');
const triage=candidates.map(v=>({...v,closure:relaxedClearClosure(v.raw.level)}));
fs.writeFileSync(path.join(out,'triage.json'),JSON.stringify(triage.map(v=>({file:v.f,closure:v.closure})),null,2),{flag:'wx'});
const inputs=triage.filter(v=>v.closure.all);console.log(JSON.stringify({out,unknowns:candidates.length,eligible:inputs.length}));
inputs.sort((a,b)=>(b.raw.native.discoveredStates??0)-(a.raw.native.discoveredStates??0));const rows=[];
for(const[i,{f,raw}]of inputs.slice(0,Number(process.argv[3]??60)).entries()){
 const result=witness(raw.level,{maxCost:20,maxStates:100000,maxMilliseconds:2200,weight:30}),drags=result.drags??[],nc=drags.filter(d=>!d.exitSide),multi=nc.filter(d=>raw.level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
 const lower=result.cost>=16?runStaticNative(raw.level,{artifactRoot:out,maxMilliseconds:1500,maxStates:1000000,floor:16}):null;
 const target=path.join(out,'route-'+i+'.json');fs.writeFileSync(target,JSON.stringify({source:f,level:raw.level,result,drags,multi,single:nc.length-multi,lower,screeningOnly:true},null,2),{flag:'wx'});
 const row={target,status:result.status,cost:result.cost,multi,single:nc.length-multi,bestClears:result.bestClears,lower:lower?.status};rows.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({out,rows,total:inputs.length},null,2));if(lower?.thresholdProven&&multi>nc.length-multi)break;
}
