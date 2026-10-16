import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {designFingerprints} from './bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
const root='deliverables/daily-formal-v3-20261008',directory=`${root}/design/macro-opening-guarded8-02`,ledger=`${root}/proof/attempts`;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),report=read(`${directory}/report.json`),plan=read(`${directory}/plan.json`),rows=[];
assert.equal(report.rows.length,8);assert.equal(report.searches,8);assert.equal(report.claims,8);assert.equal(report.accepted.length,1);assert.equal(report.planSha256,sha(`${directory}/plan.json`));
for(const b of plan.bindings)assert.equal(sha(b.path),b.sha256);for(const p of plan.inputs)assert.equal(sha(p.file),p.sha256);
for(const row of report.rows){
 const q=read(row.path),p=q.proof,g=q.guardAllowance,f=designFingerprints(q.level),requestFile=`${ledger}/${q.attempt.id}.request.json`,resultFile=`${ledger}/${q.attempt.id}.result.json`,request=read(requestFile),result=read(resultFile),input=plan.inputs.find(x=>x.levelSha256===q.levelSha256);
 assert(input);assert.equal(sha(row.path),row.fileSha256);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(q.levelSha256,read(q.previewInput.file).levelSha256);assert.equal(sha(q.previewInput.file),q.previewInput.sha256);
 assert.equal(q.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');assert.equal(q.guardWrapper.sha256,'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3');
 assert.equal(p.floor,16);assert.equal(p.budget.maxStates,9999);assert.equal(p.discoveredStates,p.rawFullBoardStates);assert.equal(p.visitedStates,p.rawFullBoardStates);assert.equal(p.exploredStates,p.rawExploredStates);
 assert.equal(g.registeredRawSetStates,p.rawFullBoardStates);assert.equal(g.unregisteredTerminalWorldAllowance,1);assert.equal(g.conservativeFullBoardStateUpperBound,p.rawFullBoardStates+1);assert(g.conservativeFullBoardStateUpperBound<=10000);assert.equal(g.exactFullBoardVisitedCountClaimed,false);assert.deepEqual(g,p.guardAllowance);
 assert.equal(result.accepted,q.accepted);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,p);assert.deepEqual(result.upper,p);assert.equal(request.levelSha256,q.levelSha256);assert.equal(request.shapeSha256,f.shapeSha256);assert.equal(request.colorSha256,f.colorSha256);
 assert.equal(request.redesignOf,input.redesignOf);assert.equal(q.redesignOf,input.redesignOf);const parent=read(q.failedParent.requestFile),parentResult=read(q.failedParent.resultFile);assert.equal(parentResult.accepted,false);assert.equal(parent.id,q.redesignOf);
 assert.equal(sha(q.failedParent.file),q.failedParent.sha256);assert.equal(sha(q.failedParent.requestFile),q.failedParent.requestSha256);assert.equal(sha(q.failedParent.resultFile),q.failedParent.resultSha256);
 const priorColours=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=f.colorAssignments.filter(b=>priorColours.has(b.id));assert.notEqual(parent.shapeSha256,f.shapeSha256);assert.notEqual(parent.colorSha256,f.colorSha256);
 assert(shared.length?shared.some(b=>priorColours.get(b.id)!==JSON.stringify(b.colors)):JSON.stringify(parent.colorAssignments.map(b=>b.colors).sort())!==JSON.stringify(f.colorAssignments.map(b=>b.colors).sort()));
 const blockFiles=[`${ledger}/${q.attempt.identityOrigin}.blocked.json`,`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`];for(const file of blockFiles)assert.equal(fs.existsSync(file),!q.accepted);
 let routeSummary=null;
 if(q.accepted){
  assert.equal(p.status,'threshold-proven');assert.equal(p.thresholdProven,true);assert.equal(p.routeTermination,'minimum-relaxed-route-found');assert.equal(p.cost,q.L);assert(p.certifiedFloor>=q.L);assert.equal(q.L,q.U);assert.equal(q.difficulty,3);assert(q.L>=31);
  assert(q.replay.valid&&q.replay.complete&&!q.replay.failed);assert(q.independentReplay.valid&&q.independentReplay.complete&&!q.independentReplay.failed);assert.equal(q.replay.nonClearingDrags,q.U);assert.equal(q.independentReplay.nonClearingDrags,q.U);assert.equal(q.replay.effectiveDrags,q.independentReplay.effectiveDrags);
  assert.equal(routeSha256(q.drags),q.routeSha256);assert.deepEqual(q.drags,p.drags);assert.equal(q.independentReplay.remainingBodies,0);assert.equal(q.independentReplay.remainingQueued,0);
  assert.deepEqual(q.independentReplay.trace.filter(x=>x.clearDelta===1).map(x=>x.blockId).sort(),q.level.blocks.map(b=>b.id).sort());
  routeSummary={routeSha256:q.routeSha256,drags:q.drags.length,nonClears:q.U,clears:q.replay.clearEvents,actualMinimum:q.U,remainingBodies:0,remainingQueued:0,sameJointSearch:true};
 }else{assert.equal(q.L,null);assert.equal(q.U,null);}
 rows.push({...row,levelSha256:q.levelSha256,request:{path:requestFile,sha256:sha(requestFile)},result:{path:resultFile,sha256:sha(resultFile)},
  parent:{path:q.failedParent.file,sha256:q.failedParent.sha256,id:q.redesignOf,actualShapeAndColourBothChanged:true,branchRetainedAsPredeclared:true},blocked:blockFiles.map(path=>({path,exists:fs.existsSync(path),...(fs.existsSync(path)?{sha256:sha(path)}:{})})),
  originalGuardAllowance:g,proofStatus:p.status,certifiedFloor:p.certifiedFloor,routeSummary,actualReplayError:q.replay?.error??null,elapsedMilliseconds:p.elapsedMilliseconds});
}
const output={status:'FIXED_EIGHT_COMPLETE_ONE_D3_SEVEN_BLOCKED',formalReady:false,additionalSearchesDuringAudit:0,previousSearches:8,accepted:1,
 report:{path:`${directory}/report.json`,sha256:sha(`${directory}/report.json`)},plan:{path:`${directory}/plan.json`,sha256:sha(`${directory}/plan.json`)},
 summary:{guardBudgetReached:rows.filter(r=>r.termination==='max-raw-board-states').length,finiteDomainWithoutRoute:rows.filter(r=>r.routeTermination==='search-upper-exhausted').length,rejectedActualRoute:rows.filter(r=>r.status==='REJECTED_ORIGINAL_ROUTE').length,
  accepted:rows.filter(r=>r.accepted).map(r=>({path:r.path,sha256:r.fileSha256,source:r.sourceLevelId,difficulty:r.difficulty,L:r.L,U:r.U,drags:r.routeSummary.drags,clears:r.routeSummary.clears,guardConservativeBound:r.conservativeWholeBoardUpperBound}))},rows,
 findings:['Source118 is a genuine new D3: the completed joint search proves relaxed minimum40, and both original-model complete witnesses cost40, giving actual minimum40. It retains normal7x8/56-cell source geometry and clears all20 bodies in60 gestures.','The four UNKNOWN raw-limit objects register9999 worlds and reserve one terminal world. Partial floors do not become accepted certificates.','Source120 relaxed cost2 is not an actual upper bound: both original replays reject the body exit at zero-based drag11. This physical input is blocked, with no route repair or solver retry.','The supplied first-clear plus parking construction improved opening feasibility but is not by itself a full-route guarantee. Source198 and151 find no route in the predeclared finite joint domain.','Ancestry stays on the exact previously bound source-failure branches, including source60 before parallel beam04. Each public claim checked both actual shape and colour changes.'],
 limitations:['The accepted object remains an exploratory plain base; stage mechanism adaptation, final object qualification and Pointer acceptance are not performed by this batch.','No additional macro candidates or searches are authorized or created by this completion audit.']};
fs.writeFileSync(`${directory}/completion-audit.json`,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(output.summary));
