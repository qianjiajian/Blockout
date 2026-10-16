import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {assertOriginalRawPlainSource118EvidenceV198,verifyOriginalRawPlainSource118EvidenceFilesV198,
 RAW_PLAIN_HISTORICAL_RECEIPTS,RAW_PLAIN_EVIDENCE_KIND,ORIGINAL_PLAIN_TOOLCHAIN_ROOT} from './raw-plain-source118-evidence-v198.mjs';
import {admitIncrementalRawPlainSource118EntryV198} from './admit-incremental-raw-source118-v198.mjs';

// Only the one pinned source118 old receipt is loaded. Negative controls are private
// in-memory mutations, never stored as levels. No solver or replay is invoked.
const sha=b=>createHash('sha256').update(b).digest('hex'),recorded=new Map(),cases=[];
async function read(d){const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256);recorded.set(d.path,d.sha256);return JSON.parse(bytes);}
for(const pin of Object.values(RAW_PLAIN_HISTORICAL_RECEIPTS)){
 const original=await read(pin.receipt),request=await read(pin.request),result=await read(pin.result),proof=original.proof;
 const q={schemaVersion:4,formalId:'daily-basic-combined-d3-10',stageKey:'basic-combined',difficulty:3,slot:10,sourceLevelId:original.sourceLevelId,level:structuredClone(original.level),levelSha256:original.levelSha256,
  drags:structuredClone(original.drags),routeSha256:routeSha256(original.drags),L:original.L,U:original.U,
  historicalProof:{...pin.receipt,proofToolchainSha256:original.proofToolchainSha256}};
 const math={evidenceKind:RAW_PLAIN_EVIDENCE_KIND,historicalReceipt:pin.receipt,request:pin.request,result:pin.result,attemptId:request.id,
  originalRequestedFloor:proof.floor,certifiedFloor:proof.certifiedFloor,lowerStatus:proof.status,lowerTermination:proof.termination,
  routeTermination:proof.routeTermination,method:proof.abstraction,rawFullBoardStates:proof.rawFullBoardStates,
  proofInputLevelSha256:proof.sourceLevelSha256,projectedLevelSha256:null,lowerEvidenceSha256:levelSha256(proof),
  canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,originalToolchainRoot:ORIGINAL_PLAIN_TOOLCHAIN_ROOT,
  guardAllowance:structuredClone(proof.guardAllowance),
  budgetReview:{source:'read-only successful old proof',proofGuardOriginallyPresent:true,originalGuardWrapperExecuted:true,
   raw:proof.rawFullBoardStates,conservativeFullBoardUpperBound:proof.rawFullBoardStates+1}};
 cases.push({q,math,evidence:{original,request,result}});
}
for(const c of cases)test(`source${c.q.sourceLevelId} authenticates original raw minimum-route evidence and all 36 frozen files`,async()=>{
 const before=structuredClone(c),summary=assertOriginalRawPlainSource118EvidenceV198(c.q,c.math,c.evidence);
 assert.equal(summary.originalRequestedFloor,16);assert.equal(summary.certifiedFloor,c.q.L);
 const verified=await verifyOriginalRawPlainSource118EvidenceFilesV198(c.q,c.math);assert.equal(verified.originalToolchainFilesChecked,36);
 assert.equal(verified.rawFullBoardStates,7170);
 assert.equal(verified.conservativeFullBoardUpperBound,verified.rawFullBoardStates+1);
 for(const [file,h]of Object.entries(verified.fileBindings))recorded.set(file,h);
 assert.deepEqual(c,before,'Checker must preserve original evidence and candidate');
});
const proofChange=(c,fn)=>{fn(c.evidence.original.proof);c.evidence.result.lower=structuredClone(c.evidence.original.proof);c.evidence.result.upper=structuredClone(c.evidence.original.proof);
 c.math.lowerEvidenceSha256=levelSha256(c.evidence.original.proof);};
const controls=[
 ['missing actual guard',c=>proofChange(c,p=>delete p.guardAllowance)],
 ['changed top-level guard',c=>c.evidence.original.guardAllowance.unregisteredTerminalWorldAllowance=0],
 ['missing projected-level declaration',c=>delete c.evidence.original.lowerBound.projectedLevelSha256],
 ['wrong original lower route binding',c=>c.evidence.original.lowerBound.inputLevelSha256='0'.repeat(64)],
 ['stored route search differs',c=>c.evidence.original.route.search.cost--],
 ['stored canonical route differs',c=>c.evidence.original.route.canonicalReplay.complete=false],
 ['changing original difficulty',c=>c.evidence.original.difficulty=2],
 ['assigning an invented original slot',c=>c.evidence.original.formalId='daily-basic-combined-d3-08'],
 ['moving recovered object to D2',c=>c.q.difficulty=2],
 ['moving recovered object to another basic D3 slot',c=>c.q.slot=7],
 ['moving recovered object to another stage',c=>c.q.stageKey='mechanisms-multilayer-shell-15'],
 ['wrong formalId despite same difficulty',c=>c.q.formalId='daily-basic-combined-d2-07'],
 ['old floor rewritten to certified value',c=>proofChange(c,p=>p.floor=p.certifiedFloor)],
 ['UNKNOWN lower even when reported values remain high',c=>proofChange(c,p=>{p.status='unknown';p.thresholdProven=false;})],
 ['budget exhaustion instead of proof',c=>proofChange(c,p=>p.termination='max-raw-board-states')],
 ['missing minimum-route completion',c=>proofChange(c,p=>delete p.routeTermination)],
 ['partial certified lower',c=>proofChange(c,p=>p.certifiedFloor=16)],
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
 ['replaced original guard',c=>proofChange(c,p=>p.guardAllowance={hardWholeBoardLimit:10000})],
 ['replaced summary guard',c=>c.math.guardAllowance={hardWholeBoardLimit:10000}],
 ['concealed executed-guard claim',c=>c.math.budgetReview.originalGuardWrapperExecuted=false],
 ['incomplete canonical upper',c=>c.evidence.original.replay.complete=false],
 ['incomplete independent upper',c=>c.evidence.original.independentReplay.remainingBodies=1],
 ['truncated independent trace',c=>c.evidence.original.independentReplay.trace.pop()],
 ['wrong trace body',c=>c.evidence.original.independentReplay.trace[0].blockId='not-a-body'],
 ['invented trace clearing',c=>c.evidence.original.independentReplay.trace[0].clearDelta=0],
 ['uncleared canonical inventory',c=>{const f=JSON.parse(c.evidence.original.replay.finalStateKey);f.blocks=[c.q.level.blocks[0]];c.evidence.original.replay.finalStateKey=JSON.stringify(f);}],
 ['wrong mathematical closure',c=>c.evidence.original.proofToolchainBindings['src/core/PuzzleModel.ts']='0'.repeat(64)],
 ['wrong closure location',c=>c.math.originalToolchainRoot='src'],
 ['unreviewed method',c=>proofChange(c,p=>p.abstraction='other-proof')],
 ['summary requests different proof',c=>c.math.lowerEvidenceSha256='0'.repeat(64)],
];
for(const [name,change]of controls)test(`rejects ${name} for the original source118 receipt`,()=>{
 for(const original of cases){const c=structuredClone(original);change(c);assert.throws(()=>assertOriginalRawPlainSource118EvidenceV198(c.q,c.math,c.evidence));}
});
test('immutable descriptor substitutions fail before any original closure read',async()=>{
 for(const key of ['historicalReceipt','request','result']){const c=structuredClone(cases[0]);c.math[key].sha256='0'.repeat(64);await assert.rejects(()=>verifyOriginalRawPlainSource118EvidenceFilesV198(c.q,c.math));}
});
test('source118 driver preserves every predecessor gate outside the exact checker import and symbol substitution',async()=>{
 let old=await fs.readFile('tools/daily-challenge/formal-v4/admit-incremental-raw-plain-v198.mjs','utf8');
 const next=await fs.readFile('tools/daily-challenge/formal-v4/admit-incremental-raw-source118-v198.mjs','utf8');
 old=old.replaceAll('verifyOriginalRawPlainEvidenceFilesV198','verifyOriginalRawPlainSource118EvidenceFilesV198').replaceAll("'./raw-plain-evidence-v198.mjs'","'./raw-plain-source118-evidence-v198.mjs'").replaceAll('admitIncrementalRawPlainEntryV198','admitIncrementalRawPlainSource118EntryV198');
 assert.equal(next,old,'Design, qualification, Pointer, images, registry append and prior-entry gates must stay unchanged');
});
test('import and absent-argument admission never mutate formal data or create an output',async()=>{
 const file='src/core/formalDailyChallenge300Data.ts',before=await fs.readFile(file);
 await assert.rejects(()=>admitIncrementalRawPlainSource118EntryV198([]),/candidate, root design/);assert.deepEqual(await fs.readFile(file),before);
});
test.after(async()=>{for(const [file,h]of recorded)assert.equal(sha(await fs.readFile(file)),h,'Read-only evidence changed: '+file);});
