import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertHistoricalIdentity} from './audit-current-ui-compatibility-v2.mjs';
import './audit-current-ui-compatibility.test.mjs';
const read=async p=>JSON.parse(await fs.readFile(p));
const q=await read('deliverables/daily-formal-v4-20261008/selection/merged-116-v2/daily-basic-combined-d1-01.json');
const old=await read(q.historicalProof.path),request=await read(q.historicalProof.request.path),result=await read(q.historicalProof.result.path);
const paths={requestPath:q.historicalProof.request.path,resultPath:q.historicalProof.result.path};
test('real historical request/result/no-id schema and certified floor accepted',()=>assertHistoricalIdentity(q,old,request,result,paths));
test('request/result file identity and level hash cannot be mixed',()=>{
 assert.throws(()=>assertHistoricalIdentity(q,old,request,result,{...paths,resultPath:paths.resultPath.replace(old.attempt.id,'different-id')}));
 const o=structuredClone(old),r=structuredClone(request);o.attempt.levelSha256=r.levelSha256='0'.repeat(64);
 assert.throws(()=>assertHistoricalIdentity(q,o,r,result,paths));
 assert.throws(()=>assertHistoricalIdentity(q,old,request,{...result,id:'different-id'},paths));
});
test('historical upper object cannot be swapped and embedded L cannot exceed its proof',()=>{
 assert.throws(()=>assertHistoricalIdentity(q,old,request,{...result,upper:{forged:true}},paths));
 assert.throws(()=>assertHistoricalIdentity({...q,L:17},{...old,L:17},request,result,paths));
 const o=structuredClone(old);o.lowerBound.requiredFloor=15;
 assert.throws(()=>assertHistoricalIdentity(q,o,request,result,paths));
});
