import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ICED153_INPUTS,assertIced153AdmissionMetadata,assertIced153PointerRun} from './admit-reviewed-iced-flip-153.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),data={},bindings={},evidence=[];
for(const[k,d]of Object.entries(ICED153_INPUTS)){const b=await fs.readFile(d.path);assert.equal(hash(b),d.sha256);data[k]=JSON.parse(b);bindings[d.path]=d.sha256;}
const args=()=>[data.prior,data.priorAudit,data.candidate,data.actual,data.pointer,data.visual];
test('exact 152 predecessor, one actual accepted iced candidate and both reviewed viewports are linked',()=>{
 assert(assertIced153AdmissionMetadata(...args()));evidence.push({test:'exact-bound-admission-metadata',passed:true});
});
test('no omitted predecessor, unknown math, third viewport or unreviewed image can be admitted',()=>{
 const p={...data.prior,files:data.prior.files.slice(1)};assert.throws(()=>assertIced153AdmissionMetadata(p,...args().slice(1)));
 const a={...data.actual,status:'UNKNOWN'};assert.throws(()=>assertIced153AdmissionMetadata(data.prior,data.priorAudit,data.candidate,a,data.pointer,data.visual));
 const pointer={...data.pointer,runs:[...data.pointer.runs,data.pointer.runs[0]]};assert.throws(()=>assertIced153AdmissionMetadata(data.prior,data.priorAudit,data.candidate,data.actual,pointer,data.visual));
 const visual={...data.visual,rootActuallyOpenedEveryImage:false};assert.throws(()=>assertIced153AdmissionMetadata(...args().slice(0,5),visual));
 evidence.push({test:'selection-and-evidence-negative-controls',passed:true,rejected:4});
});
test('both actual natural-clock runs match all four physical gate IDs and six real ice releases',async()=>{
 for(const s of data.pointer.runs){const b=await fs.readFile(s.report.path);assert.equal(hash(b),s.report.sha256);bindings[s.report.path]=s.report.sha256;const r=JSON.parse(b);assert(assertIced153PointerRun(r,data.candidate,data.actual));
  const wrong={...r,flipParticipation:r.flipParticipation.map((g,i)=>i?g:{...g,id:'same-colour-different-physical-portal'})};assert.throws(()=>assertIced153PointerRun(wrong,data.candidate,data.actual));
  assert.throws(()=>assertIced153PointerRun({...r,finalPuzzle:{...r.finalPuzzle,blocks:1}},data.candidate,data.actual));}
 evidence.push({test:'real-two-viewports-and-physical-participation',passed:true,runs:2,rejected:4});
});
test.after(async()=>{const out=process.env.ICED153_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/iced153-private-');await fs.mkdir(out,{recursive:true});
 for(const f of ['admit-reviewed-iced-flip-153.mjs','admit-reviewed-iced-flip-153.test.mjs']){const p='tools/daily-challenge/formal-v4/'+f;bindings[p]=hash(await fs.readFile(p));}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===3?'ICED153_READONLY_ADMISSION_PRIVATE_PASS':'ICED153_READONLY_ADMISSION_PRIVATE_INCOMPLETE',testsPassed:evidence.length,evidence,fileBindings:bindings,mergeExecuted:false,newSearches:0,newLedgerClaims:0,originalReceiptsModified:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
});
