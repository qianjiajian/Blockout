import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {designFingerprints} from './bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
const root='deliverables/daily-formal-v3-20261008',directory=`${root}/design/macro-region-guarded12-01`,ledger=`${root}/proof/attempts`;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),report=read(`${directory}/report.json`),plan=read(`${directory}/plan.json`),rows=[];
assert.equal(report.rows.length,12);assert.equal(report.searches,12);assert.equal(report.claims,12);assert.equal(report.accepted.length,0);assert.equal(report.planSha256,sha(`${directory}/plan.json`));
for(const b of plan.inputBindings)assert.equal(sha(b.path),b.sha256);for(const p of plan.inputs)assert.equal(sha(p.file),p.fileSha256);
const previousFailure=new Map();
for(const row of report.rows){
 const q=read(row.path),p=q.proof,g=q.guardAllowance,f=designFingerprints(q.level),requestFile=`${ledger}/${q.attempt.id}.request.json`,resultFile=`${ledger}/${q.attempt.id}.result.json`,request=read(requestFile),result=read(resultFile);
 assert.equal(sha(row.path),row.fileSha256);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(q.levelSha256,q.previewInput?read(q.previewInput.file).levelSha256:null);
 assert.equal(q.proofToolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');assert.equal(q.guardWrapper.sha256,'9ee948a4bb195ee3d98bdbf8170ed8ab02c539926843d374dd213a855d135dd3');
 assert.equal(p.floor,31);assert.equal(p.budget.maxStates,9999);assert.equal(p.discoveredStates,p.rawFullBoardStates);assert.equal(p.visitedStates,p.rawFullBoardStates);assert.equal(p.exploredStates,p.rawExploredStates);
 assert.equal(g.registeredRawSetStates,p.rawFullBoardStates);assert.equal(g.unregisteredTerminalWorldAllowance,1);assert.equal(g.conservativeFullBoardStateUpperBound,p.rawFullBoardStates+1);assert(g.conservativeFullBoardStateUpperBound<=10000);assert.equal(g.exactFullBoardVisitedCountClaimed,false);assert.deepEqual(g,p.guardAllowance);
 assert.equal(q.accepted,false);assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(result.accepted,false);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,p);assert.deepEqual(result.upper,p);
 assert.equal(request.levelSha256,q.levelSha256);assert.equal(request.shapeSha256,f.shapeSha256);assert.equal(request.colorSha256,f.colorSha256);
 assert.equal(q.redesignOf,previousFailure.get(q.sourceLevelId)?.id??null);assert.equal(request.redesignOf,q.redesignOf);
 let changeFromLastFailure=null;
 if(q.redesignOf){const old=previousFailure.get(q.sourceLevelId),oldColours=new Map(old.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=f.colorAssignments.filter(b=>oldColours.has(b.id));
  const colorsChanged=shared.length?shared.some(b=>oldColours.get(b.id)!==JSON.stringify(b.colors)):JSON.stringify(old.colorAssignments.map(b=>b.colors).sort())!==JSON.stringify(f.colorAssignments.map(b=>b.colors).sort());
  assert.notEqual(f.shapeSha256,old.shapeSha256);assert.notEqual(f.colorSha256,old.colorSha256);assert(colorsChanged);changeFromLastFailure={shapeInventory:true,colouredCells:true,actualColourAssignments:true};}
 previousFailure.set(q.sourceLevelId,request);
 const blockFiles=[`${ledger}/${q.attempt.identityOrigin}.blocked.json`,`${ledger}/identities/${request.retryIdentitySha256}.blocked.json`];for(const file of blockFiles)assert(fs.existsSync(file));
 let actualMinimum=null;
 if(q.actualCompleteWitnessU!==undefined){assert(q.replay.valid&&q.replay.complete&&!q.replay.failed);assert(q.independentReplay.valid&&q.independentReplay.complete&&!q.independentReplay.failed);assert.equal(q.replay.nonClearingDrags,q.independentReplay.nonClearingDrags);assert.equal(routeSha256(q.drags),q.routeSha256);assert.equal(p.status,'relaxed-shortcut');assert.equal(p.cost,q.actualCompleteWitnessU);assert(p.certifiedFloor>=p.cost);actualMinimum=p.cost;}
 rows.push({...row,levelSha256:q.levelSha256,request:{path:requestFile,sha256:sha(requestFile)},result:{path:resultFile,sha256:sha(resultFile)},blocked:blockFiles.map(path=>({path,sha256:sha(path)})),changeFromLastFailure,
  originalGuardAllowance:g,proofStatus:p.status,partialCertifiedFloor:p.certifiedFloor,partialFloorNotAccepted:!q.accepted,actualMinimum,initialOnly:p.rawFullBoardStates===1,elapsedMilliseconds:p.elapsedMilliseconds});
}
const output={status:'FIXED_TWELVE_FAILED_AND_IMMUTABLY_BLOCKED',formalReady:false,newSearchesDuringAudit:0,previousSearches:12,accepted:0,
 report:{path:`${directory}/report.json`,sha256:sha(`${directory}/report.json`)},plan:{path:`${directory}/plan.json`,sha256:sha(`${directory}/plan.json`)},
 summary:{guardBudgetReached:rows.filter(r=>r.termination==='max-raw-board-states').length,searchUpperDomainWithoutRoute:rows.filter(r=>r.routeTermination==='search-upper-exhausted').length,initialOnlyNoClearOrParking:rows.filter(r=>r.initialOnly).length,
 actualBelowBand:rows.filter(r=>r.actualMinimum!==null).map(r=>({path:r.path,source:r.sourceLevelId,minimum:r.actualMinimum})),maximumRegistered:Math.max(...rows.map(r=>r.registeredRaw)),maximumConservativeFullBoardBound:Math.max(...rows.map(r=>r.conservativeWholeBoardUpperBound))},rows,
 findings:['Static macro partition diversity did not preserve the reference exit dependency graph. Five searches remain at the initial full board; their current colour/portal assignment provides no relaxed first clear or non-clearing move.','Two geometries are actually easy: complete canonical and independent witnesses match same-search relaxed minima of 3 and 2. These are useful counterexamples, not accepted D1 results.','Two inputs stop at 9999 registered worlds plus at most one terminal candidate, conservatively 10000. Their partial certifiedFloor fields are not promoted to PASS.','Eight searches did not find a route within the predeclared joint horizon 128. No second solver, added budget, new colour branch or lower-floor retry was used.','The macro family metadata preserves original ancestry and binds the actual whole-board exchange, independent static audit and reviewed Canvas preview. No parent difficulty evidence is transferred.'],
 nextStrategyObservation:'For future new shape-and-colour stocks only, choose portal-compatible translated regions and statically ensure an actual initial exit before claiming, then preserve a known clear/space-transfer sequence where possible. This report authorizes no further batch and does not retry any of these twelve inputs.'};
fs.writeFileSync(`${directory}/completion-audit.json`,JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({summary:output.summary,newSearchesDuringAudit:0}));
