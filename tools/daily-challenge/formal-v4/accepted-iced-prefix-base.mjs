import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {assertEarlyPrefixReceiptAccounting} from './audit-early-prefix-actual-independent.mjs';
import {assertV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';
import {ICED_FLIP_BASE,ICED_FLIP_BASE_AUDIT} from './fixed-iced-flip-construction.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
export function inspectAcceptedIcedLinkage(base,input,{request,result,sidecar,planRecord}){
 assert.equal(base.version,'new-body-ice-thawed-prefix-one-plain-tail-original-ice-lower-v1');
 assert(base.accepted&&base.mathematicalEvidenceValidated&&!base.qualificationOnly);assert.equal(base.L,31);assert(base.U>=31);
 assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));
 assertEarlyPrefixReceiptAccounting(base,input);
 assert.deepEqual(request,base.attempt);assert.equal(request.levelSha256,base.levelSha256);
 assert(result.accepted&&result.status===base.status&&result.levelSha256===base.levelSha256);
 assert.equal(result.upper,null);assert.deepEqual(result.lower,base.proof);assert.deepEqual(base.lowerBound.result,base.proof);
 assert.deepEqual(planRecord.attempt,request);assert.deepEqual(planRecord.plan,base.plan);assert.deepEqual(planRecord.bindings,base.designBindings);
 for(const [k,v]of Object.entries(sidecar))assert.equal(levelSha256(v),levelSha256(base[k]),`Historical sidecar differs: ${k}`);
 for(const k of ['level','drags','plan','attempt','bridge','upperConstruction','upperAccounting','lowerBound','route','L','U','accepted','status'])assert(Object.hasOwn(sidecar,k),`Missing full sidecar ${k}`);
 assert.equal(base.plan.floor,31);assert.equal(base.toolchainSha256,FROZEN_MATH_SHA);
 return{L:base.L,U:base.U,levelSha256:base.levelSha256,routeSha256:base.routeSha256,originalIceProofUnchanged:true};
}

/** One-use readiness check, not a final-object verifier. After construction,
 * consumers verify this stored result and the new receipts, never bypass or
 * delete the absence checks below. No ledger creation, claim or solver. */
export async function assertAcceptedIcedPrefixBase(runtime,descriptor,{independentAudit=ICED_FLIP_BASE_AUDIT,
 qualificationOnly=false,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,constructionLedgerDirectory=CONSTRUCTION_LEDGER}={}){
 assertV4Runtime(runtime);await assertLowBandBatchPrivateNamespace(qualificationOnly,publicLedgerDirectory,constructionLedgerDirectory);
 if(!qualificationOnly){assert.deepEqual(descriptor,ICED_FLIP_BASE);assert.deepEqual(independentAudit,ICED_FLIP_BASE_AUDIT);
  assert.equal(path.resolve(publicLedgerDirectory),path.resolve(PUBLIC_ATTEMPT_LEDGER));assert.equal(path.resolve(constructionLedgerDirectory),path.resolve(CONSTRUCTION_LEDGER));}
 const fileBindings={},read=async(d,json=true)=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path),h=sha(b);assert.equal(h,d.sha256,`Changed evidence ${d.path}`);
  if(fileBindings[d.path])assert.equal(fileBindings[d.path],h);fileBindings[d.path]=h;return json?JSON.parse(b):b;};
 const base=await read(descriptor),audit=await read(independentAudit);assert.equal(audit.status,'INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS');assert.deepEqual(audit.errors,[]);
 assert.equal(audit.newSearches,0);assert.equal(audit.newLedgerClaims,0);
 const row=audit.results.find(r=>path.resolve(r.file)===path.resolve(descriptor.path));assert(row?.accepted&&row.sha256===descriptor.sha256);
 assert.equal(row.levelSha256,base.levelSha256);assert.equal(row.L,base.L);assert.equal(row.U,base.U);
 const completion=await read(audit.completion);assert(completion.results.some(r=>path.resolve(r.file)===path.resolve(descriptor.path)&&r.sha256===descriptor.sha256&&r.accepted));
 const input=await read(base.input),ledgerRead=async suffix=>{
  const original=path.resolve(base.executionEnvironment.executionWorkspace,PUBLIC_ATTEMPT_LEDGER,`${base.attempt.id}${suffix}`);
  const digest=audit.fileBindings[original];assert(digest,`Unbound original ledger file ${original}`);
  return read({path:path.join(publicLedgerDirectory,`${base.attempt.id}${suffix}`),sha256:digest});};
 const request=await ledgerRead('.request.json'),result=await ledgerRead('.result.json'),sidecar=await ledgerRead('.v4-thawed-prefix-result.json'),planRecord=await ledgerRead('.v4-thawed-prefix-plan.json');
 assert.equal(path.resolve(base.evidenceFile),path.resolve(PUBLIC_ATTEMPT_LEDGER,`${base.attempt.id}.v4-thawed-prefix-result.json`));
 assert.equal(path.resolve(base.planEvidence.path),path.resolve(PUBLIC_ATTEMPT_LEDGER,`${base.attempt.id}.v4-thawed-prefix-plan.json`));
 assert.equal(base.planEvidence.sha256,sha(await fs.readFile(path.join(publicLedgerDirectory,`${base.attempt.id}.v4-thawed-prefix-plan.json`))));
 const facts=inspectAcceptedIcedLinkage(base,input,{request,result,sidecar,planRecord});
 assert.deepEqual(base.toolchainBindings,runtime.toolchainBindings);assert.equal(base.designToolchainSha256,levelSha256(base.designBindings));
 for(const map of [base.toolchainBindings,base.designBindings])for(const[p,h]of Object.entries(map))await read({path:p,sha256:h},false);
 assert.equal(levelSha256(runtime.LEVELS.find(l=>l.id===base.sourceLevelId)),base.plan.sourceLevelSha256);
 for(const d of [base.plan.constructionEvidence,base.plan.plainConstructionEvidence,base.batchPlan,base.preflightAudit,base.visualReview])await read(d);
 const fp=designFingerprints(base.level),identity=levelSha256({shapeSha256:fp.shapeSha256,colorSha256:fp.colorSha256});
 assert.equal(request.retryIdentitySha256,identity);assert.equal(request.shapeSha256,fp.shapeSha256);assert.equal(request.colorSha256,fp.colorSha256);
 const identityFile=path.join(publicLedgerDirectory,'identities',identity+'.json'),ib=await fs.readFile(identityFile);fileBindings[identityFile]=sha(ib);
 const ir=JSON.parse(ib);assert.equal(ir.origin,request.id);assert.equal(ir.origin,request.identityOrigin);
 const absenceChecks=[path.join(publicLedgerDirectory,'identities',identity+'.blocked.json'),path.join(publicLedgerDirectory,request.id+'.blocked.json'),path.join(publicLedgerDirectory,request.id+'.revalidation.lock'),
  path.join(constructionLedgerDirectory,'identities',identity+'.json'),path.join(constructionLedgerDirectory,'identities',identity+'.blocked.json'),path.join(constructionLedgerDirectory,'aliases',identity+'.json')];
 for(const p of absenceChecks)assert(!await exists(p),`Failed/pending/previously constructed physical input: ${p}`);
 const canonical=runtime.replayRevisedRoute(base.level,base.drags),independent=independentReplay(runtime,base.level,base.drags);
 for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===base.U&&r.effectiveDrags===base.drags.length);
 assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
 return{status:'ACCEPTED_ICED_PREFIX_READY_FOR_ONE_FIXED_MECHANISM_CONSTRUCTION',base,input,baseReceipt:descriptor,independentMathematicsAudit:independentAudit,facts,
  canonicalReplay:canonical,independentReplay:independent,absenceChecks,fileBindings,newSearches:0,newLedgerClaims:0,ledgerWrites:0,slotAccepted:false,catalogEligible:false};
}
