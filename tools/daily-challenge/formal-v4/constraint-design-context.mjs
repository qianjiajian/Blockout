import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {createReferenceLineageReader} from '../formal-v3/reference-lineage.mjs';
import {prepareCapacityDesignContext,CAPACITY_SEED_BINDINGS} from './capacity-design-context.mjs';
import {CONSTRUCTION_LEDGER} from './capacity-construction-ledger.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

export const CONSTRAINT_SEED139={path:'deliverables/daily-formal-v4-20261008/selection/prefix-basic-139-01/index.json',
 sha256:'7675b4cea5915e905ee4d44d37ff6fced6458acb16a0535bd2c6c9a8010ae795'};
export const CONSTRAINT_HISTORICAL_UI_ARCHIVE={path:'deliverables/daily-formal-v4-20261008/proof/historical-ui-a79-archive-01/report.json',
 sha256:'15d8da1e677291a629557af4f0ff4900e189baa06df303cc76a95fb3ac852e28'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const exactSet=(a,b)=>a.length===b.length&&new Set(a).size===a.length&&a.every(x=>b.includes(x));

/** Fixed139 consists of the intact capacity138 and ONE independently admitted
 * basic receipt. The frozen capacity validator audits its own genuine subset;
 * the basic receipt stays in the complete geometry and family domain. */
export async function prepareConstraintDesignContext(runtime,baseReceipt,base,slot,selected,selectionContext,{
 qualificationOnly=false,constructionLedgerDirectory=CONSTRUCTION_LEDGER,publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER}={}){
 assert.equal(typeof qualificationOnly,'boolean');
 if(qualificationOnly&&!selectionContext)return prepareCapacityDesignContext(runtime,baseReceipt,base,slot,selected,null,
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 const bindings={},read=async d=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact context descriptor required');
  const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,`Changed constraint context input: ${d.path}`);bindings[d.path]=d.sha256;return JSON.parse(b);};
 const context=await read(selectionContext),seed=await read(CONSTRAINT_SEED139);
 assert.equal(context.schemaVersion,4);assert.equal(context.scope,300);assert.deepEqual(context.seedIndex,CONSTRAINT_SEED139,'Exact latest139 required');
 assert.equal(seed.files.length,139);assert.deepEqual(seed.files.slice(0,138),(await read(seed.inputSelection)).files);
 assert(exactSet(context.files,Object.keys(context.fileBindings??{})),'All selected bytes must be bound');
 assert(seed.files.every(p=>context.files.includes(p)),'Immutable139 cannot be omitted');assert.equal(selected.length,context.files.length);
 const actual=[];for(const [i,p]of context.files.entries()){
  const q=await read({path:p,sha256:context.fileBindings[p]});assert.deepEqual(q,selected[i],'Selected report must equal the bound complete bytes');
  assert(q.accepted&&!q.qualificationOnly);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));actual.push(q);
 }
 const basic=await read(seed.newAdmission);assert.equal(seed.files[138],seed.newAdmission.path);
 assert.equal(new Set(actual.map(q=>q.formalId)).size,actual.length,'No duplicated selected slot');
 assert.equal(basic.admissionVersion,'new-prefix-basic-readonly-admission-v1');assert(basic.accepted&&basic.catalogEligible&&!basic.qualificationOnly);
 assert.equal(basic.newSearches,0);assert.equal(basic.newLedgerClaims,0);assert.equal(basic.formalReady,false);
 assert.deepEqual(basic.inputSelection,seed.inputSelection);assert.deepEqual(basic.toolchainBindings,runtime.toolchainBindings);
 assert.equal(basic.admissionToolchainSha256,levelSha256(basic.admissionBindings));
 const archive=await read(CONSTRAINT_HISTORICAL_UI_ARCHIVE),historicalDependencyResolution=[];
 assert.equal(archive.status,'EXACT_HISTORICAL_UI_BYTES_ARCHIVED_CURRENT_UI_SEPARATE');
 assert.equal(archive.historical.sha256,'a79eb13437413cdab9a53c1487ff2808fd1cf2c2defca296cabeb45d3b9ba664');
 for(const [p,h]of Object.entries(basic.admissionBindings)){
  if(p===archive.historical.originalPath&&h===archive.historical.sha256){
   assert.equal(sha(await fs.readFile(archive.historical.path)),h,'Exact real historical UI archive bytes required');
   bindings[archive.historical.path]=h;historicalDependencyResolution.push({originalPath:p,historicalSha256:h,
    actualArchive:{path:archive.historical.path,sha256:h},archiveReceipt:CONSTRAINT_HISTORICAL_UI_ARCHIVE,currentRuntimeValidationClaimed:false});continue;
  }
  assert.equal(sha(await fs.readFile(p)),h,`Basic admission dependency changed: ${p}`);bindings[p]=h;
 }
 assert.equal(historicalDependencyResolution.length,1,'Exactly one explicit historical root UI binding is resolved');
 for(const field of ['policyRuleVersion','policyRuleSha256','mathRuleVersion','mathRuleSha256','toolchainSha256'])assert.equal(basic[field],runtime[field]);
 const math=await read(basic.mathematicalProof),audit=await read(basic.independentMathematicalAudit);
 assert.equal(audit.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(audit.errors,[]);assert.equal(audit.newSearches,0);
 assert(audit.results.some(r=>r.file===basic.mathematicalProof.path&&r.sha256===basic.mathematicalProof.sha256&&r.accepted&&r.L===basic.L&&r.U===basic.U));
 assert(math.accepted&&!math.qualificationOnly&&!math.catalogEligible&&math.mathematicalEvidenceValidated);
 for(const k of ['levelSha256','routeSha256','L','U','sourceLevelId'])assert.equal(math[k],basic[k]);
 assert.deepEqual(math.level,basic.level);assert.deepEqual(math.drags,basic.drags);assert.deepEqual(math.attempt,basic.attempt);
 const request=JSON.parse(await fs.readFile(path.join(publicLedgerDirectory,`${math.attempt.id}.request.json`))),
  result=JSON.parse(await fs.readFile(path.join(publicLedgerDirectory,`${math.attempt.id}.result.json`)));
 assert.deepEqual(request,math.attempt);assert(result.accepted&&result.levelSha256===basic.levelSha256&&result.status===math.status);
 assert.deepEqual(result.lower,math.lowerBound.result);assert.equal(result.upper,null);
 const lower=math.lowerBound.result;assert(lower.thresholdProven&&lower.floor===31&&lower.termination==='below-threshold-exhausted');
 assert(lower.guardAllowance.conservativeFullBoardStateUpperBound<=10000);assert(math.upperAccounting.conservativeFullBoardStateUpperBound<=10000);
 for(const replay of [basic.freshCanonicalReplay,basic.freshIndependentReplay])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===basic.U);
 const basicPosition=context.files.indexOf(seed.newAdmission.path);assert.deepEqual(actual[basicPosition],basic);
 // Bind the immutable138 bytes through the actual admission's complete inputs.
 for(const p of seed.files.slice(0,138))assert.equal(context.fileBindings[p],basic.admissionBindings[p],'Fixed138 receipt changed');
 const legacySeed=await read(CAPACITY_SEED_BINDINGS),legacyFiles=context.files.filter(p=>p!==seed.newAdmission.path),
  legacySelected=actual.filter((q,i)=>i!==basicPosition);
 const subcontext={schemaVersion:4,scope:300,seedIndex:legacySeed.seedIndex,files:legacyFiles,
  fileBindings:Object.fromEntries(legacyFiles.map(p=>[p,context.fileBindings[p]])),
  auditScope:'genuine-capacity-and-constraint-subset-only-basic-checked-separately',fullSelectionContext:selectionContext,formalReady:false};
 const data=JSON.stringify(subcontext,null,2)+'\n',directory=path.join(constructionLedgerDirectory,'constraint-contexts');
 await fs.mkdir(directory,{recursive:true});const p=path.join(directory,`${sha(data)}.json`);
 try{await fs.writeFile(p,data,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(await fs.readFile(p,'utf8'),data);}
 const inherited=await prepareCapacityDesignContext(runtime,baseReceipt,base,slot,legacySelected,{path:p,sha256:sha(data)},
  {qualificationOnly,constructionLedgerDirectory,publicLedgerDirectory});
 Object.assign(bindings,inherited.bindings);
 // One authoritative basic parent is explicitly admitted; never fake a
 // capacity construction sidecar for it or omit its lineage/geometry.
 const lineage=createReferenceLineageReader(),baseFamily=lineage.inspect(baseReceipt.path),newInput=await read(math.input);
 const reference=newInput.provenance?.reference??newInput.reference;
 const familyIssues=[];
 const parentPath=reference?.path??newInput.referenceFile;
 if(parentPath){const family=lineage.inspect(parentPath);if(baseFamily.roots.some(r=>family.roots.includes(r)))familyIssues.push('already-live-basic-reference-family');}
 const selectionBinding={...selectionContext,seedIndex:CONSTRAINT_SEED139,count:actual.length,fileBindings:context.fileBindings,
  legacySubset:inherited.selectionBinding,independentBasic:seed.newAdmission,historicalDependencyResolution,currentRuntimeValidationClaimed:false};
 return{bindings,selectionBinding,family:{...inherited.family,independentBasic:seed.newAdmission,extraIssues:familyIssues},inspect(level){
  const result=inherited.inspect(level),similarity=compareLayouts(level,basic.level).footprintSimilarity,
   sameGroup=slot.stageKey===basic.stageKey&&slot.difficulty===basic.difficulty;
  const issues=[...result.issues,...familyIssues];if(similarity>(sameGroup?.65:.75)+1e-12)issues.push(`selected-near:${basic.formalId}`);
  return{...result,passed:issues.length===0,issues,selectionBinding,selectedComparisons:[...result.selectedComparisons,{formalId:basic.formalId,sameGroup,similarity}],
   independentlyAdmittedBasicVerified:true,completeSelectedCount:actual.length};
 }};
}
