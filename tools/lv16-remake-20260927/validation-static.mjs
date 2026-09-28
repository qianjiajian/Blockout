import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loadApi,geometry} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,checkFastFloor} from '../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';

const file=process.argv[2],diagnostic=process.argv.includes('--diagnostic'),formal=process.argv.includes('--formal');assert(file,'Usage: validation-static.mjs candidate.json [--diagnostic]');
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.84.0');
const baselineFile='deliverables/lv16-remake-20260927/baseline.json',baseline=JSON.parse(fs.readFileSync(baselineFile));
const data=JSON.parse(fs.readFileSync(file)),drags=data.drags??data.route;let level=data.level;
assert.equal(level?.id,16);assert(drags?.length);
const {api,inputs}=await loadApi();
if(formal){assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[15])),level);level=JSON.parse(JSON.stringify(api.LEVELS[15]));}
const output=`deliverables/lv16-remake-20260927/validation-${formal?'formal-':''}static-${Date.now()}.json`;
const report={generatedAt:new Date().toISOString(),status:'running',formalSourceObjectUsed:formal,diagnosticOnly:diagnostic,difficultyCertified:false,ruleVersion:lock.activeVersion,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),sourceContract:'v1.84 source 21 bodies and one V3 shell / normal11-15 / preserved50-129',pointerValidated:false,timeValidated:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [...inputs,file,baselineFile,'tools/lv16-remake-20260927/validation-static.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs','tools/level21-reposition-floor.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.84.0.md'])bind(p);

const sourceFile='deliverables/lv16-remake-20260927/source-ledger.json',sourceAuditFile='deliverables/lv16-remake-20260927/'+fs.readdirSync('deliverables/lv16-remake-20260927').filter(p=>/^source-audit-\d+\.json$/.test(p)).sort().at(-1);
const source=JSON.parse(fs.readFileSync(sourceFile)),sourceAudit=JSON.parse(fs.readFileSync(sourceAuditFile));
assert.equal(source.levelId,16);assert.equal(sourceAudit.status,'SOURCE_AND_BASELINE_AUDIT_COMPLETE');bind(sourceFile);bind(sourceAuditFile);
const sourceEvidence=sourceAudit.bindings.filter(b=>b.path.startsWith('deliverables/')||b.path.startsWith('C:/Users/Administrator/Desktop/'));
for(const b of sourceEvidence){assert.equal(digest(fs.readFileSync(b.path)),b.sha256);bind(b.path);}
report.bindings=bindings;
try{
 const before=baseline.level;assert.equal(before.id,16);
 for(const key of ['id','name','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(level[key],before[key],`Preserve ${key}`);
 assert.equal(level.difficulty,'normal');assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.timeSeconds,180);assert.equal(level.reward,65);assert.equal(api.levelStarTargets(level).timeTargetSeconds,129);assert.equal(api.levelStarTargets(level).moveTarget,50);assert.equal(level.parMoves,50);assert.equal(level.preservedMoveTarget,50);assert.equal(level.designTargets,undefined,'Old planning labels must not be carried into fresh certification');
 assert.notDeepEqual(geometry(level),geometry(before),'Actual board must change');
 assert.deepEqual(level.blocked??[],[]);assert.deepEqual(level.seams??[],[]);
 assert.equal(level.blocks.length,21);
 const shapeKey=b=>b.shape.map(p=>p.join(',')).sort().join('|');
 const inventory=blocks=>blocks.map(b=>JSON.stringify({shape:shapeKey(b),layers:b.layers??[b.color],frozen:b.frozen??0})).sort();
 assert.deepEqual(inventory(level.blocks),inventory(source.blocks),'Preserve all source body shape/color/ice attachments');
 const shapeHistogram={S:0,V3:0};for(const b of level.blocks){
  const shape=shapeKey(b);assert(['0,0','0,0|0,1|0,2'].includes(shape));shapeHistogram[shape==='0,0'?'S':'V3']++;
  assert(Object.keys(b).every(k=>['id','color','shape','x','y','frozen','layers'].includes(k)),`No locked mechanism on ${b.id}`);
 }
 assert.deepEqual(shapeHistogram,{S:18,V3:3});assert.equal(level.blocks.filter(b=>b.layers?.length===2).length,1);for(const b of level.blocks)if(b.layers)assert.equal(b.color,b.layers[0]);assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen).sort((a,b)=>a-b),[]);
 for(const field of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])assert.deepEqual(level[field]??[],[],`Locked mechanism ${field}`);
 const gates=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0]));
 assert.equal(level.gates.length,5);assert.deepEqual(gates,{blue:0,cyan:3,yellow:8,red:12,purple:15});
 for(const gate of level.gates)assert(Object.keys(gate).every(k=>['id','color','side','offset','size','frozen'].includes(k)));
 report.source={ledger:sourceFile,audit:sourceAuditFile,paletteMapping:source.paletteMapping,shapeHistogram,numericIce:source.numericIce,gateInitialIce:gates,evidence:sourceEvidence,inventoryAttachmentsPreserved:true};
 api.validateLevel(level);
 const points=level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]),cells=new Set(points.map(p=>p.join(',')));
 assert.equal(cells.size,27);assert.equal(points.length,27);
 const mirrorX=points.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=points.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX||mirrorY);
 const visited=new Set([points[0].join(',')]),queue=[points[0]];
 for(let at=0;at<queue.length;at++){const[x,y]=queue[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));queue.push(p);}}
 assert.equal(visited.size,27,'One connected actual board');
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let at=0;at<pending.length;at++){const[x,y]=pending[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 const holes=[];for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)if(!cells.has(`${x},${y}`)&&!outside.has(`${x},${y}`))holes.push([x,y]);assert.deepEqual(holes,[]);
 const canonical=ps=>{const minX=Math.min(...ps.map(p=>p[0])),minY=Math.min(...ps.map(p=>p[1]));return ps.map(([x,y])=>`${x-minX},${y-minY}`).sort().join('|');};
 const oldPoints=before.playable,oldTransforms=[];
 for(const reflect of [1,-1])for(let turns=0;turns<4;turns++)oldTransforms.push(canonical(oldPoints.map(([x,y])=>{x*=reflect;for(let n=0;n<turns;n++)[x,y]=[-y,x];return[x,y];})));
 assert(!oldTransforms.includes(canonical(points)),'New shape must differ from every rotation/reflection of the old staircase board');
 report.geometry={width:level.width,height:level.height,playable:27,connected:true,mirrorX,mirrorY,interiorHoles:holes,notOldDihedralTransform:true};
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(b=>b.match?.quarterTurns===0));
 report.audits={art:api.auditCandidateBlockArt(level),opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gateSpans:auditGateSpanLimits(level)};
 for(const[key,result]of Object.entries(report.audits))assert(result.passed,`${key}: ${JSON.stringify(result)}`);
 const skip=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const oldAudit=api.auditRevisedCandidate(level,undefined);report.hardIssues=oldAudit.issues.filter(i=>!skip.has(i.code));assert.deepEqual(report.hardIssues,[]);
 report.replacedHistoricalChecks=oldAudit.issues.filter(i=>skip.has(i.code));
 for(const p of new Set(report.audits.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete,JSON.stringify(report.replay));assert.equal(report.replay.clearEvents,22);if(!diagnostic)assert(report.replay.nonClearingDrags>=11&&report.replay.nonClearingDrags<=15);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.routeProjection=[];report.routeIceHistory=[];let multiCellRepositions=0,singleCellRepositions=0,peels=0,bodyRemovals=0;report.shellEvents=[];
 for(const[index,drag]of drags.entries()){
  const initial=model.snapshot(),prior=stateFromSnapshot(c,initial),bi=c.blocks.findIndex(b=>b.id===drag.blockId),moving=initial.blocks.find(b=>b.id===drag.blockId);assert(moving&&!moving.frozen,'Frozen bodies cannot start an action');model.beginAction();
  for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),next=stateFromSnapshot(c,after),cost=after.cleared===initial.cleared?1:0;let present=false;
  forEachGesture(c,prior,(i,v,edge)=>{if(i===bi&&v===next[bi]&&edge===cost)present=true;});assert(present,`Actual step ${index+1} must be in lower-bound superset`);
  const retained=after.blocks.find(b=>b.id===drag.blockId);
  if(cost===0){
   assert.equal(after.cleared,initial.cleared+1);
   if(retained){peels++;assert.equal(moving.layers.length,2);assert.deepEqual(retained.layers,[moving.layers[1]]);assert.equal(retained.color,moving.layers[1]);assert.deepEqual(retained.shape,moving.shape);assert.deepEqual([retained.x,retained.y],drag.path.at(-1)??[moving.x,moving.y]);assert.equal(after.blocks.length,initial.blocks.length);}
   else {bodyRemovals++;assert.equal(moving.layers.length,1);assert.equal(after.blocks.length,initial.blocks.length-1);}
   report.shellEvents.push({step:index+1,id:drag.blockId,kind:retained?'peel':'body-removal',cleared:after.cleared,bodyRetained:!!retained});
  }
  const changed=prior.slice();changed[bi]=next[bi];assert.deepEqual(changed,next);report.routeProjection.push({step:index+1,blockId:drag.blockId,cost,area:moving.shape.length,present});if(cost){if(moving.shape.length>1)multiCellRepositions++;else singleCellRepositions++;}
  for(const b of after.blocks)assert.equal(b.frozen??0,Math.max(0,(level.blocks.find(x=>x.id===b.id).frozen??0)-after.cleared),'Actual visible ice decrements once per clear');
  for(const g of after.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-after.cleared),'Actual gate ice decrements once per clear');
  report.routeIceHistory.push({step:index+1,cleared:after.cleared,remainingIce:after.blocks.filter(b=>b.frozen).map(b=>({id:b.id,frozen:b.frozen}))});
 }
 assert(model.snapshot().complete);assert.equal(peels,1);assert.equal(bodyRemovals,21);report.eventCounts={peels,bodyRemovals,total:peels+bodyRemovals};report.repositionKinds={multiCell:multiCellRepositions,singleCell:singleCellRepositions,originalShapesOnly:true};assert.equal(singleCellRepositions+multiCellRepositions,report.replay.nonClearingDrags);report.sourceSpaceDifference={sourcePlayable:27,sourceOccupied:27,oldFormalOccupied:26,restoredFirstBlueSingle:true,sourceEmptyCells:source.board.openingEmptyCells,newPlayable:27,newOccupied:27};
 const testFiles=['tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'];
 const tests=spawnSync(process.execPath,['--test',...testFiles],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 report.qualification={testFiles,exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr,error:tests.error?.message??null};assert.equal(tests.status,0,'Fresh full-width/mask and identity/normalization qualifications must pass');
 if(!diagnostic){
  report.unquotientedFloor=checkFastFloor(level,{floor:11,maxStates:250000,maxMilliseconds:5000});// One bounded supplementary graph; UNKNOWN never serves as proof.
  report.quotientedFloor=checkSymmetryFloor(level,{floor:11,maxStates:250000,maxMilliseconds:30000});assert(report.quotientedFloor.thresholdProven,JSON.stringify(report.quotientedFloor));
  report.lowerBound=11;report.difficultyCertified=true;report.proofCoverage=report.unquotientedFloor.thresholdProven?'DUAL_FRESH_PROOFS':'QUALIFIED_QUOTIENT_PROVEN_RAW_GRAPH_UNVERIFIED';
 }else report.lowerBound=null;
 report.upperBound=report.replay.nonClearingDrags;report.exactNecessaryRepositions=report.difficultyCertified&&report.upperBound===11?11:null;
 report.starTargets=api.levelStarTargets(level);report.scoring={authorizationPending:false,originalTargetsPreserved:true,guaranteedMinimumTotalDrags:22+11,originalTarget:50,newMoveTarget:50,actualRouteWithinMoveTarget:drags.length<=50};report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status=diagnostic?'DIAGNOSTIC_COMPLETE_NOT_NORMAL_CERTIFIED':'PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,lowerBound:report.lowerBound,upperBound:report.upperBound,error:report.error}));
