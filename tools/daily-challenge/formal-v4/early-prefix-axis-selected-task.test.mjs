import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {AXIS_ADMISSION,SELF,MATH_ENTRY,assertReviewedAxisAppend,assertAxisSelectedEnvelope} from './early-prefix-axis-selected-task.mjs';
import {INPUTS} from './axis-iced-task.mjs';
import {PUBLIC_LEDGER} from './low-twenty-io.mjs';
const ROOT='deliverables/daily-formal-v4-20261008',bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
const out=process.env.EARLY_PREFIX_AXIS_SELECTED_TEST_OUT;assert(out,'A fresh private report directory is required');
await fs.mkdir(out,{recursive:false});
async function read(d){const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256);bindings[d.path]=d.sha256;return JSON.parse(b);}
const q=await read(AXIS_ADMISSION.receipt),base=await read(INPUTS.base),actual=await read(AXIS_ADMISSION.actual),original=await read(INPUTS.selection);
const before=(await fs.readdir(PUBLIC_LEDGER)).filter(p=>p.endsWith('.request.json')).length;
const results=[];
function check(name,fn){test(name,()=>{try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});throw e;}});}
check('Exact accepted axis keeps six-field delta and mandatory fresh original ice proof',()=>{
 assert(assertReviewedAxisAppend(q,base,actual));
 for(const key of ['mathematicalProof','attempt'])assert.throws(()=>assertReviewedAxisAppend({...q,[key]:undefined},base,actual));
 for(const key of ['finalProofStarted','mathematicalEvidenceValidated','designValidated','mechanismStrengthValidated'])assert.throws(()=>assertReviewedAxisAppend({...q,[key]:false},base,actual));
 assert.throws(()=>assertReviewedAxisAppend({...q,levelSha256:'0'.repeat(64)},base,actual));
 assert.throws(()=>assertReviewedAxisAppend({...q,drags:q.drags.slice(1)},base,actual));
 const level=structuredClone(q.level);level.blocks[0].color='bad';assert.throws(()=>assertReviewedAxisAppend({...q,level},base,actual));
 const math={...q.mathematicalProof,lowerBound:{...q.lowerBound,result:{...q.lowerBound.result,thresholdProven:false}}};
 assert.throws(()=>assertReviewedAxisAppend({...q,mathematicalProof:math,lowerBound:math.lowerBound},base,actual));
});
check('Prospective selection metadata must be exact160 plus the one reviewed axis, never an omitted or replaced member',()=>{
 const selection={path:'private-synthetic-161-index.json',sha256:'1'.repeat(64)},context={selection,selectedCount:161};
 const index={files:[...original.files,AXIS_ADMISSION.receipt.path],fileBindings:{...original.fileBindings,[AXIS_ADMISSION.receipt.path]:AXIS_ADMISSION.receipt.sha256}};
 const review={selection,candidates:161,status:'INDEPENDENT_161_MERGE_QUICK_CHECK_PASS',errors:[],newSearches:0,newLedgerClaims:0,
  inputBindings:{...index.fileBindings,[AXIS_ADMISSION.actual.path]:AXIS_ADMISSION.actual.sha256}};
 assert(assertAxisSelectedEnvelope(index,review,context,original));
 assert.throws(()=>assertAxisSelectedEnvelope({...index,files:index.files.slice(1)},review,context,original));
 const files=[...index.files];[files[0],files[1]]=[files[1],files[0]];assert.throws(()=>assertAxisSelectedEnvelope({...index,files},review,context,original));
 assert.throws(()=>assertAxisSelectedEnvelope({...index,files:[...index.files,'extra']},review,context,original));
 assert.throws(()=>assertAxisSelectedEnvelope(index,{...review,inputBindings:{...review.inputBindings,[original.files[0]]:'0'.repeat(64)}},context,original));
 assert.throws(()=>assertAxisSelectedEnvelope(index,{...review,inputBindings:{...review.inputBindings,[AXIS_ADMISSION.actual.path]:undefined}},context,original));
 assert.throws(()=>assertAxisSelectedEnvelope(index,{...review,status:'INDEPENDENT_160_MERGE_QUICK_CHECK_PASS'},context,original));
});
test('Construction, budgets, mathematical run and actual accounting remain the frozen implementation',async()=>{
 const old=await fs.readFile('tools/daily-challenge/formal-v4/early-prefix-batch-task.mjs','utf8'),next=await fs.readFile(SELF,'utf8');
 assert.equal(sha(old),'61c40d4d7a5af0abb7725be351b7a81281dca6c888995a5e35e671b5d7d653c5');
 for(const [start,end]of [
  ['export function changedShapeAndColour','export async function prepareEarlyPrefixBatch'],
  ['export async function prepareEarlyPrefixBatch','async function auditBatchPlan'],
  ['async function auditSnapshot','if(process.argv[1]'],
 ]){
  const segment=s=>{const a=s.indexOf(start),b=s.indexOf(end,a+1);assert(a>=0&&b>a,`Missing source boundary ${start}/${end}`);return s.slice(a,b);};
  assert.equal(segment(next),segment(old),start);
 }
 results.push({name:'Unchanged construction and mathematics source',passed:true});
});
after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))bindings[file.replaceAll('\\','/')]=sha(await fs.readFile(file));
 const historicalQualification={path:ROOT+'/proof/early-prefix-batch-task-independent-01/report.json',sha256:'a-placeholder'};
 historicalQualification.sha256=sha(await fs.readFile(historicalQualification.path));bindings[historicalQualification.path]=historicalQualification.sha256;
 const testFile='tools/daily-challenge/formal-v4/early-prefix-axis-selected-task.test.mjs';bindings[testFile]=sha(await fs.readFile(testFile));
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(p=>p.endsWith('.request.json')).length;assert.equal(after,before);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:results.length===3&&results.every(x=>x.passed)?'EARLY_PREFIX_AXIS_SELECTED_TASK_PRIVATE_PASS':'FAIL',results,testsPassed:results.filter(x=>x.passed).length,
  historicalQualification,axis:AXIS_ADMISSION,originalSelection:INPUTS.selection,prospectiveSelectionTestIsMetadataOnly:true,actual161AdmissionChecked:false,
  mathematicalEntry:MATH_ENTRY,sourceChangedOnlySelectionAdmission:true,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,
  publicRequestCountBeforeAfter:[before,after],newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,newSearches:0,newLedgerClaims:0,
  toolBindings:bindings,fileBindings:bindings,qualificationOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});
