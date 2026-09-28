import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from '../remake21to30-mask-floor.mjs';

const root='deliverables/lv16-remake-20260927';
const candidate=process.argv[2],expectedLevelSha256=process.argv[3];
assert(candidate?.startsWith(root+'/design-final-'));assert(/^[a-f0-9]{64}$/.test(expectedLevelSha256??''));
const ledgerFile=root+'/source-ledger.json',sourceAuditFile=root+'/source-audit-1790493955166.json',baselineFile=root+'/baseline.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.84.0');
const data=JSON.parse(fs.readFileSync(candidate)),level=data.level,drags=data.drags;
const source=JSON.parse(fs.readFileSync(ledgerFile)),sourceAudit=JSON.parse(fs.readFileSync(sourceAuditFile)),baseline=JSON.parse(fs.readFileSync(baselineFile));
assert.equal(digest(level),expectedLevelSha256);assert.deepEqual(source,sourceAudit.sourceFacts);
const {api,inputs}=await loadApi(),bindings={};
const bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
const evidence=sourceAudit.bindings.filter(b=>b.path.startsWith('deliverables/')||b.path.startsWith('references/')||b.path===source.sourceVideo);
for(const b of evidence){assert.equal(digest(fs.readFileSync(b.path)),b.sha256);bind(b.path);}
for(const p of [...inputs,candidate,ledgerFile,sourceAuditFile,baselineFile,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.84.0.md','tools/lv16-remake-20260927/source-final-review-v184.mjs','tools/remake21to30-mask-floor.mjs'])bind(p);
assert.equal(level.id,16);for(const k of ['name','timeSeconds','reward','parMoves'])assert.equal(level[k],baseline.level[k]);
assert.equal(level.difficulty,'normal');assert.deepEqual(level.featureIntro,baseline.level.featureIntro);
assert.equal(level.preservedMoveTarget,50);assert.equal(level.designTargets,undefined);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
assert.deepEqual(api.levelStarTargets(level),{moveTarget:50,timeTargetSeconds:129});
const sourceMapping=level.blocks.map(b=>{
  const sourceId=b.id.replace(/^lv16-/,'source16-'),s=source.blocks.find(v=>v.id===sourceId);assert(s,sourceId);
  assert.deepEqual(b.shape,s.shape);assert.equal(b.color,s.color);assert.deepEqual(b.layers??[b.color],s.layers??[s.color]);assert.equal(b.frozen??0,0);
  assert(Object.keys(b).every(k=>['id','x','y','color','shape','layers'].includes(k)));
  return{sourceId,candidateId:b.id,sourcePosition:[s.x,s.y],candidatePosition:[b.x,b.y],sourceOuterColor:s.sourceColor,mappedOuterColor:s.color,sourceLayers:s.sourceLayers??[s.sourceColor],layers:s.layers??[s.color],shape:s.shape.length===1?'SINGLE':'V3',originalDirectionPreserved:true,openingEvidence:s.openingEvidence,peelEvidence:s.peelEvidence??null};
});
assert.equal(sourceMapping.length,21);assert.equal(new Set(sourceMapping.map(r=>r.sourceId)).size,21);
assert.deepEqual(level.gates.map(g=>[g.color,g.frozen??0]).sort(),source.gates.map(g=>[g.color,g.frozen]).sort());assert.equal(level.gates.length,5);
const gateDiffs=source.gates.map(s=>{
  const g=level.gates.find(v=>v.color===s.color);assert(g.size>=1&&g.size<=3);assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)));
  return{sourceColor:s.sourceColor,mappedColor:s.color,frozen:s.frozen,source:{side:s.side,offset:s.offset,size:s.size},candidate:{side:g.side,offset:g.offset,size:g.size},widthReason:['red','yellow'].includes(g.color)?(['left','right'].includes(g.side)?'V3 full side cross-section is3':'V3 full top/bottom cross-section is1'):'Single full cross-section is1; source gate width may be adapted within3',sourceColorEvidence:s.colorEvidence};
});
for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','blocked','seams'])assert.deepEqual(level[k]??[],[]);
api.validateLevel(level);
const ps=level.playable,cells=new Set(ps.map(p=>p.join(',')));assert.equal(ps.length,27);assert.equal(cells.size,27);
const own=new Map();for(const b of level.blocks)for(const[dx,dy]of b.shape){const k=[b.x+dx,b.y+dy].join(',');assert(cells.has(k));assert(!own.has(k));own.set(k,b);}assert.equal(own.size,27);
for(const[k,b]of own){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const n=own.get(p.join(','));assert(!n||n===b||n.color!==b.color);}}
const mirrorX=ps.every(([x,y])=>cells.has([level.width-1-x,y].join(','))),mirrorY=ps.every(([x,y])=>cells.has([x,level.height-1-y].join(',')));assert(mirrorX||mirrorY);
const visited=new Set([ps[0].join(',')]),q=[ps[0]];
for(let at=0;at<q.length;at++){const[x,y]=q[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));q.push(p);}}
assert.equal(visited.size,27);
const outside=new Set(['-1,-1']),oq=[[-1,-1]];
for(let at=0;at<oq.length;at++){const[x,y]=oq[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);oq.push(p);}}}
for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)assert(cells.has([x,y].join(','))||outside.has([x,y].join(',')));
const sourcePoints=source.board.mask.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='#'?[[x,y]]:[]));
const norm=points=>{const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));return points.map(([x,y])=>[x-minX,y-minY].join(',')).sort().join('|');};
const sourceTransforms=[];for(const mirror of [1,-1])for(let turns=0;turns<4;turns++)sourceTransforms.push(norm(sourcePoints.map(([xx,yy])=>{let x=xx*mirror,y=yy;for(let i=0;i<turns;i++)[x,y]=[-y,x];return[x,y];})));
assert(!sourceTransforms.includes(norm(ps)));
const newMask=Array.from({length:level.height},(_,y)=>Array.from({length:level.width},(_,x)=>cells.has([x,y].join(','))?'#':'.').join(''));
const native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every((r,i)=>r.match?.shapeId===(level.blocks[i].shape.length===1?1:3)&&r.match.quarterTurns===0));
const art=api.auditCandidateBlockArt(level),opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),gateSpans=auditGateSpanLimits(level);
for(const r of [art,opening,gateSpans])assert(r.passed);for(const p of new Set(art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
const model=new api.PuzzleModel(level),compiled=compileLevel(level);model.startCountdown();
const canClear=snapshot=>{
  const result=new Set(),state=stateFromSnapshot(compiled,snapshot);
  forEachGesture(compiled,state,(i,value,cost)=>{if(cost===0)result.add(compiled.blocks[i].id);});
  return[...result].sort();
};
const openingClearable=canClear(model.snapshot()),steps=[];let setup=0,peels=0,removals=0,multiSetup=0,singleSetup=0;
for(const[index,d]of drags.entries()){
  const before=model.snapshot(),moving=before.blocks.find(b=>b.id===d.blockId);assert(moving&&!moving.frozen);
  const beforeReach=canClear(before);model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));
  const atGate=model.snapshot().blocks.find(b=>b.id===d.blockId);
  if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),remaining=after.blocks.find(b=>b.id===d.blockId),nonClearing=after.cleared===before.cleared;
  let kind='reposition';
  if(nonClearing){setup++;if(moving.shape.length>1)multiSetup++;else singleSetup++;assert(remaining);assert.deepEqual(remaining.layers,moving.layers);}
  else{
    assert.equal(after.cleared,before.cleared+1);
    if(remaining){kind='shell-peel';peels++;assert.equal(moving.layers.length,2);assert.deepEqual(remaining.layers,moving.layers.slice(1));assert.equal(remaining.color,moving.layers[1]);assert.deepEqual(remaining.shape,moving.shape);assert.deepEqual([remaining.x,remaining.y],[atGate.x,atGate.y]);}
    else{kind='body-removal';removals++;assert.equal(moving.layers.length,1);}
  }
  for(const g of after.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(v=>v.id===g.id).frozen??0)-after.cleared));
  const afterReach=canClear(after);
  steps.push({step:index+1,id:d.blockId,kind,shapeCells:moving.shape.length,colorBefore:moving.color,colorAfter:remaining?.color??null,layersBefore:moving.layers,layersAfter:remaining?.layers??null,from:[moving.x,moving.y],atExitOrDragEnd:[atGate.x,atGate.y],remainingAt:remaining?[remaining.x,remaining.y]:null,clearedBefore:before.cleared,clearedAfter:after.cleared,beforeReach,afterReach,newlyClearable:afterReach.filter(id=>!beforeReach.includes(id)),gateIceBefore:Object.fromEntries(before.gates.map(g=>[g.color,g.frozen??0])),gateIceAfter:Object.fromEntries(after.gates.map(g=>[g.color,g.frozen??0])),gatesOpened:after.gates.filter(g=>!(g.frozen??0)&&(before.gates.find(v=>v.id===g.id).frozen??0)>0).map(g=>g.color)});
}
assert(model.snapshot().complete);assert.equal(model.snapshot().cleared,22);assert.equal(peels,1);assert.equal(removals,21);assert(setup>=11&&setup<=15);assert.equal(drags.length,22+setup);assert(drags.length<=50);
const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,setup);
const parkingEffects=steps.filter(s=>s.kind==='reposition').map(s=>({step:s.step,id:s.id,from:s.from,to:s.remainingAt,newlyClearable:s.newlyClearable}));
const peelEffects=steps.filter(s=>s.kind==='shell-peel').map(s=>({step:s.step,id:s.id,fromColor:s.colorBefore,toColor:s.colorAfter,sameFootprintAfterPeel:true,clearedAfter:s.clearedAfter,gatesOpened:s.gatesOpened}));
const report={
  createdAt:new Date().toISOString(),status:'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS',ruleVersion:lock.activeVersion,ruleLockVersionCount:lock.verified.length,candidate,candidateSha256:digest(fs.readFileSync(candidate)),levelSha256:digest(level),routeSha256:digest(drags),sourceAudit:sourceAuditFile,sourceLedger:ledgerFile,
  sourceInventory:{shapeHistogram:{SINGLE:18,V3:3},bodyCount:21,area:27,sourceOuterColors:source.sourceColorCounts,mappedOuterColors:source.mappedColorCounts,exactIdentityShapeOuterCorePreserved:true,sourceMapping,gateDiffs,sourceEvidence:evidence,paletteMapping:source.paletteMapping,noUnapprovedPaletteChanges:true,shellCount:1,shellExtraLayersEach:1,hiddenBodies:0,numericIceBodies:0,noLockedLaterMechanisms:true},
  geometry:{width:level.width,height:level.height,sourcePlayableCells:27,newPlayableCells:27,sourceMask:source.board.mask,newMask,mirrorX,mirrorY,connected:true,interiorHoles:0,blockedOrSeams:0,fullOpeningCoverage:true,adjacentOuterColorsDifferent:true,notSourceRotationOrReflection:true,sourceD4TransformsChecked:8,alignment:'All21 bodies follow whole-cell grid edges; threeV3 remain vertical. Shape symmetry is not a requirement for same-color symmetry.',originality:'The new real playable-cell mask is different under every source rotation/reflection. Body and gate locations are independently listed as authored changes, not claimed as a source copy.'},
  native,art,opening,gateSpans,replay,
  mechanismReview:{passed:true,openingClearable,totalDrags:drags.length,clearEvents:22,bodyRemovals:21,shellPeels:1,nonClearingDrags:setup,multiCellNonClearingDrags:multiSetup,singleCellNonClearingDrags:singleSetup,steps,parkingEffects,peelEffects,gatesOpened:steps.filter(s=>s.gatesOpened.length).map(s=>({step:s.step,kind:s.kind,cleared:s.clearedAfter,colors:s.gatesOpened})),interpretation:'All setup gestures move real nativeV3 or single bodies; their actual counts are reported without claiming multi-cell majority. Peels change the existing body color while preserving its shape and exit-side anchor, count as one clearing event, and decrement all remaining frozen gates exactly once. Parking before/after reachable-clear sets describe concrete route effects; no claim that all solutions require the same coordinates. Lower-bound certification is deliberately separate.'},
  metadata:{name:level.name,difficulty:level.difficulty,difficultyChangeAuthorizedBy:'v1.84 user-confirmed ordinary consolidation11–15',timeSeconds:180,timeStarSeconds:129,historicalReward:65,historicalParMoves:50,actualMoveTarget:50,routeWithinMoveTarget:true,featureIntroPreserved:true,noNewFirstTeachPopup:level.featureIntro===undefined},
  difficultyCertificateProducedHere:false,requiredIndependentAcceptance:'Fresh L11 and U<=15, shell-model qualification, candidate/final dual-screen Pointer/natural-clock and scoring acceptance remain separate.',pointerValidatedHere:false,naturalClockValidatedHere:false,humanBlindTested:false,productionModified:false,sourceEvidenceOverwritten:false,playerSaveTouched:false,releaseApproved:false,bindings,
};
assert.deepEqual(Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const output=root+'/source-final-review-v184-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,levelSha256:report.levelSha256,totalDrags:drags.length,setup,multiSetup,singleSetup,peels,removals,sourceMapped:sourceMapping.length,openingClearable,parkingEffects,peelEffects}));
