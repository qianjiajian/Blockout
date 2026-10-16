import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {assertOriginalRawPlainSource60EvidenceV198,verifyOriginalRawPlainSource60EvidenceFilesV198,
 RAW_PLAIN_SOURCE60_HISTORICAL_RECEIPTS,RAW_PLAIN_SOURCE60_EVIDENCE_KIND,ORIGINAL_PLAIN_TOOLCHAIN_ROOT} from './raw-plain-source60-evidence-v198.mjs';
import {admitIncrementalRawSource60EntryV198} from './admit-incremental-raw-source60-v198.mjs';

// The real source60 receipt and recovered same-object candidate are loaded. Negative controls are private
// in-memory mutations, never stored as levels. No solver or replay is invoked.
const sha=b=>createHash('sha256').update(b).digest('hex'),recorded=new Map(),cases=[];
async function read(d){const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256);recorded.set(d.path,d.sha256);return JSON.parse(bytes);}
for(const pin of Object.values(RAW_PLAIN_SOURCE60_HISTORICAL_RECEIPTS)){
 const original=await read(pin.receipt),request=await read(pin.request),result=await read(pin.result),blocked=await read(pin.blocked),proof=original.proof;
 const q=await read({path:'deliverables/daily-formal-v4-20261008/selection/recovered-basic-198-02/daily-basic-combined-d3-06.json',sha256:'90fd31ee42b15690c424fc36d9ab98f1c6c1abf5ff510118a220c148f7d1c495'});
 const math={evidenceKind:RAW_PLAIN_SOURCE60_EVIDENCE_KIND,historicalReceipt:pin.receipt,request:pin.request,result:pin.result,blocked:pin.blocked,attemptId:request.id,
  originalAccepted:false,originalStatus:original.status,originalThresholdProven:false,lowerBoundBasis:'completed-bfs-minimum-certifiedFloor',guardAllowance:structuredClone(proof.guardAllowance),
  originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,lowerStatus:proof.status,lowerTermination:proof.termination,
  routeTermination:proof.routeTermination,method:proof.abstraction,rawFullBoardStates:proof.rawFullBoardStates,
  proofInputLevelSha256:proof.sourceLevelSha256,projectedLevelSha256:null,lowerEvidenceSha256:levelSha256(proof),
  canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,originalToolchainRoot:ORIGINAL_PLAIN_TOOLCHAIN_ROOT,
  budgetReview:{source:'read-only completed minimum below old requested floor',proofGuardOriginallyPresent:true,originalGuardWrapperExecuted:true,
   raw:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1}};
 cases.push({q,math,evidence:{original,request,result,blocked}});
}
for(const c of cases)test(`source${c.q.sourceLevelId} authenticates original raw minimum-route evidence and all 36 frozen files`,async()=>{
 const before=structuredClone(c),summary=assertOriginalRawPlainSource60EvidenceV198(c.q,c.math,c.evidence);
 assert.equal(summary.originalRequestedFloor,31);assert.equal(summary.originalAccepted,false);assert.equal(summary.originalFailureRetained,true);assert.equal(summary.originalGuard,true);assert.equal(summary.certifiedFloor,c.q.L);
 const verified=await verifyOriginalRawPlainSource60EvidenceFilesV198(c.q,c.math);assert.equal(verified.originalToolchainFilesChecked,36);
 assert.equal(verified.rawFullBoardStates,7087);assert.equal(Object.keys(verified.fileBindings).length,41);
 assert.equal(verified.conservativeFullBoardUpperBound,verified.rawFullBoardStates+1);
 for(const [file,h]of Object.entries(verified.fileBindings))recorded.set(file,h);
 assert.deepEqual(c,before,'Checker must preserve original evidence and candidate');
});
const proofChange=(c,fn)=>{fn(c.evidence.original.proof);c.evidence.result.lower=structuredClone(c.evidence.original.proof);c.evidence.result.upper=structuredClone(c.evidence.original.proof);
 c.math.lowerEvidenceSha256=levelSha256(c.evidence.original.proof);};
const controls=[
 ['rewritten original acceptance',c=>c.evidence.original.accepted=true],
 ['rewritten original rejection status',c=>c.evidence.original.status='THRESHOLD_PROVEN'],
 ['rewritten original ledger acceptance',c=>c.evidence.result.accepted=true],
 ['rewritten original threshold flag',c=>proofChange(c,p=>p.thresholdProven=true)],
 ['injected original L',c=>c.evidence.original.L=29],
 ['injected original U',c=>c.evidence.original.U=29],
 ['actual U changed',c=>c.evidence.original.actualU=30],
 ['candidate floor inflated to requested 31',c=>c.q.L=31],
 ['candidate U disagrees',c=>c.q.U=30],
 ['old failed identity unblocked',c=>c.evidence.blocked.status='PASS'],
 ['blocked owner changed',c=>c.evidence.blocked.attemptId='0'.repeat(64)],
 ['missing old guard',c=>proofChange(c,p=>delete p.guardAllowance)],
 ['guard budget raised to 10000',c=>proofChange(c,p=>p.guardAllowance.registeredSetBudget=10000)],
 ['guard allowance hidden',c=>proofChange(c,p=>p.guardAllowance.unregisteredTerminalWorldAllowance=0)],
 ['guard raw count changed',c=>proofChange(c,p=>p.guardAllowance.registeredRawSetStates=7086)],
 ['guard wrapper altered',c=>proofChange(c,p=>p.guardAllowance.wrapper.sha256='0'.repeat(64))],
 ['guard exact visited count misclaimed',c=>proofChange(c,p=>p.guardAllowance.exactFullBoardVisitedCountClaimed=true)],
 ['old untimed replay claimed natural time',c=>c.evidence.original.independentReplay.timeValidated=true],
 ['qualification launders original failure',c=>c.math.originalAccepted=true],
 ['qualification uses original requested floor as proof',c=>c.math.lowerBoundBasis='requested-floor'],
 ['old floor rewritten to certified value',c=>proofChange(c,p=>p.floor=p.certifiedFloor)],
 ['UNKNOWN lower even when reported values remain high',c=>proofChange(c,p=>{p.status='unknown';p.thresholdProven=false;})],
 ['budget exhaustion instead of proof',c=>proofChange(c,p=>p.termination='max-raw-board-states')],
 ['missing minimum-route completion',c=>proofChange(c,p=>delete p.routeTermination)],
 ['partial certified lower',c=>proofChange(c,p=>p.certifiedFloor=28)],
 ['cost disagrees with certificate',c=>proofChange(c,p=>p.cost--)],
 ['ledger lower differs from original',c=>c.evidence.result.lower.floor=17],
 ['ledger upper differs from original',c=>c.evidence.result.upper.cost--],
 ['request binding differs',c=>c.evidence.request.redesignOf='0'.repeat(64)],
 ['actual board differs',c=>c.q.level.blocks[0].x++],
 ['actual route differs',c=>c.q.drags.pop()],
 ['proof route differs',c=>proofChange(c,p=>p.drags.pop())],
 ['raw reserve exceeds 10000',c=>{proofChange(c,p=>{p.rawFullBoardStates=p.discoveredStates=p.visitedStates=10000;});c.math.rawFullBoardStates=10000;c.math.budgetReview.raw=10000;c.math.budgetReview.conservativeFullBoardUpperBound=10001;}],
 ['invalid negative raw accounting',c=>proofChange(c,p=>p.rawExploredStates=-1)],
 ['fractional count',c=>proofChange(c,p=>p.microDiscoveredStates=0.5)],
 ['unbounded count',c=>proofChange(c,p=>p.rawFullBoardStates=Infinity)],
 ['quotient count substituted for raw',c=>proofChange(c,p=>p.rawFullBoardStates=p.quotientDiscoveredStates)],
 ['oversized original budget',c=>proofChange(c,p=>p.budget.maxStates=10001)],
 ['incomplete old guard',c=>proofChange(c,p=>p.guardAllowance={hardWholeBoardLimit:10000})],
 ['incomplete summary guard',c=>c.math.guardAllowance={hardWholeBoardLimit:10000}],
 ['false no-guard claim',c=>c.math.budgetReview.originalGuardWrapperExecuted=false],
 ['incomplete canonical upper',c=>c.evidence.original.replay.complete=false],
 ['incomplete independent upper',c=>c.evidence.original.independentReplay.remainingBodies=1],
 ['truncated independent trace',c=>c.evidence.original.independentReplay.trace.pop()],
 ['wrong trace body',c=>c.evidence.original.independentReplay.trace[0].blockId='not-a-body'],
 ['invented trace clearing',c=>c.evidence.original.independentReplay.trace[0].clearDelta=1-c.evidence.original.independentReplay.trace[0].clearDelta],
 ['uncleared canonical inventory',c=>{const f=JSON.parse(c.evidence.original.replay.finalStateKey);f.blocks=[c.q.level.blocks[0]];c.evidence.original.replay.finalStateKey=JSON.stringify(f);}],
 ['wrong mathematical closure',c=>c.evidence.original.proofToolchainBindings['src/core/PuzzleModel.ts']='0'.repeat(64)],
 ['wrong closure location',c=>c.math.originalToolchainRoot='src'],
 ['unreviewed method',c=>proofChange(c,p=>p.abstraction='other-proof')],
 ['summary requests different proof',c=>c.math.lowerEvidenceSha256='0'.repeat(64)],
];
for(const [name,change]of controls)test(`rejects ${name} for the original source60 receipt`,()=>{
 for(const original of cases){const c=structuredClone(original);change(c);assert.throws(()=>assertOriginalRawPlainSource60EvidenceV198(c.q,c.math,c.evidence));}
});
test('immutable descriptor substitutions fail before any original closure read',async()=>{
 for(const key of ['historicalReceipt','request','result','blocked']){const c=structuredClone(cases[0]);c.math[key].sha256='0'.repeat(64);await assert.rejects(()=>verifyOriginalRawPlainSource60EvidenceFilesV198(c.q,c.math));}
});
test('new driver preserves every non-math gate from the already-reviewed raw admission driver',async()=>{
 const old=await fs.readFile('tools/daily-challenge/formal-v4/admit-incremental-raw-plain-v198.mjs','utf8');
 const next=await fs.readFile('tools/daily-challenge/formal-v4/admit-incremental-raw-source60-v198.mjs','utf8');
 assert.equal(next,old.replaceAll('verifyOriginalRawPlainEvidenceFilesV198','verifyOriginalRawPlainSource60EvidenceFilesV198')
  .replaceAll("'./raw-plain-evidence-v198.mjs'","'./raw-plain-source60-evidence-v198.mjs'")
  .replaceAll('admitIncrementalRawPlainEntryV198','admitIncrementalRawSource60EntryV198'));
});
test('import and absent-argument admission never mutate formal data or create an output',async()=>{
 const file='src/core/formalDailyChallenge300Data.ts',before=await fs.readFile(file);
 await assert.rejects(()=>admitIncrementalRawSource60EntryV198([]),/candidate, root design/);assert.deepEqual(await fs.readFile(file),before);
});
test.after(async()=>{for(const [file,h]of recorded)assert.equal(sha(await fs.readFile(file)),h,'Read-only evidence changed: '+file);});
