import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertOriginalMathematicalEvidenceV198,admitIncrementalEntryV198} from './admit-incremental-entry-v198.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

// Stored evidence is read only. Negative controls are in-memory clones; no
// registration command, original file rewrite, model, solver or replay runs.
const base='deliverables/daily-formal-v4-20261008/proof/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const recorded=new Map();
async function read(file,expected){const bytes=await fs.readFile(file),hash=sha(bytes);if(expected)assert.equal(hash,expected);recorded.set(file,hash);return JSON.parse(bytes);}
const cases=[];
for(const file of (await fs.readdir(base)).filter(x=>/^incremental-\d+.*registration.*json$/.test(x))){
 const r=await read(base+file);const q=await read(r.inputs[0].path,r.inputs[0].sha256),qualification=await read(r.inputs[3].path,r.inputs[3].sha256);
 const row=qualification.rows.find(x=>x.formalId===q.formalId),math=row.mathematicalEvidence;
 const original=q.lowerBound?q:await read(q.historicalProof.path,q.historicalProof.sha256);
 const request=await read(math.request.path,math.request.sha256),result=await read(math.result.path,math.result.sha256);
 cases.push({q,math,evidence:{original,request,result}});
}
test('all current standard formal receipts bind exact original evidence and retain the 51-receipt baseline',()=>{
 assert(cases.length>=51,'The original 51 standard formal receipts must remain covered');const kinds=new Set();let guarded=0;
 for(const c of cases){const r=assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence);assert.equal(r.L,c.q.L);kinds.add(c.evidence.original.lowerBound.method);guarded+=Number(r.originalGuard);}
 assert(guarded>=12,'The original 12 guarded receipts must remain covered');assert(kinds.size>=6,'All six original proof methods must remain covered');
});
test('first formal n20 original ledger also has the same supported evidence shape',async()=>{
 const r=await read(base+'n20-formal-registration-01.json'),q=await read(r.inputs[0].path,r.inputs[0].sha256);
 const ledger='deliverables/daily-formal-v3-20261008/proof/attempts/'+q.attempt.id;
 const request=await read(ledger+'.request.json'),result=await read(ledger+'.result.json'),lower=q.lowerBound;
 // n20 predates the standardized qualification report. This read-only shape
 // check does not manufacture such a report or re-admit the already formal level.
 const math={attemptId:request.id,lowerStatus:result.lower.status,lowerTermination:result.lower.termination,method:lower.method,
  rawFullBoardStates:result.lower.rawFullBoardStates,projectedLevelSha256:lower.projectedLevelSha256,proofInputLevelSha256:result.lower.sourceLevelSha256,
  canonicalValidComplete:q.route.canonicalReplay.valid&&q.route.canonicalReplay.complete,
  independentValidComplete:q.route.independentReplay.valid&&q.route.independentReplay.complete,
  completeOriginalInventory:q.route.independentReplay.remainingBodies===0&&q.route.independentReplay.remainingQueued===0,
  guardAllowance:result.lower.guardAllowance};
 const out=assertOriginalMathematicalEvidenceV198(q,math,{original:q,request,result});assert.equal(out.L,31);assert.equal(out.U,35);assert.equal(out.originalGuard,true);
});
const guarded=()=>structuredClone(cases.find(c=>c.math.guardAllowance));
const historical=()=>structuredClone(cases.find(c=>!c.math.guardAllowance));
const both=(c,change)=>{change(c.evidence.result.lower);change(c.evidence.original.lowerBound.result);};
test('guard and historical branches both reject termination and threshold substitutions',()=>{
 for(const fixture of [guarded,historical])for(const change of [
  c=>{c.math.lowerTermination='deadline';},
  c=>both(c,p=>p.termination='max-raw-board-states'),
  c=>both(c,p=>p.status='unknown'),
  c=>both(c,p=>p.thresholdProven=false),
  c=>both(c,p=>p.floor=c.q.L-3),
  c=>both(c,p=>p.certifiedFloor=c.q.L-1),
 ]){const c=fixture();change(c);assert.throws(()=>assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence));}
});
test('negative, fractional, unsafe and coerced state accounting is never accepted',()=>{
 for(const fixture of [guarded,historical])for(const value of [-1,0.5,Number.MAX_SAFE_INTEGER+1,'10',NaN,Infinity])for(const field of ['rawFullBoardStates','rawExploredStates','microDiscoveredStates','budget']){
  const c=fixture();both(c,p=>field==='budget'?p.budget.maxStates=value:p[field]=value);if(field==='rawFullBoardStates')c.math.rawFullBoardStates=value;
  assert.throws(()=>assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence),`${field}=${value}`);
 }
});
test('summary flags cannot replace actual request/result/receipt or alter the projection binding',()=>{
 for(const change of [
  c=>c.evidence.result.accepted=false,
  c=>c.evidence.request.id='different-attempt',
  c=>c.evidence.request.levelSha256='0'.repeat(64),
  c=>c.evidence.result.levelSha256='0'.repeat(64),
  c=>c.evidence.result.lower.floor=1,
  c=>c.evidence.original.lowerBound.inputLevelSha256='0'.repeat(64),
  c=>c.evidence.original.lowerBound.projectedLevelSha256='0'.repeat(64),
  c=>c.evidence.original.lowerBound.projection.sourceLevelSha256='0'.repeat(64),
  c=>c.evidence.original.lowerBound.projection.projectedLevel.blocks[0].x++,
  c=>c.evidence.original.lowerBound.projection.upperBoundTransfer=true,
  c=>{c.evidence.original.lowerBound.projection=null;c.evidence.original.lowerBound.projectedLevelSha256=null;c.math.projectedLevelSha256=null;},
  c=>c.math.proofInputLevelSha256='0'.repeat(64),
  c=>c.math.lowerEvidenceSha256='0'.repeat(64),
 ]){const c=guarded();change(c);assert.throws(()=>assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence));}
});
test('the one-world reserve cannot be hidden, lowered, fabricated or retroactively added',()=>{
 for(const change of [
  c=>{delete c.math.guardAllowance;},
  c=>{c.math.guardAllowance.conservativeFullBoardStateUpperBound=0;},
  c=>both(c,p=>p.guardAllowance.unregisteredTerminalWorldAllowance=0),
  c=>both(c,p=>p.guardAllowance.registeredRawSetStates++),
  c=>both(c,p=>p.guardAllowance.registeredSetBudget=10000),
  c=>both(c,p=>p.guardAllowance.conservativeFullBoardStateUpperBound=10001),
 ]){const c=guarded();change(c);assert.throws(()=>assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence));}
 const old=historical();old.math.guardAllowance=guarded().math.guardAllowance;assert.throws(()=>assertOriginalMathematicalEvidenceV198(old.q,old.math,old.evidence));
 for(const value of [-1,'4',10000]){const c=historical();c.math.budgetReview.raw=value;assert.throws(()=>assertOriginalMathematicalEvidenceV198(c.q,c.math,c.evidence));}
});
test('import is inert and missing CLI inputs fail before any formal data mutation',async()=>{
 const file='src/core/formalDailyChallenge300Data.ts',before=await fs.readFile(file);await assert.rejects(()=>admitIncrementalEntryV198([]),/candidate, root design/);assert.deepEqual(await fs.readFile(file),before);
});
test.after(async()=>{for(const[file,hash]of recorded)assert.equal(sha(await fs.readFile(file)),hash,'Read-only evidence drift: '+file);});
