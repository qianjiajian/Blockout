import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {assertFixedIcedFlipReceiptAccounting,assertFixedIcedPublicProof} from './audit-fixed-iced-flip-actual-independent.mjs';
import {auditFixedIcedFlip} from './fixed-iced-flip-construction.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
const author='deliverables/daily-formal-v4-20261008/proof/fixed-iced-flip-private-04/report.json';
const report=JSON.parse(await fs.readFile(author)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(await fs.readFile(author)),'237e8a90e10ff8ed0bd04227158b999952a127a9a2e0ca7143a7b071e1087ce8');
const long=report.evidence.find(e=>e.test==='fresh-original-final-ice-proof-private-counterexample').result;
const short=report.evidence.find(e=>e.test==='below-band-terminal-without-lower-and-no-retry').result;
const base=JSON.parse(await fs.readFile(long.baseReceipt.path)),shortBase=JSON.parse(await fs.readFile(short.baseReceipt.path));
const runtime=await loadV4CatalogRuntime(),evidence=[];
const out=process.env.ICED_FLIP_AUDIT_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/iced-auditor-private-');await fs.mkdir(out,{recursive:true});
test('real private terminal records distinguish complete U, fresh failed L and below-band U without a lower',()=>{
 const q=assertFixedIcedFlipReceiptAccounting(long,base,{qualificationOnly:true});assert.equal(q.accepted,false);assert.equal(q.lowerSearches,1);assert.equal(q.U,32);
 const s=assertFixedIcedFlipReceiptAccounting(short,shortBase,{qualificationOnly:true});assert.equal(s.accepted,false);assert.equal(s.lowerSearches,0);
 assert.throws(()=>assertFixedIcedFlipReceiptAccounting(long,base));evidence.push({test:'stored-private-terminal-positive-controls',passed:true,long:q,short:s});
});
test('original complete route is replayed against the final four true gates and all six ice bodies',async()=>{
 const prior=JSON.parse(await fs.readFile(long.priorBaseline.path));const h=levelSha256(long),a=auditFixedIcedFlip(runtime,base,long.level,long.drags,prior.level,{configuration:long.configuration,qualificationOnly:true});
 assert(a.passed&&a.flips.length===4&&a.flips.every(g=>g.actualGateExits.length>0));assert.equal(a.ice.length,6);assert.equal(new Set(a.ice.map(i=>i.releaseDrag)).size,3);
 const r=independentReplay(runtime,long.level,long.drags);assert(r.complete&&r.valid&&r.remainingBodies===0&&r.remainingQueued===0);assert.equal(r.nonClearingDrags,32);assert.equal(levelSha256(long),h);
 evidence.push({test:'read-only-actual-full-U-and-mechanisms',passed:true,U:r.nonClearingDrags,flips:a.flips,ice:a.ice});
});
test('raw aliases, terminal reserve, construction replay reservations and projection input cannot be forged',()=>{
 const mutations=[q=>q.construction.constructionAccounting.fullWorldReservations--,q=>q.construction.constructionAccounting.maxStates=10001,q=>q.lowerBound.result.rawFullBoardStates=10000,
 q=>q.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound--,q=>q.lowerBound.inputLevelSha256=q.baseLevelSha256,q=>q.mathematicalProof.route.search={},q=>q.sourceLevelId=-1,
 q=>{q.accepted=true;q.catalogEligible=true;q.mathematicalEvidenceValidated=true;q.terminalBlocked=false;q.status='FIXED_ICED_FLIP_D3_CANDIDATE_VERIFIED_AWAITING_POINTER';}];
 for(const change of mutations){const q=structuredClone(long);change(q);assert.throws(()=>assertFixedIcedFlipReceiptAccounting(q,base,{qualificationOnly:true}));}
 evidence.push({test:'accounting-and-same-object-negative-controls',passed:true,rejected:mutations.length});
});
test('actual private public-request/result/plan tuple binds null upper and complete unchanged lower evidence',async()=>{
 const directory=path.join(path.dirname(long.baseReceipt.path),'public'),stem=path.join(directory,long.attempt.id),read=async p=>JSON.parse(await fs.readFile(p));
 const links={request:await read(stem+'.request.json'),result:await read(stem+'.result.json'),planRecord:await read(stem+'.v4-plan.json')};assert(assertFixedIcedPublicProof(long,links));
 for(const mutate of [q=>q.request.colorSha256='0'.repeat(64),q=>q.result.upper={},q=>q.result.lower.rawFullBoardStates++,q=>q.result.status='verified',q=>q.planRecord.plan.lowerBudget.maxStates=10000]){const l=structuredClone(links);mutate(l);assert.throws(()=>assertFixedIcedPublicProof(long,l));}
 evidence.push({test:'actual-private-ledger-negative-controls',passed:true,rejected:5,existingPrivateAttempt:long.attempt.id});
});
test.after(async()=>{const fileBindings={[author]:sha(await fs.readFile(author))};for(const f of ['audit-fixed-iced-flip-actual-independent.mjs','audit-fixed-iced-flip-actual-independent.test.mjs']){const p='tools/daily-challenge/formal-v4/'+f;fileBindings[p]=sha(await fs.readFile(p));}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===4?'FIXED_ICED_FLIP_ACTUAL_AUDITOR_PRIVATE_PASS':'FIXED_ICED_FLIP_ACTUAL_AUDITOR_PRIVATE_INCOMPLETE',testsPassed:evidence.length,evidence,fileBindings,publicNamespacesScanned:false,newRealConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false},null,2)+'\n',{flag:'wx'});});
