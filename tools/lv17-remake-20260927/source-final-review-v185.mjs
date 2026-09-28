import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from '../remake21to30-mask-floor.mjs';

const root='deliverables/lv17-remake-20260927',candidate=process.argv[2],expectedLevelSha256=process.argv[3],diagnostic=process.argv.includes('--diagnostic');
assert(candidate?.startsWith(root+(diagnostic?'/design-':'/design-final-')));assert(/^[a-f0-9]{64}$/.test(expectedLevelSha256??''));
const ledgerFile=root+'/source-ledger.json',sourceAuditFile=root+'/source-audit-1790495463404.json',baselineFile=root+'/baseline.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const data=JSON.parse(fs.readFileSync(candidate)),level=data.level,drags=data.drags;
const source=JSON.parse(fs.readFileSync(ledgerFile)),sourceAudit=JSON.parse(fs.readFileSync(sourceAuditFile)),baseline=JSON.parse(fs.readFileSync(baselineFile));
assert.equal(digest(level),expectedLevelSha256);assert.deepEqual(source,sourceAudit.sourceFacts);
const {api,inputs}=await loadApi(),bindings={};
const bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
const evidence=sourceAudit.bindings.filter(b=>b.path.startsWith('deliverables/')||b.path.startsWith('references/')||b.path===source.sourceVideo);
for(const b of evidence){assert.equal(digest(fs.readFileSync(b.path)),b.sha256);bind(b.path);}
for(const p of [...inputs,candidate,ledgerFile,sourceAuditFile,baselineFile,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md','tools/lv17-remake-20260927/source-final-review-v185.mjs','tools/remake21to30-mask-floor.mjs'])bind(p);
assert.equal(level.id,17);for(const k of ['name','timeSeconds','reward','parMoves'])assert.equal(level[k],baseline.level[k]);
assert.equal(level.difficulty,'normal');assert.deepEqual(level.featureIntro,baseline.level.featureIntro);
assert.equal(level.preservedMoveTarget,71);assert.equal(level.designTargets,undefined);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
assert.deepEqual(api.levelStarTargets(level),{moveTarget:71,timeTargetSeconds:97});
const shapeName=b=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));return b.shape.length===1?'SINGLE':w===2&&h===2?'SQ2':h===1?'H'+w:'V'+h;};
const sourceMapping=level.blocks.map(b=>{
 const sourceId=b.id.replace(/^lv17-/,'source17-'),s=source.blocks.find(v=>v.id===sourceId);assert(s,sourceId);
 assert.deepEqual(b.shape,s.shape);assert.equal(b.color,s.color);assert.deepEqual(b.layers??[b.color],s.layers??[s.color]);assert.equal(b.frozen??0,s.frozen);
 assert(Object.keys(b).every(k=>['id','x','y','color','shape','layers','frozen'].includes(k)));
 return{sourceId,candidateId:b.id,sourcePosition:[s.x,s.y],candidatePosition:[b.x,b.y],positionChanged:b.x!==s.x||b.y!==s.y,sourceOuterColor:s.sourceColor,mappedOuterColor:s.color,sourceLayers:s.sourceLayers??[s.sourceColor],layers:s.layers??[s.color],shape:shapeName(b),frozen:s.frozen,originalDirectionPreserved:true,openingEvidence:s.openingEvidence,colorEvidence:s.colorEvidence};
});
assert.equal(sourceMapping.length,26);assert.equal(new Set(sourceMapping.map(r=>r.sourceId)).size,26);
assert.deepEqual(level.gates.map(g=>[g.color,g.frozen??0]).sort(),source.gates.map(g=>[g.color,g.frozen]).sort());assert.equal(level.gates.length,5);
const gateDiffs=source.gates.map(s=>{const g=level.gates.find(v=>v.color===s.color);assert(g.size>=1&&g.size<=3);assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)));
 const horizontal=['top','bottom'].includes(g.side),required=Math.max(...level.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)).map(b=>1+Math.max(...b.shape.map(p=>p[horizontal?0:1]))));assert(g.size>=required);
 return{sourceColor:s.sourceColor,mappedColor:s.color,frozen:s.frozen,source:{side:s.side,offset:s.offset,size:s.size},candidate:{side:g.side,offset:g.offset,size:g.size},requiredCompleteCrossSection:required,sourceColorEvidence:s.colorEvidence};});
for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','blocked','seams'])assert.deepEqual(level[k]??[],[]);
api.validateLevel(level);assert.equal(level.width,6);assert.equal(level.height,8);
const ps=level.playable,cells=new Set(ps.map(p=>p.join(',')));assert.equal(ps.length,48);assert.equal(cells.size,48);for(let y=0;y<8;y++)for(let x=0;x<6;x++)assert(cells.has([x,y].join(',')));
const own=new Map();for(const b of level.blocks)for(const[dx,dy]of b.shape){const k=[b.x+dx,b.y+dy].join(',');assert(cells.has(k));assert(!own.has(k));own.set(k,b);}assert.equal(own.size,48);
const adjacency=[];for(const[k,b]of own){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const n=own.get(p.join(','));assert(!n||n===b||n.color!==b.color);if(n&&n!==b)adjacency.push([b.id,n.id].map(id=>id.replace(/^lv17-/,'source17-')).sort().join('|'));}}
const newAdjacency=[...new Set(adjacency)].sort(),oldAdjacency=source.sourceAdjacency.map(a=>[a.a,a.b].sort().join('|')).sort();
const removedSourceAdjacencies=oldAdjacency.filter(a=>!newAdjacency.includes(a)),newAuthoredAdjacencies=newAdjacency.filter(a=>!oldAdjacency.includes(a));assert(removedSourceAdjacencies.length&&newAuthoredAdjacencies.length);
const blockCells=b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]);
const key=(bs,attribute,transform=p=>p)=>bs.map(b=>JSON.stringify({cells:blockCells(b).map(transform).map(p=>p.join(',')).sort(),...(attribute?{color:b.color,layers:b.layers??[b.color],frozen:b.frozen??0}:{})})).sort().join('|');
const candidatePartition=key(level.blocks,false),candidateAttributes=key(level.blocks,true),transforms=[];
for(const mirror of [1,-1])for(let turns=0;turns<4;turns++){
 const raw=([xx,yy])=>{let x=xx*mirror,y=yy;for(let i=0;i<turns;i++)[x,y]=[-y,x];return[x,y];};
 const transformed=ps.map(raw),minX=Math.min(...transformed.map(p=>p[0])),minY=Math.min(...transformed.map(p=>p[1]));const transform=p=>{const[x,y]=raw(p);return[x-minX,y-minY];};
 transforms.push({mirror,quarterTurns:turns,partitionEqual:key(source.blocks,false,transform)===candidatePartition,attributeLayoutEqual:key(source.blocks,true,transform)===candidateAttributes});
}
assert(transforms.every(t=>!t.attributeLayoutEqual),'Not an overall source rotation/reflection');
assert(transforms.every(t=>!t.partitionEqual),'Actual block-footprint partition changes, not just recoloring');
const native=level.blocks.map(b=>({id:b.id,shape:shapeName(b),match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(r=>r.match?.quarterTurns===0));
const art=api.auditCandidateBlockArt(level),opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),gateSpans=auditGateSpanLimits(level);for(const r of [art,opening,gateSpans])assert(r.passed);for(const p of new Set(art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
const model=new api.PuzzleModel(level),compiled=compileLevel(level);model.startCountdown();
const canClear=snapshot=>{const result=new Set(),state=stateFromSnapshot(compiled,snapshot);forEachGesture(compiled,state,(i,value,cost)=>{if(cost===0)result.add(compiled.blocks[i].id);});return[...result].sort();};
const openingClearable=canClear(model.snapshot()),steps=[];let setup=0,peels=0,removals=0,multiSetup=0,singleSetup=0;
for(const[index,d]of drags.entries()){
 const before=model.snapshot(),moving=before.blocks.find(b=>b.id===d.blockId);assert(moving&&!moving.frozen);const beforeReach=canClear(before);model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));const atGate=model.snapshot().blocks.find(b=>b.id===d.blockId);
 if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const after=model.snapshot(),remaining=after.blocks.find(b=>b.id===d.blockId),nonClearing=after.cleared===before.cleared;let kind='reposition';
 if(nonClearing){setup++;if(moving.shape.length>1)multiSetup++;else singleSetup++;assert(remaining);assert.deepEqual(remaining.layers,moving.layers);}
 else{assert.equal(after.cleared,before.cleared+1);if(remaining){kind='shell-peel';peels++;assert.equal(moving.layers.length,2);assert.deepEqual(remaining.layers,moving.layers.slice(1));assert.equal(remaining.color,moving.layers[1]);assert.deepEqual(remaining.shape,moving.shape);assert.deepEqual([remaining.x,remaining.y],[atGate.x,atGate.y]);}else{kind='body-removal';removals++;assert.equal(moving.layers.length,1);}}
 for(const g of after.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(v=>v.id===g.id).frozen??0)-after.cleared));for(const b of after.blocks)assert.equal(b.frozen??0,Math.max(0,(level.blocks.find(v=>v.id===b.id).frozen??0)-after.cleared));
 const afterReach=canClear(after);steps.push({step:index+1,id:d.blockId,kind,shape:shapeName(moving),shapeCells:moving.shape.length,colorBefore:moving.color,colorAfter:remaining?.color??null,layersBefore:moving.layers,layersAfter:remaining?.layers??null,from:[moving.x,moving.y],atExitOrDragEnd:[atGate.x,atGate.y],remainingAt:remaining?[remaining.x,remaining.y]:null,clearedBefore:before.cleared,clearedAfter:after.cleared,beforeReach,afterReach,newlyClearable:afterReach.filter(id=>!beforeReach.includes(id)),gateIceBefore:Object.fromEntries(before.gates.map(g=>[g.color,g.frozen??0])),gateIceAfter:Object.fromEntries(after.gates.map(g=>[g.color,g.frozen??0])),gatesOpened:after.gates.filter(g=>!(g.frozen??0)&&(before.gates.find(v=>v.id===g.id).frozen??0)>0).map(g=>g.color),blocksThawed:after.blocks.filter(b=>!(b.frozen??0)&&(before.blocks.find(v=>v.id===b.id)?.frozen??0)>0).map(b=>b.id)});
}
assert(model.snapshot().complete);assert.equal(model.snapshot().cleared,31);assert.equal(peels,5);assert.equal(removals,26);assert(setup>=11&&setup<=15);assert.equal(drags.length,31+setup);assert(drags.length<=71);
const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,setup);
const parkingEffects=steps.filter(s=>s.kind==='reposition').map(s=>({step:s.step,id:s.id,shape:s.shape,from:s.from,to:s.remainingAt,newlyClearable:s.newlyClearable})),peelEffects=steps.filter(s=>s.kind==='shell-peel').map(s=>({step:s.step,id:s.id,fromColor:s.colorBefore,toColor:s.colorAfter,sameFootprintAfterPeel:true,clearedAfter:s.clearedAfter,gatesOpened:s.gatesOpened,blocksThawed:s.blocksThawed}));
const report={createdAt:new Date().toISOString(),status:diagnostic?'CANDIDATE_SOURCE_AND_MECHANISM_DIAGNOSTIC_NOT_DIFFICULTY_CERTIFIED':'SOURCE_ORIGINALITY_AND_MECHANISM_REVIEW_PASS',ruleVersion:lock.activeVersion,ruleLockVersionCount:lock.verified.length,candidate,candidateSha256:digest(fs.readFileSync(candidate)),levelSha256:digest(level),routeSha256:digest(drags),sourceAudit:sourceAuditFile,sourceLedger:ledgerFile,
 sourceInventory:{shapeHistogram:source.shapeHistogram,bodyCount:26,area:48,sourceOuterColors:source.sourceColorCounts,mappedOuterColors:source.mappedColorCounts,exactIdentityShapeOuterCoreAndIcePreserved:true,sourceMapping,gateDiffs,sourceEvidence:evidence,paletteMapping:source.paletteMapping,noUnapprovedPaletteChanges:true,shellCount:5,openingVisuallyExposedShellCount:3,openingIceOccludedShellCount:2,shellExtraLayersEach:1,hiddenBodies:0,numericIceBodies:7,numericIceValues:[6,6,6,18,18,19,19],noLockedLaterMechanisms:true},
 geometry:{width:6,height:8,sourcePlayableCells:48,newPlayableCells:48,sourceMask:source.board.mask,newMask:source.board.mask,geometryExactlyPreserved:true,mirrorX:true,mirrorY:true,connected:true,interiorHoles:0,blockedOrSeams:0,fullOpeningCoverage:true,adjacentOuterColorsDifferent:true,sourceD4TransformsChecked:transforms,notSourceBlockPartitionRotationOrReflection:true,notSourceAttributedLayoutRotationOrReflection:true,changedSourcePositions:sourceMapping.filter(m=>m.positionChanged).length,removedSourceAdjacencies,newAuthoredAdjacencies,alignment:'All whole-body tile edges remain on integer grid; H2/H3 stay horizontal, V2 vertical and SQ2 square. New footprint subdivision and adjacency, not a new playable silhouette, supply originality.',originality:'The authorized full rectangular board is intentionally unchanged. Authored block partition differs under all8 source D4 transforms; exact per-source position and gate differences are reported, without claiming a new silhouette.'},native,art,opening,gateSpans,replay,
 mechanismReview:{passed:true,openingClearable,totalDrags:drags.length,clearEvents:31,bodyRemovals:26,shellPeels:5,nonClearingDrags:setup,multiCellNonClearingDrags:multiSetup,singleCellNonClearingDrags:singleSetup,steps,parkingEffects,peelEffects,gatesOpened:steps.filter(s=>s.gatesOpened.length).map(s=>({step:s.step,kind:s.kind,cleared:s.clearedAfter,colors:s.gatesOpened})),blocksThawed:steps.filter(s=>s.blocksThawed.length).map(s=>({step:s.step,kind:s.kind,cleared:s.clearedAfter,ids:s.blocksThawed})),interpretation:'Five peels count as clearing events, never as setup moves. All remaining gate and body ice is checked after every action against the initial count minus actual clear events. Both ice19 shell H3 bodies retain full layers through thaw. Reported parking reachability changes describe this route, not universal uniqueness or a multi-cell majority claim. Independent floor qualification remains separate.'},
 metadata:{name:level.name,difficulty:level.difficulty,difficultyChangeAuthorizedBy:'v1.85 second ordinary consolidation11–15',timeSeconds:135,timeStarSeconds:97,historicalReward:70,historicalParMoves:71,actualMoveTarget:71,routeWithinMoveTarget:true,featureIntroPreserved:true,noNewFirstTeachPopup:level.featureIntro===undefined},formalObjectMatchesCandidate:digest(api.LEVELS[16])===digest(level),difficultyCertificateProducedHere:false,requiredIndependentAcceptance:'Fresh L11 and U<=15, numericice+shell solver qualification, candidate/final dual-screen Pointer/natural-clock/scoring remain separate.',pointerValidatedHere:false,naturalClockValidatedHere:false,humanBlindTested:false,productionModified:false,sourceEvidenceOverwritten:false,playerSaveTouched:false,releaseApproved:false,bindings};
assert.deepEqual(Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const output=root+(diagnostic?'/source-candidate-review-v185-':'/source-final-review-v185-')+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:report.status,levelSha256:report.levelSha256,totalDrags:drags.length,setup,multiSetup,singleSetup,peels,removals,sourceMapped:sourceMapping.length,openingClearable,parkingEffects,peelEffects}));
