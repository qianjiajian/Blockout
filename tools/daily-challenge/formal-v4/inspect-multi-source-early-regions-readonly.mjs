import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';

// Supplied-reference replay only. No factory, CSP, search, ledger claim or
// frozen mechanism image is created by this exploratory source inventory.
const V4='deliverables/daily-formal-v4-20261008',V3='deliverables/daily-formal-v3-20261008';
const out=process.argv[2]??`${V4}/design/multi-source-early-ice-readonly-01.json`;
assert(!fs.existsSync(out),'Keep previous evidence immutable');
const bindings={},sha=b=>createHash('sha256').update(b).digest('hex');
function read(p,h){const b=fs.readFileSync(p),s=sha(b);if(h)assert.equal(s,h);if(bindings[p])assert.equal(bindings[p],s);bindings[p]=s;return JSON.parse(b);}
const desc=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const sourceReportPath=`${V4}/design/low-band-late-options-readonly-01/report.json`,sourceReport=read(sourceReportPath);
const legacyBranchPath=`${V3}/design/macro-prefix64-04/scope156/preview-1/report.json`,legacyBranch=read(legacyBranchPath);
const low16Path=`${V4}/design/low-band-sixteen-math-01/completion.json`,low16=read(low16Path);
const low32Path=`${V4}/proof/low-band-thirtytwo-actual-independent-01/terminal-handoff-02.json`,low32=read(low32Path,'6c6f879d26f4ad6acbd8aac7a196c66a88e4766326f609a2864b42c2f2c1a15f');
const pendingPath=`${V4}/design/low-band-diverse-twenty-proposal-02/proposal.json`,pending=read(pendingPath);
const selectionPath=`${V4}/selection/completed-basic-and-advanced-153-01/index.json`,selection=read(selectionPath,'a12babe4ad50dc649eb3a409cd6d39cbd5b6c536df33bc4446d348b458488135');
assert.equal(selection.files.length,153);
const specs=[[154,'bar-global-09/candidate-0710',27],[109,'axial3-global-10/candidate-0338',20],[60,'wide-rect-06/candidate-0511',21],
 [130,'axial2-rect-10/candidate-0631',16],[40,'bar-global-09/candidate-0591',14],[86,'nearband14-second/candidate-0061',19],
 [200,'nearband14-second/candidate-0032',16],[4,'nearband20-short-references/candidate-0002',15]];
const runtime=await loadV4Runtime(),snapshotPath=path.resolve('snapshot-environment.json'),snapshot=read(snapshotPath);
assert.equal(path.resolve(snapshot.workspace),process.cwd());assert.equal(snapshot.frozenMath,runtime.toolchainSha256);
const historicalManifestPath=path.resolve('docs/rules/manifest.json'),historicalManifest=read(historicalManifestPath);
const currentManifestPath=path.join(snapshot.sourceWorkspace,'docs/rules/manifest.json'),currentManifest=read(currentManifestPath);
assert.equal(historicalManifest.activeVersion,'1.156.0');assert.equal(currentManifest.activeVersion,'1.157.0');
const historicalRule=historicalManifest.versions.find(v=>v.version===historicalManifest.activeVersion),currentRule=currentManifest.versions.find(v=>v.version===currentManifest.activeVersion);
for(const [root,rule]of [[process.cwd(),historicalRule],[snapshot.sourceWorkspace,currentRule]]){const p=path.join(root,rule.document),b=fs.readFileSync(p);assert.equal(sha(b.toString().replaceAll('\r\n','\n')),rule.sha256);bindings[p]=sha(b);}
const ui=path.resolve('src/game/ColorEscapeGame.ts');assert.equal(sha(fs.readFileSync(ui)),snapshot.historicalUI.sha256);bindings[ui]=snapshot.historicalUI.sha256;
const environment={status:'READ_ONLY_HISTORICAL_REFERENCE_REPLAY_WITH_CURRENT_POLICY_SEPARATE',sourceWorkspace:snapshot.sourceWorkspace,
 executionWorkspace:process.cwd(),historicalManifest:desc(historicalManifestPath),currentManifest:desc(currentManifestPath),historicalReplayPolicy:historicalRule.version,currentPolicy:currentRule.version,
 mathematicalToolchainSha256:runtime.toolchainSha256,currentRuntimeValidationClaimed:false,newProductionQualificationClaimed:false,
 limitation:'Original prefixExecutionEnvironment rejects the changed manifest. It was not changed or used to claim current-policy compatibility. Only pre-existing reference routes are replayed in the authentic historical workspace.'};
Object.assign(bindings,runtime.toolchainBindings);
const ledger=`${V3}/proof/attempts`,requestFiles=fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json')).sort();
const requests=requestFiles.map(n=>JSON.parse(fs.readFileSync(`${ledger}/${n}`))),children=new Map();
for(const q of requests)if(q.redesignOf){const a=children.get(q.redesignOf)??[];a.push(q);children.set(q.redesignOf,a);}
const rows=[];
for(const [source,suffix,cut] of specs){
 const r=sourceReport.rows.find(x=>x.sourceLevelId===source&&x.reference.path.includes(suffix));assert(r);
 const o=r.options.find(x=>x.prefixDrags===cut);assert(o&&o.connected&&o.fraction>=.35&&[2,4].includes(o.prefixClears));
 const q=read(r.reference.path,r.reference.sha256);assert(q.accepted);assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(routeSha256(q.drags),r.fullRouteSha256);
 runtime.assertPlainProofDomain(q.level);
 const sourceBinding=await currentMainlineSourceBinding(runtime,environment,source);Object.assign(bindings,sourceBinding.bindings);
 assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(runtime.LEVELS.find(x=>x.id===source)));
 const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
 for(const a of [canonical,independent]){assert(a.valid&&a.complete&&!a.failed);assert.equal(a.nonClearingDrags,q.U);assert.equal(a.clearEvents,q.level.blocks.length);}
 const staticAudit=await auditV4StaticCandidate(runtime,{formalId:'daily-basic-combined-d3-01',stageKey:'basic-combined',difficulty:3,slot:1,newestMechanism:null,sourceLevelId:source,level:q.level});
 assert(staticAudit.passed,JSON.stringify(staticAudit.issues));Object.assign(bindings,staticAudit.policyBindings);
 for(const [asset,h]of Object.entries(staticAudit.assetBindings)){assert.equal(sha(fs.readFileSync(`public/${asset}`)),h);bindings[`public/${asset}`]=h;}
 const ids=new Set(o.region.bodyIds),region=q.level.blocks.filter(b=>ids.has(b.id)),outside=q.level.blocks.filter(b=>!ids.has(b.id));
 assert.equal(ids.size,region.length);const cells=region.flatMap(absoluteCells).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);assert.deepEqual(cells,o.region.cells);
 const points=new Set(cells.map(p=>p.join(','))),todo=[cells[0]],seen=new Set();
 for(const p of todo){const k=p.join(',');if(seen.has(k))continue;seen.add(k);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy];if(points.has(n.join(','))&&!seen.has(n.join(',')))todo.push(n);}}
 assert.equal(seen.size,cells.length);assert(outside.every(b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))));
 const prefix=q.drags.slice(0,cut);assert(prefix.every(d=>!ids.has(d.blockId)));assert.equal(q.drags.findIndex(d=>ids.has(d.blockId)),cut);
 const model=new runtime.PuzzleModel(structuredClone(q.level));model.startCountdown();const clearEvents=[];let parking=0,unitSteps=0;
 for(const [i,d]of prefix.entries()){
  const before=model.snapshot();model.beginAction();let auto=canonicalExit(runtime,model,d.blockId);assert(!auto||!d.path.length);
  for(const [j,p]of d.path.entries()){const b=model.getBlock(d.blockId),from=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);assert(model.moveBlockStep(d.blockId,...p));unitSteps++;
   auto=canonicalExit(runtime,model,d.blockId,from);assert(!auto||j===d.path.length-1);}
  assert.equal(auto,d.exitSide);let exit;if(auto){exit=model.tryExit(d.blockId,auto);assert(exit.ok);}
  assert(model.commitAction());const after=model.snapshot();assert.equal(after.cleared-before.cleared,Number(!!auto));
  if(auto)clearEvents.push({drag:i+1,blockId:d.blockId,gateId:exit.gateId,side:auto,area:q.level.blocks.find(b=>b.id===d.blockId).shape.length});else parking++;
 }
 assert.equal(parking,o.prefixParking);assert.equal(clearEvents.length,o.prefixClears);
 for(const b of region){const actual=model.getBlock(b.id);assert(actual);assert.equal(actual.x,b.x);assert.equal(actual.y,b.y);}
 const originalRequest=read(`${ledger}/${q.attempt.id}.request.json`),originalResult=read(`${ledger}/${q.attempt.id}.result.json`);
 assert.deepEqual(originalRequest,q.attempt);assert.equal(originalResult.accepted,true);assert.equal(originalResult.levelSha256,q.levelSha256);
 let parent=legacyBranch.latestFailedBySource.find(x=>x.source===source);assert(parent);let parentFile=parent.file,parentId=parent.id;
 for(const x of low16.results.filter(x=>x.sourceLevelId===source&&!x.accepted)){parentFile=x.file;parentId=x.attemptId;}
 const x32=low32.latestFailedParentsBySource.find(x=>x.sourceLevelId===source);if(x32){parentFile=x32.receipt?.path??x32.file;parentId=x32.id;}
 // Follow the currently visible failed descendants of the declared branch.
 // Never treat a different accepted reference or unrelated source branch as
 // the failed physical object being resumed.
 const followed=[];let frontier=[parentId];while(frontier.length){const id=frontier.shift();for(const child of children.get(id)??[]){const p=`${ledger}/${child.id}.result.json`;if(!fs.existsSync(p))throw Error('An active descendant prevents current branch claim');const result=read(p);
   if(result.accepted===false){followed.push(child);frontier.push(child.id);}}}
 if(followed.length){followed.sort((a,b)=>a.startedAt.localeCompare(b.startedAt));parentId=followed.at(-1).id;parentFile=null;}
 const req=read(`${ledger}/${parentId}.request.json`),result=read(`${ledger}/${parentId}.result.json`);assert.equal(result.accepted,false);
 const blocked=read(`${ledger}/${parentId}.blocked.json`),identityBlocked=read(`${ledger}/identities/${req.retryIdentitySha256}.blocked.json`);assert.equal(blocked.attemptId,parentId);assert.equal(identityBlocked.attemptId,parentId);
 if(parentFile){const f=read(parentFile);assert.equal(f.accepted,false);assert.deepEqual(f.attempt,req);assert.equal(f.sourceLevelId,source);}
 rows.push({sourceLevelId:source,reference:r.reference,referencePublicRequest:desc(`${ledger}/${q.attempt.id}.request.json`),referencePublicResult:desc(`${ledger}/${q.attempt.id}.result.json`),referenceL:q.L,referenceU:q.U,referenceDrags:q.drags.length,
  fullRouteSha256:r.fullRouteSha256,fullCanonical:canonical,fullIndependent:independent,board:{width:q.level.width,height:q.level.height,area:boardCells(q.level).length,maskSha256:boardBaselineSha256(q.level)},
  region:{...o.region,area:cells.length,fraction:o.fraction,connected:true,originalBodyCount:region.length},outsideAllSolidRectangles:true,
  prefix:{drags:cut,parking,clears:clearEvents.length,unitSteps,sha256:routeSha256(prefix),clearEvents,remainingBodies:model.snapshot().blocks.length,releasedArea:clearEvents.reduce((n,x)=>n+x.area,0),firstRegionAction:cut+1},
  proposedIceInitialCount:clearEvents.length,iceAssignmentNotCreated:true,thawEventByKnownPrefix:clearEvents.at(-1),allOriginalGatesToPreserve:q.level.gates,
  normalSourceAndQ0:{passed:true,sourceBinding,artRequirements:staticAudit.artRequirements,assetBindings:staticAudit.assetBindings},
  currentFailedBranch:{id:parentId,receipt:parentFile?desc(parentFile):null,request:desc(`${ledger}/${parentId}.request.json`),result:desc(`${ledger}/${parentId}.result.json`),blocked:desc(`${ledger}/${parentId}.blocked.json`),identityBlocked:desc(`${ledger}/identities/${req.retryIdentitySha256}.blocked.json`),descendantsRead:followed.length},
  caveats:[...([60,130,200].includes(source)?['Reference also used by pending low20; no proposed/new stock may be reused.']:[]),...([154,40,86].includes(source)?['Known family/visible retained skeleton requires fresh final visual and all-pool comparison.']:[]),
   'Prefix parking and original plain reference U do not prove new D3 difficulty.','Final new stock, palette/gate-domain feasibility, actual iced bridge and complete tail U are not yet constructed or certified.'],
  accepted:false,catalogEligible:false,newCandidate:false});
 console.log(JSON.stringify({source,referenceU:q.U,cut,parking,clears:clearEvents.length,area:cells.length,board:boardCells(q.level).length,parent:parentId.slice(0,12)}));
}
assert.deepEqual(fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json')).sort(),requestFiles,'Public claims changed during reference-only observation');
for(const [p,h]of Object.entries(bindings))assert.equal(sha(fs.readFileSync(p)),h,'Read-only input changed');
const report={status:'READ_ONLY_EARLY_ICE_MULTI_SOURCE_REFERENCE_FEASIBILITY',executable:false,selection:desc(selectionPath),sourceReport:desc(sourceReportPath),pendingLow20:desc(pendingPath),environment,
 sourceCount:rows.length,normalMaskCount:new Set(rows.map(r=>r.board.maskSha256)).size,rows,
 recommendationOrder:[154,109,40,4,86,60,130,200],futureRequiredChecks:['New shape AND color relative to each current failed branch and all physical history.','Preserve source normal mask and all original gates; replace the entire selected connected region using native q0 material.','Fresh actual iced prefix bridge, one predeclared full U task, then original full iced L31; no old failure retry.','Final all-selected/source/old450 similarity and visual-family check; no slot or successful-family inheritance from this report.'],
 newConstructions:0,newSearches:0,newLedgerClaims:0,newPhysicalCandidates:0,newLowerBounds:0,publicRequestCount:requestFiles.length,fileBindings:bindings};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:out,sha256:sha(fs.readFileSync(out)),sourceCount:rows.length,normalMaskCount:report.normalMaskCount,newSearches:0}));
