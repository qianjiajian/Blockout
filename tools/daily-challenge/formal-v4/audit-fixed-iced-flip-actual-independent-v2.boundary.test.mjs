import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertFixedIcedFlipReceiptAccounting} from './audit-fixed-iced-flip-actual-independent-v2.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const descriptor={path:'deliverables/daily-formal-v4-20261008/selection/fixed-iced-flip-01/candidate.json',sha256:'956f62fea2d3c13e0235601411e2b5f59de36be45db17d6e39701c13495179ef'};
const raw=await fs.readFile(descriptor.path);assert.equal(sha(raw),descriptor.sha256);
const original=JSON.parse(raw),base=JSON.parse(await fs.readFile(original.baseReceipt.path));
const out=process.env.ICED_ACTUAL_BOUNDARY_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const evidence=[];
test('the immutable actual accepted accounting remains a positive control without any search or replay',()=>{
 const result=assertFixedIcedFlipReceiptAccounting(original,base);assert(result.accepted);assert.equal(result.L,31);assert.equal(result.U,46);
 evidence.push({test:'existing-actual-accounting-only-positive-control',passed:true,result});
});
test('accepted deadline and elapsed beyond the fixed lower budget are refused',()=>{
 const tests=[['deadline',p=>p.termination='deadline'],['over-declared-time',p=>p.elapsedMilliseconds=p.budget.maxMilliseconds+1]];
 for(const[name,change]of tests){const q=structuredClone(original);change(q.lowerBound.result);change(q.mathematicalProof.lowerBound.result);
  assert.throws(()=>assertFixedIcedFlipReceiptAccounting(q,base),name);}
 evidence.push({test:'accepted-lower-termination-and-time-negative-controls',passed:true,rejected:tests.map(t=>t[0])});
});
test.after(async()=>{
 assert.equal(sha(await fs.readFile(descriptor.path)),descriptor.sha256);
 const files=['tools/daily-challenge/formal-v4/audit-fixed-iced-flip-actual-independent-v2.mjs','tools/daily-challenge/formal-v4/audit-fixed-iced-flip-actual-independent-v2.boundary.test.mjs'];
 const fileBindings={[descriptor.path]:descriptor.sha256};for(const p of files)fileBindings[p]=sha(await fs.readFile(p));
 const report={status:evidence.length===2?'INDEPENDENT_ICED_ACTUAL_BOUNDARY_PASS':'INDEPENDENT_ICED_ACTUAL_BOUNDARY_FAIL',testsPassed:evidence.length,evidence,fileBindings,
  readOnlyActualAccountingControl:true,originalBytesUnchanged:true,newSearches:0,newLedgerClaims:0,newConstructions:0,newActualRouteReplays:0,qualificationOnly:true};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
