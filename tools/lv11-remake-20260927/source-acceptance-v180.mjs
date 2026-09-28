import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot} from '../remake21to30-mask-floor.mjs';

const root='deliverables/lv11-remake-20260927';
const candidate=process.argv[2]??root+'/design-structured-1790489811659/route-7681.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.80.0');
lock.versions=JSON.parse(fs.readFileSync('docs/rules/manifest.json')).versions;
const data=JSON.parse(fs.readFileSync(candidate)),level=data.level,drags=data.drags;
const ledgerFile=root+'/source-ledger.json',auditFile=root+'/source-audit-1790488846240.json';
const source=JSON.parse(fs.readFileSync(ledgerFile)),oldAudit=JSON.parse(fs.readFileSync(auditFile));
const {api,inputs}=await loadApi(),bindings={};
const bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [...inputs,candidate,ledgerFile,auditFile,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.79.0.md','docs/rules/mechanism-rules-v1.80.0.md','tools/lv11-remake-20260927/source-acceptance-v180.mjs','tools/remake21to30-mask-floor.mjs'])bind(p);
const evidence=oldAudit.bindings.filter(b=>b.path.startsWith('deliverables/')||b.path.startsWith('C:/Users/Administrator/Desktop/')||b.path.startsWith('references/'));
for(const b of evidence){assert.equal(digest(fs.readFileSync(b.path)),b.sha256);bind(b.path);}
assert.equal(digest(level),'925fb382290a389b30050d2d7544dc94fa2434c7f67cc55ec508116a963b09bc');
const shapeKey=b=>b.shape.map(p=>p.join(',')).sort().join('|');
const inventory=bs=>bs.map(b=>JSON.stringify({shape:shapeKey(b),color:b.color,frozen:b.frozen??0})).sort();
assert.deepEqual(inventory(level.blocks),inventory(source.blocks));
assert.equal(level.blocks.length,22);assert.equal(level.blocks.filter(b=>b.shape.length===3).length,10);assert.equal(level.blocks.filter(b=>b.shape.length===1).length,12);
assert.deepEqual(Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0])),{green:0,cyan:0,pink:6,purple:7,red:13});
assert.equal(level.gates.length,5);assert(level.blocks.every(b=>Object.keys(b).every(k=>['id','x','y','shape','color','frozen'].includes(k))));
for(const key of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','seams','blocked'])assert.deepEqual(level[key]??[],[]);
for(const key of ['id','name','difficulty','timeSeconds','reward'])assert.deepEqual(level[key],oldAudit.oldFormal.level[key]);
assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');assert.equal(level.designTargets,undefined);
assert.deepEqual(api.levelStarTargets(level),{moveTarget:36,timeTargetSeconds:86});
api.validateLevel(level);

const ps=level.playable,cells=new Set(ps.map(p=>p.join(',')));assert.equal(ps.length,42);assert.equal(cells.size,42);
const own=new Map();for(const b of level.blocks)for(const[dx,dy]of b.shape){const k=[b.x+dx,b.y+dy].join(',');assert(cells.has(k));assert(!own.has(k));own.set(k,b);}
assert.equal(own.size,42);for(const[k,b]of own){const[x,y]=k.split(',').map(Number);for(const q of [[x+1,y],[x,y+1]]){const n=own.get(q.join(','));assert(!n||n===b||n.color!==b.color);}}
const mirrorX=ps.every(([x,y])=>cells.has([level.width-1-x,y].join(','))),mirrorY=ps.every(([x,y])=>cells.has([x,level.height-1-y].join(',')));assert(mirrorY);
const visited=new Set([ps[0].join(',')]),queue=[ps[0]];for(let at=0;at<queue.length;at++){const[x,y]=queue[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));queue.push(p);}}assert.equal(visited.size,42);
const outside=new Set(['-1,-1']),oq=[[-1,-1]];for(let at=0;at<oq.length;at++){const[x,y]=oq[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);oq.push(p);}}}
for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)assert(cells.has([x,y].join(','))||outside.has([x,y].join(',')));
const norm=points=>{const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));return points.map(([x,y])=>[x-minX,y-minY].join(',')).sort().join('|');};
const oldPoints=oldAudit.oldFormal.level.playable,transforms=[];
for(const mirror of [1,-1])for(let turns=0;turns<4;turns++)transforms.push(norm(oldPoints.map(([xx,yy])=>{let x=xx*mirror,y=yy;for(let i=0;i<turns;i++)[x,y]=[-y,x];return[x,y];})));
assert(!transforms.includes(norm(ps)));
const oldCells=new Set(oldPoints.map(p=>p.join(','))),added=ps.filter(p=>!oldCells.has(p.join(','))),removed=oldPoints.filter(p=>!cells.has(p.join(',')));
const native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(b=>b.match?.quarterTurns===0&&[1,9].includes(b.match.shapeId)));
const art=api.auditCandidateBlockArt(level),opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),gateSpans=auditGateSpanLimits(level);for(const result of [art,opening,gateSpans])assert(result.passed);
for(const p of new Set(art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);

const c=compileLevel(level),model=new api.PuzzleModel(level),steps=[];model.startCountdown();
const canClear=(snap,id)=>{const state=stateFromSnapshot(c,snap),bi=c.blocks.findIndex(b=>b.id===id);if(!snap.blocks.some(b=>b.id===id))return null;let found=false;forEachGesture(c,state,(i,value,cost)=>{if(i===bi&&value===255&&cost===0){found=true;return false;}});return found;};
const watched=['lv11-plain-1','lv11-ice-6','lv11-ice-3','lv11-plain-0','lv11-plain-2'];
let multi=0,single=0;
for(const[index,d]of drags.entries()){
 const before=model.snapshot(),b=before.blocks.find(b=>b.id===d.blockId);assert(b&&!b.frozen);const beforeReach=Object.fromEntries(watched.map(id=>[id,canClear(before,id)]));model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());const after=model.snapshot(),nonClearing=after.cleared===before.cleared;
 if(nonClearing){if(b.shape.length>1)multi++;else single++;}
 for(const rem of after.blocks)assert.equal(rem.frozen??0,Math.max(0,(level.blocks.find(v=>v.id===rem.id).frozen??0)-after.cleared));
 for(const gate of after.gates)assert.equal(gate.frozen??0,Math.max(0,(level.gates.find(v=>v.id===gate.id).frozen??0)-after.cleared));
 steps.push({step:index+1,blockId:d.blockId,color:b.color,area:b.shape.length,from:[b.x,b.y],to:after.blocks.find(v=>v.id===b.id)?[after.blocks.find(v=>v.id===b.id).x,after.blocks.find(v=>v.id===b.id).y]:null,nonClearing,clearedBefore:before.cleared,clearedAfter:after.cleared,beforeReach,afterReach:Object.fromEntries(watched.map(id=>[id,canClear(after,id)]))});
}
assert(model.snapshot().complete);assert.equal(model.snapshot().cleared,22);assert.equal(drags.length,34);assert.equal(multi,4);assert.equal(single,8);
assert.equal(steps[14].beforeReach['lv11-plain-1'],false);assert.equal(steps[14].afterReach['lv11-plain-1'],true);
assert.equal(steps[22].beforeReach['lv11-ice-6'],false);assert.equal(steps[22].afterReach['lv11-ice-6'],true);
assert.equal(steps[26].beforeReach['lv11-ice-3'],false);assert.equal(steps[26].afterReach['lv11-ice-3'],false);assert.equal(steps[27].afterReach['lv11-ice-3'],true);
const gateDiffs=source.gates.map(old=>({color:old.color,sourceColor:old.sourceColor,frozen:old.frozen,source:{side:old.side,offset:old.offset,size:old.size},candidate:(({side,offset,size})=>({side,offset,size}))(level.gates.find(g=>g.color===old.color))}));
const iceDiffs=source.blocks.filter(b=>b.frozen).map(old=>{const now=level.blocks.find(b=>b.color===old.color&&b.frozen===old.frozen);assert(now);return{color:old.color,sourceColor:old.sourceColor,frozen:old.frozen,source:[old.x,old.y],candidate:[now.x,now.y],candidateId:now.id,evidence:old.colorEvidence};});
const report={createdAt:new Date().toISOString(),status:'SOURCE_GEOMETRY_AND_MECHANISM_REVIEW_PASS',ruleVersion:lock.activeVersion,ruleLockImmutableVersions:lock.versions.length,candidate,candidateSha256:digest(fs.readFileSync(candidate)),levelSha256:digest(level),routeSha256:digest(drags),source:{audit:auditFile,ledger:ledgerFile,paletteMapping:source.paletteMapping,sourceColorCounts:source.sourceColorCounts,mappedColorCounts:source.mappedColorCounts,fullColors:5,openingUnfrozenVisibleColors:4,shapeHistogram:{H3:10,S:12},bodies:22,coveredCells:42,exactShapeColorIceMultiset:true,ordinaryH3:{pink:1,green:2},numericIce:iceDiffs,gateDiffs,hiddenBodies:0,unlockedOnly:true,sourceEvidence: evidence},geometry:{width:6,height:8,mask:['###...','######','######','######','######','######','######','###...'],sourceWidth:6,sourceHeight:7,sourceMask:Array(7).fill('######'),mirrorX,mirrorY,connected:true,internalHoles:0,notAnySourceDihedralTransform:true,coordinateAlignedAdded:added,coordinateAlignedRemoved:removed,blockedAndSeamsEmpty:true,openingActualFullCoverage:true,adjacentBlockColorsDifferent:true,layoutNotCopied:true,alignment:'All H3 anchors align to x0/x3; left3/right3 rails share straight group boundaries. Ordinary H3 now form green-pink-green at left rows1/2/3; source had pink-green at top and green at bottom. The 3×4 checkerboard of singles is intentionally preserved internally and moved from rows2–5 to rows4–7, rather than mislabeled as wholly original block pattern.'},native,art,opening,gateSpans,mechanismReview:{passed:true,totalDrags:34,nonClearingDrags:12,multiCellNonClearingDrags:multi,singleCellNonClearingDrags:single,noClaimOfMultiCellNumericalMajority:true,noExtraRatioThreshold:true,steps,concreteDecisions:[{steps:[15,16],role:'After six cyan singles open pink6, lower green H3 must vacate the left three-cell corridor so ordinary pink H3 can descend and leave; snapshot exit reach changes false→true.'},{steps:[23,24],role:'After 13 clears, the same green H3 moves upward from the lower corridor, enabling thawed purple13 H3 to reach its lower-left exit; snapshot exit reach changes false→true.'},{steps:[27,28,29],role:'At 16 clears two green H3 bodies successively park in the right half. Removing only the lower blocker is insufficient; after both parking moves purple16 H3 gains the left vertical exit corridor.'},{steps:[29,30,31,32,33],role:'Clearing purple16 reaches17 and thaws the top purple17 cap. Its removal opens the three-wide top green gate; both ordinary green H3 and green17 can then leave.'}],analysis:'These are actual long-body passage and parking choices coupled to 6/7/13 gate opening and 13–17 body thawing. Eight single-cell repositionings remain an explicit part of the design; they are not hidden or claimed to be multi-cell actions.'},metadata:{name:level.name,difficulty:level.difficulty,timeSeconds:120,timeStarSeconds:86,moveTarget:36,historicalReward:40,routeWithinMoveTarget:true},difficultyCertificateProducedHere:false,expectedIndependentGate:'Fresh L12 plus authority U12 and candidate/final dual-screen Pointer still handled separately; this source review does not certify them.',pointerValidatedHere:false,naturalTimeValidatedHere:false,humanBlindTested:false,productionModified:false,sourceEvidenceOverwritten:false,releaseApproved:false,bindings};
assert.deepEqual(Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[]);
const output=root+'/source-acceptance-v180-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:report.status,levelSha256:report.levelSha256,totalDrags:drags.length,multi,single,sourceInventory:report.source.exactShapeColorIceMultiset}));
