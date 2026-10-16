import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {boardCells,bodyFootprint,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';

// A read-only audit of the eight finite construction outputs. No search/claim API.
const directory='deliverables/daily-formal-v4-20261008/design/macro-prefix-half300-02';
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p,sha256:sha(p)}),points=a=>JSON.stringify([...a].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const report=read(`${directory}/report.json`),plan=read(`${directory}/plan.json`),index=read(`${directory}/index.json`);
const canvas=read(`${directory}/canvas-preview/report.json`),runtime=await loadV4Runtime();
assert.equal(report.newFullLUSearches,0);assert.equal(report.ledgerClaims,0);
assert.equal(report.newFixedColourInputs,8);assert.equal(report.staticPartitionAttempts,222);
assert.equal(report.combinedFixed64ActualInputs,13);assert.equal(index.files.length,8);
assert.equal(report.plan.sha256,sha(report.plan.path));
for(const b of plan.bindings){assert.equal(sha(b.path),b.sha256);assert.equal(sha(`${directory}/${path.basename(b.path)}.snapshot`),b.sha256);}
assert.equal(sha(plan.selected.path),plan.selected.sha256);
const selected=read(plan.selected.path).files.map(p=>({path:p,...read(p)}));
const failedFour=plan.previousFourJoint.sealedFailures;
assert.equal(failedFour.length,4);
assert.deepEqual(plan.futureFirstJointBudgetOnly,{floor:31,searchUpper:128,maxStates:9999,terminalGuardAllowance:1,hardWholeBoardLimit:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:2000,maxMilliseconds:30000});
for(const old of failedFour){
 for(const [field,h]of [['file','sha256'],['input','inputSha256'],['requestFile','requestSha256'],['resultFile','resultSha256'],['blockedFile','blockedSha256'],['identityBlockedFile','identityBlockedSha256']])assert.equal(sha(old[field]),old[h]);
 assert.equal(read(old.resultFile).accepted,false);assert.equal(read(old.resultFile).status,'UNKNOWN_UPPER');
 assert.equal(read(old.file).route.search.termination,'max-transitions');
}
const old450=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>({path:e.path,level:read(e.path).level}));
const requests=fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json')).map(n=>({path:`${ledger}/${n}`,value:read(`${ledger}/${n}`)}));
const rows=[],pairwise=[];
for(const [i,file] of index.files.entries()){
 const q=read(file),p=q.provenance,f=designFingerprints(q.level),ref=read(p.reference),failed=read(q.failedParent.file),ff=designFingerprints(failed.level);
 assert.equal(sha(file),report.candidates[i].sha256);assert.equal(levelSha256(q.level),q.levelSha256);
 assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.drags,null);assert.equal(q.accepted,false);assert.equal(q.formalReady,false);
 assert.equal(sha(p.reference),p.referenceSha256);assert.equal(levelSha256(ref.level),ref.levelSha256);
 for(const [field,hashField]of [['file','sha256'],['requestFile','requestSha256'],['resultFile','resultSha256']])assert.equal(sha(q.failedParent[field]),q.failedParent[hashField]);
 const oldRequest=read(q.failedParent.requestFile),oldResult=read(q.failedParent.resultFile);
 assert.equal(oldRequest.id,q.redesignOf);assert.equal(oldRequest.levelSha256,levelSha256(failed.level));assert.equal(oldResult.accepted,false);
 assert(fs.existsSync(`${ledger}/${q.redesignOf}.blocked.json`));
 const realChanges=[];
 for(const [label,prior]of [['reference',ref.level],['lastFailed',failed.level],...failedFour.map((p,n)=>[`sealedFailure-${n}`,read(p.file).level]),...index.files.slice(0,i).map((p,n)=>[`previousNew-${n}`,read(p).level])]){
  const pf=designFingerprints(prior),shared=f.colorAssignments.filter(c=>pf.colorAssignments.some(d=>c.id===d.id&&JSON.stringify(c.colors)!==JSON.stringify(d.colors)));
  assert.notEqual(f.shapeSha256,pf.shapeSha256);assert.notEqual(f.colorSha256,pf.colorSha256);assert(shared.length>0);
  realChanges.push({label,shapeChanged:true,colouredCellsChanged:true,sharedIdsRecoloured:shared.map(c=>c.id)});
 }
 const failedPairComparisons=failedFour.map(p=>({path:p.file,...compareLayouts(q.level,read(p.file).level)}));
 assert(failedPairComparisons.every(r=>r.footprintSimilarity<=.65));
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});assert.equal(identity,q.unattemptedIdentity.identity);
 const identityPaths=[`${ledger}/identities/${identity}.json`,`${ledger}/identities/${identity}.blocked.json`,`${ledger}/${f.designSha256}.request.json`,`${ledger}/${f.designSha256}.blocked.json`];
 assert(identityPaths.every(p=>!fs.existsSync(p)),'Candidate was already claimed');
 const collisions=requests.filter(r=>r.value.id===f.designSha256||r.value.shapeSha256===f.shapeSha256&&r.value.colorSha256===f.colorSha256);
 assert.equal(collisions.length,0,'Historical request collision even if identity alias is missing');
 const regionIds=new Set(p.region.bodyIds),oldRegion=ref.level.blocks.filter(b=>regionIds.has(b.id));
 const oldFootprints=new Set(ref.level.blocks.map(bodyFootprint)),newFootprints=new Set(q.level.blocks.map(bodyFootprint));
 const changedOld=ref.level.blocks.filter(b=>!newFootprints.has(bodyFootprint(b))),changedNew=q.level.blocks.filter(b=>!oldFootprints.has(bodyFootprint(b)));
 assert.equal(points(oldRegion.flatMap(absoluteCells)),points(p.region.cells));
 assert.equal(points(changedOld.flatMap(absoluteCells)),points(changedNew.flatMap(absoluteCells)));
 assert.equal(points(changedOld.flatMap(absoluteCells)),points(p.region.cells));
 const source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId);
 assert.equal(points(boardCells(q.level)),points(boardCells(source)));assert.equal(q.level.width,source.width);assert.equal(q.level.height,source.height);
 assert.equal(points(q.level.blocks.flatMap(absoluteCells)),points(boardCells(q.level)));
 assert.equal(changedOld.length,8);assert.equal(p.region.cells.length,24);assert.equal(boardCells(q.level).length,56);assert(p.region.areaFraction>=.35);
 runtime.assertPlainProofDomain(q.level);const staticAudit=runtime.auditRevisedCandidate(q.level,undefined);
 assert.equal(staticAudit.issues.filter(r=>r.category!=='source'&&r.code!=='wrong-rule-profile').length,0);
 const assets=q.level.blocks.map(b=>{const m=runtime.matchFormalBlockShape(b.shape,'native-only');assert.equal(m?.quarterTurns,0);
  const asset=runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[m.shapeId];assert(asset);
  const file=asset.startsWith('/')?`public${asset}`:`public/${asset}`;assert(fs.statSync(file).isFile());
  return{blockId:b.id,shapeId:m.shapeId,quarterTurns:0,...bind(file)};});
 assert.deepEqual(q.openingProbe.drags,q.prefixBlueprint.drags);assert.deepEqual(q.openingProbe.drags,ref.drags.slice(0,32));
 const model=new runtime.PuzzleModel(q.level);model.startCountdown();const trace=[];
 for(const [n,drag]of q.openingProbe.drags.entries()){
  const before=model.snapshot();applyNativeDrag(model,drag);const after=model.snapshot();
  assert.equal(after.moves,before.moves+1);assert.equal(after.cleared-before.cleared,n===0?1:0);
  assert.equal(after.failed,false);trace.push({drag:n+1,blockId:drag.blockId,clearDelta:after.cleared-before.cleared,snapshotSha256:levelSha256(after)});
 }
 const final=model.snapshot();assert.equal(final.complete,false);assert.equal(final.blocks.length,19);assert.equal(final.queuedBlocks.length,0);
 const positions=blocks=>blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape})).sort((a,b)=>a.id.localeCompare(b.id));
 assert.deepEqual(positions(final.blocks),positions(q.openingProbe.afterPrefixLevel.blocks));
 const nearSelected=selected.map(r=>({path:r.path,sameGroup:r.stageKey==='basic-combined'&&r.difficulty===3,...compareLayouts(q.level,r.level)}));
 for(const r of nearSelected)assert(r.footprintSimilarity<=(r.sameGroup?.65:.75));
 const nearOld=old450.map(r=>({path:r.path,...compareLayouts(q.level,r.level)})).sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0];assert(nearOld.footprintSimilarity<=.75);
 const parentComparison=compareLayouts(q.level,ref.level);assert(parentComparison.footprintSimilarity<=.65);
 const shot=canvas.rows.find(r=>r.file===file);assert(shot);assert.equal(shot.fileSha256,sha(file));assert.equal(sha(shot.image),shot.imageSha256);
 assert.equal(shot.errors.length+shot.storage.length+shot.missingWholeBlockIds.length,0);
 rows.push({candidate:bind(file),input:bind(report.fixedInputs[i].path),levelSha256:q.levelSha256,source:q.sourceLevelId,
  normalSourceMaskRetained:true,sourceComparison:compareLayouts(q.level,source),changedArea:24,totalArea:56,changedOldBodies:8,changedNewBodies:changedNew.length,quadrants:p.region.quadrants,
  realChanges,failedParent:q.failedParent,publicLedger:{retryIdentity:identity,designIdentity:f.designSha256,unclaimed:true,historicalRequestCollisions:0},assets,
  parentComparison,failedPairComparisons,nearestSelected:nearSelected.sort((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0],nearestOld450:nearOld,
  gateGeometrySha256:describeLayout(q.level).gateGeometrySha256,
  prefixReplay:{valid:true,singleFreshModel:true,providedRouteOnly:true,routeSha256:routeSha256(q.openingProbe.drags),effectiveDrags:32,clearEvents:1,nonClearingDrags:31,remainingBodies:19,complete:false,trace},
  constructionAccounting:q.prefixConstructionAccounting,image:bind(shot.image)});
}
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
 const c=compareLayouts(read(index.files[i]).level,read(index.files[j]).level);assert(c.footprintSimilarity<=.65);pairwise.push({a:i,b:j,...c});
}
const gateGroups=[...new Set(rows.map(r=>r.gateGeometrySha256))].map(h=>({sha256:h,candidates:rows.filter(r=>r.gateGeometrySha256===h).map(r=>r.candidate.path)}));
for(const [f,h]of Object.entries(canvas.sourceBindings))assert.equal(sha(f),h);
const fileBindings=fs.readdirSync(directory).filter(n=>fs.statSync(`${directory}/${n}`).isFile()).map(n=>bind(`${directory}/${n}`));
const audit={status:'STATIC_FIXED31_PREFIX_AND_CANVAS_REVIEW_PASS',accepted:false,formalReady:false,L:null,U:null,
 constructedInputs:8,staticPartitionAttempts:222,fullSearches:0,publicClaims:0,previous64ActualInputs:5,combined64ActualInputs:13,
 inputIndex:bind(`${directory}/index.json`),plan:bind(`${directory}/plan.json`),constructionReport:bind(`${directory}/report.json`),fileBindings,
 selected:plan.selected,previousFourSealedFailures:failedFour,futureFirstJointBudgetOnly:plan.futureFirstJointBudgetOnly,publicLedgerRequestsRead:requests.length,rows,pairwise,gateGroups,
 referenceLimitations:report.referenceRows.map(r=>({source:r.source,initialClears:r.initialClears,consecutiveParkingAvailable:r.consecutiveParkingAvailable,skip:r.skip??null})),
 visualReview:{method:'All eight actual Canvas openings inspected in sheet-1.png and sheet-2.png at full image view',sheets:canvas.sheets.map(s=>bind(s.file)),
  observations:['All eight normal 7x8 boards are fully visible, filled, and use complete native assets; no clipping or missing blocks observed.',
   'Left 24-cell regions have genuinely different subdivisions including squares, strips and L pieces. The protected right-hand bars remain a visibly shared family structure.',
   'Portal placements and colours differ between these previews. Canonical gate fingerprints are reported independently; selection must still enforce maximum two identical gate geometries per group.'],
  limitations:'Openings and fixed partial prefix only: no complete route, difficulty certificate, full Pointer run or natural-time acceptance.'},
 policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathToolchainSha256:runtime.toolchainSha256,auditTool:bind('tools/daily-challenge/formal-v4/audit-macro-prefix-half300-second.mjs')};
fs.writeFileSync(`${directory}/completion-audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:audit.status,candidates:8,maxPair:Math.max(...pairwise.map(p=>p.footprintSimilarity)),gateGroups:gateGroups.length,fullSearches:0,report:`${directory}/completion-audit.json`}));
