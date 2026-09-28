import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

// A handoff index, not a solver or a certificate. Recompute all file hashes and
// join evidence by both level and route hashes; never join on level number alone.
const root='deliverables/remake31-200-v145-20260924/batches/lv141-150';
const baselinePath='deliverables/remake31-200-v145-20260924/baseline.json';
const baseline=JSON.parse(fs.readFileSync(baselinePath));
const bindings={};
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function read(file){bindings[file]=hash(file);return JSON.parse(fs.readFileSync(file));}
function local(file){return file.startsWith('deliverables/')?file:root+'/'+file;}
function evidence(file){file=local(file);bindings[file]=hash(file);return {file,sha256:bindings[file]};}
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');
const manifest=read('docs/rules/manifest.json');
const active=manifest.versions.find(v=>v.version===manifest.activeVersion);
bindings[active.document]=hash(active.document);bindings[baselinePath]=hash(baselinePath);
const a=read(root+'/source141-145/summary141-145.json');
const b=read(root+'/source146-150/summary.json');
const c=read(root+'/source148/SUMMARY.json');
const targets={141:[5,10],142:[11,15],143:[16,20],144:[5,10],145:[11,15],146:[21,30],147:[5,10],148:[11,15],149:[11,15],150:[5,10]};
const levels=[];
for(const row of a.levels){
  const id=row.level;
  levels.push({id,target:targets[id],sourceStatus:row.sourceStatus,
    sourceEvidence:[evidence('source141-145/'+([142,145].includes(id)?(id===142?'source-review-v2.json':row.adaptationFile??'adaptation145-v3.json'):'source-specs141-143-144.json'))],
    candidate:row.candidate?'source141-145/'+row.candidate:null,
    gates:{source:row.sourceUnresolved?.length?'UNKNOWN':id===145?'REVIEWED_NECESSARY_ADAPTATION':row.sourceStatus, ...row.gates},
    lowerBound:row.bounds?.lower??null,upperBound:row.bounds?.upper??null,totalDrags:row.bounds?.totalDrags??null,
    multiCellNonClearing:row.bounds?.multiCellNonClearing??null,
    pending:[...(row.sourceUnresolved??[]),...(row.blockingFields??[]),...(row.hiddenUnknown??[])],
    lowerEvidence:row.proof?evidence('source141-145/'+row.proof):null,
    lowerEvidenceHistory:(row.lowerEvidenceHistory??[]).map(x=>({...x,...evidence('source141-145/'+x.file)})),
    decisions:row.gates.decisionCases==='PASS'?evidence('source141-145/'+(row.decisionFile??('decision-review'+id+(id===145?'-v3':'')+'.json'))):null,
    boundMeasuredStable:row.proofBindingsStableAtRun??null,
    currentProofDrift:row.proofCurrentDrift??[],
    authoredTimingSeconds:row.scheduledTimeSeconds??null});
}
for(const row of b.levels){
  levels.push({id:row.id,target:targets[row.id],sourceStatus:row.sourceStatus,
    sourceEvidence:[evidence(row.sourceReport),...(row.sourceCaveat?[evidence(row.sourceCaveat)]:[])],
    candidate:row.candidate,
    gates:{source:row.sourceStatus,static:row.static,native:row.native,fullRoute:row.route,floor:row.floor,decisionCases:row.decisions,pointer:row.pointer},
    lowerBound:row.lowerBound,upperBound:row.upperBound,totalDrags:row.totalDrags,
    pending:row.pending,
    lowerEvidence:row.floorEvidence?.map(x=>({...x,...evidence(x.file)}))??null});
}
const check148=read(root+'/source148/final-check148.json');
levels.push({id:148,target:targets[148],sourceStatus:'REVIEWED_NECESSARY_NATIVE_AND_PORT_ADAPTATION',
  sourceEvidence:[evidence('source148/source148-review.md'),evidence('source148/source148-evidence.json')],
  candidate:'source148/'+c.best.file,
  gates:{source:'REVIEWED_REQUIRES_FINAL_PAIRING_REVIEW',static:check148.audit.native&&Object.values(check148.audit).every(x=>typeof x==='boolean'?x:x.passed)?'PASS':'UNKNOWN',native:'PASS',fullRoute:check148.replay.valid&&check148.replay.complete?'PASS':'FAIL',floor:'NOT_RUN',difficulty:'FAIL_ROUTE_ABOVE_UPPER_LIMIT',decisionCases:'NOT_RUN',pointer:'NOT_RUN'},
  lowerBound:null,upperBound:check148.replay.nonClearingDrags,totalDrags:check148.replay.effectiveDrags,
  fullRouteEvidence:evidence('source148/final-check148.json'),
  pending:c.handoff.remaining});
levels.push({id:149,target:targets[149],sourceStatus:'CORRECTED_SOURCE_INVENTORY_REQUIRES_FINAL_PAIRING_REVIEW',
  sourceEvidence:[evidence('root149/source-review-1790250721869.json'),evidence('source148/crosscheck149-evidence.json'),evidence('root149/carrier-proof-1790250664797.json')],
  candidate:'root149/draft-1790250722299.json',
  gates:{source:'PARTIAL_REVIEW',static:'PASS',native:'PASS',fullRoute:'UNKNOWN_BOUNDED_SEARCH_NO_WITNESS',floor:'NOT_RUN',decisionCases:'NOT_RUN',pointer:'NOT_RUN'},
  lowerBound:null,upperBound:null,totalDrags:null,
  pending:['Bind all source carriers/colors/layers to the latest 33-body candidate; earlier 34-body drafts superseded.',
    'Complete route in original model within normal upper bound15, then qualified lower11 and mechanism cases.',
    'Real Pointer with original140 seconds and78/100 star targets; no current candidate route is complete.']});
for(const id of [141,143]){
  const file=root+'/source'+id+'/summary.json';if(!fs.existsSync(file))continue;
  const extra=read(file),row=levels.find(x=>x.id===id);
  row.candidate=extra.candidate??null;row.gates={...row.gates,...extra.gates};
  row.sourceEvidence.push(evidence(file));
  row.lowerBound=extra.L??null;row.upperBound=extra.U??null;row.totalDrags=extra.drags??null;
  row.pending=extra.pending??row.pending;row.routeSearch=extra.search??null;
}
levels.sort((x,y)=>x.id-y.id);assert.deepEqual(levels.map(x=>x.id),[141,142,143,144,145,146,147,148,149,150]);
const pointerFiles=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name.startsWith('pointer-')).map(x=>root+'/'+x.name+'/report.json').filter(fs.existsSync);
const pointerReports=pointerFiles.map(f=>({file:f,data:read(f)}));
const staticReports=fs.readdirSync(root).filter(f=>/^static-review-\d+\.json$/.test(f)).map(f=>({file:root+'/'+f,data:read(root+'/'+f)}));
for(const row of levels){
  row.preservedEvaluation=baseline.levels[row.id-1].starTargets;
  row.originalTimeLimit=baseline.levels[row.id-1].level.timeSeconds;
  row.gates.native??=row.gates.static==='PASS'?'PASS':'NOT_RUN';
  row.formalAdopted=false;row.finalLevelsPointer='NOT_RUN';row.humanBlindTested=false;row.mobileTested=false;row.published=false;
  if(row.candidate){
    const file=local(row.candidate),candidate=read(file);
    row.candidate=file;row.candidateSha256=hash(file);row.levelSha256=digest(candidate.level);row.routeSha256=digest(candidate.drags??[]);
    if(candidate.levelSha256)assert.equal(candidate.levelSha256,row.levelSha256);
    row.bodyCount=candidate.level.blocks.length;
    row.staticEvidence=staticReports.flatMap(r=>r.data.reports.filter(x=>x.levelSha256===row.levelSha256&&x.routeSha256===row.routeSha256).map(x=>({...evidence(r.file),status:x.status})));
    if(row.staticEvidence.some(x=>x.status==='PASS'))row.gates.static='PASS';
    row.pointerEvidence=pointerReports.flatMap(r=>r.data.rows.filter(x=>x.levelSha256===row.levelSha256&&x.routeSha256===row.routeSha256).map(x=>({
      ...evidence(r.file),status:r.data.status==='PASS'?x.status:'FAIL',
      injection:true,formalObjectIdentity:false,moves:x.final?.moves??null,repositions:x.nonClearingDrags??null,
      actualSeconds:x.naturalTimingReplay?.activeSeconds??null,remainingSeconds:x.final?.remainingSeconds??null,
      nativeDrawAudit:x.nativeDrawAudit,naturalTimingReplay:x.naturalTimingReplay,
      errors:r.data.errors,drift:r.data.drift,
    })));
    row.actualPointer=row.pointerEvidence.findLast(x=>x.status==='PASS')??null;
    if(row.actualPointer){
      row.gates.pointer='PASS_CANDIDATE_INJECTION';
      row.starAssessment={targets:row.preservedEvaluation,
        routeMeetsMoveTarget:row.actualPointer.moves<=row.preservedEvaluation.moveTarget,
        thisRunMeetsTimeTarget:row.actualPointer.actualSeconds<=row.preservedEvaluation.timeTargetSeconds,
        targetsChanged:false};
    }
    if(row.id===149){
      row.routeSearch=structuredClone(candidate.search);
      row.additionalRouteEvidence=[evidence('root149/deep-1790252104613.json'),evidence('root149/attempts-1790252278867.json'),evidence('root149/resumed-1790252721743.json')];
      row.additionalRouteFindings='Latest33-body deep search stopped at300000 states/15 clears/partial cost40; early-green variants tested12 seeds, best12 clears. No complete route or lower-bound result.';
    }
  }else{
    row.pending.push('Generate the original q0 candidate, full route, fresh applicable lower bound, decision/recovery cases and real Pointer.');
  }
  if(row.candidate&&row.lowerBound===null)row.pending.push('Qualified fresh lower bound'+row.target[0]+' is not certified for this candidate.');
  if(row.candidate&&!row.actualPointer)row.pending.push('Complete a passing natural-time candidate Pointer test with matching level and route hashes.');
  row.candidateFullyValidated=row.id===145&&row.gates.floor==='PASS'&&row.gates.static==='PASS'&&row.gates.fullRoute==='PASS'&&row.gates.decisionCases==='PASS'&&!!row.actualPointer&&row.pending.length===0;
  row.readyForMainTaskIntegrationReview=row.candidateFullyValidated;
}
const result={schemaVersion:1,generatedAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,
  activeRuleSha256:active.sha256,scope:[141,150],
  status:'INCOMPLETE_BATCH_HANDOFF',
  producedCandidateLevels:levels.filter(x=>x.candidate).map(x=>x.id),
  fullRouteLevels:levels.filter(x=>x.gates.fullRoute==='PASS').map(x=>x.id),
  pointerValidatedCandidateLevels:levels.filter(x=>x.actualPointer).map(x=>x.id),
  fullyValidatedCandidateLevels:levels.filter(x=>x.candidateFullyValidated).map(x=>x.id),
  formalAdopted:0,fullBatchValidated:false,published:false,
  scopedProductionPreservation:evidence('preservation-1790252989473.json'),
  integrationPolicy:'Main-task single writer integrates only fully validated candidates and reruns final LEVELS / real Pointer. This index does not change production or source rules.',
  notes:[
    'Task-local STATUS replaces shared WORKSTATE writes under the parallel task ownership contract; main task aggregates WORKSTATE.',
    'Early isolated evidence was written before discovery of the parallel contract, at deliverables/remake141-150-v146-20260924; preserved, not rewritten.',
    'All candidate and route SHA fields below are independently recomputed, separate from file byte hashes.',
    'A relaxed shortcut disproves that particular lower-bound certificate, not the original level minimum. Bounded route exhaustion is not an impossibility proof.',
    'Pointer input injects candidates into actual Game/Canvas with isolated MemoryHost, natural clock, no boosters and forbidden player Storage; it is not final production identity or human blind testing.',
    'Historical unsuccessful candidate layouts/proofs/Pointer runs retained. Each current evidence join checks level and route hashes.'
  ],levels,bindings};
fs.writeFileSync(root+'/summary.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:root+'/summary.json',levels:levels.length,candidates:result.producedCandidateLevels,fullRoutes:result.fullRouteLevels,pointer:result.pointerValidatedCandidateLevels,fullyValidated:result.fullyValidatedCandidateLevels,adopted:0}));
