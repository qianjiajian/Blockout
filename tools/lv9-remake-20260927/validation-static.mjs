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

const file=process.argv[2];assert(file,'Usage: validation-static.mjs candidate.json');
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert(['1.77.0','1.78.0'].includes(lock.activeVersion));
const baselineFile='deliverables/lv9-remake-20260927/baseline.json',baseline=JSON.parse(fs.readFileSync(baselineFile));
const data=JSON.parse(fs.readFileSync(file)),level=data.level,drags=data.drags??data.route;
assert.equal(level?.id,9);assert(drags?.length);
const {api,inputs}=await loadApi();
const output=`deliverables/lv9-remake-20260927/validation-static-${Date.now()}.json`;
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),sourceContract:'v1.77/Lv9',pointerValidated:false,timeValidated:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [...inputs,file,baselineFile,'tools/lv9-remake-20260927/validation-static.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs','tools/level21-reposition-floor.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.77.0.md'])bind(p);
if(lock.activeVersion==='1.78.0')bind('docs/rules/mechanism-rules-v1.78.0.md');
const sourceFrames=['source-video-213-259-contact.png','source-video-221-pink2.png','source-video-229-green4.png','source-video-233-red6.png','source-video-235-blue8.png','source-video-236-blue8.png'].map(f=>'deliverables/lv9-remake-20260927/'+f);
for(const p of sourceFrames)bind(p);
report.bindings=bindings;
try{
 const before=baseline.level;assert.equal(before.id,9);
 for(const key of ['id','name','difficulty','timeSeconds','reward'])assert.deepEqual(level[key],before[key],`Preserve ${key}`);
 assert.equal(level.difficulty,'hard');assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.timeSeconds,105);assert.equal(level.reward,60);assert.equal(api.levelStarTargets(level).timeTargetSeconds,75);assert.equal(api.levelStarTargets(level).moveTarget,drags.length);
 assert.notDeepEqual(geometry(level),geometry(before),'Actual board must change');
 assert.deepEqual(level.blocked??[],[]);assert.deepEqual(level.seams??[],[]);
 assert.equal(level.blocks.length,10);
 const sq='0,0|0,1|1,0|1,1',hist={};
 for(const b of level.blocks){
  assert.equal(b.shape.map(p=>p.join(',')).sort().join('|'),sq);
  assert(Object.keys(b).every(k=>['id','color','shape','x','y'].includes(k)),`No locked/additional mechanism on ${b.id}`);
  hist[b.color]=(hist[b.color]??0)+1;
 }
 assert.deepEqual(hist,{...Object.fromEntries(Object.keys(hist).map(k=>[k,2]))});assert.deepEqual(Object.keys(hist).sort(),['blue','green','pink','red','yellow']);
 for(const field of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])assert.deepEqual(level[field]??[],[],`Locked mechanism ${field}`);
 const gates=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0]));
 assert.equal(level.gates.length,5);assert.deepEqual(gates,{yellow:0,pink:2,green:4,red:6,blue:8});
 for(const gate of level.gates){assert(Object.keys(gate).every(k=>['id','color','side','offset','size','frozen'].includes(k)));assert.equal(gate.size,2,'SQ2 needs exactly two complete cross-section cells');}
 report.source={blockCount:10,shape:'SQ2',colorHistogram:hist,gateInitialIce:gates,sourceGeometry:'H, 6 by 8, 40 playable cells',sourceFrames,
  visualReview:'Opening confirms ten SQ2 and two per color; revealed gate colors in video confirm yellow ordinary, pink 2, green 4, red 6, blue 8. Initial block in front of opaque ice is not evidence of the hidden gate color.',
  historicalFormalGateInitialIce:Object.fromEntries(before.gates.map(g=>[g.color,g.frozen??0])),historicalFormalColorHistogram:before.blocks.reduce((h,b)=>(h[b.color]=(h[b.color]??0)+1,h),{})};
 api.validateLevel(level);
 const points=level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]),cells=new Set(points.map(p=>p.join(',')));
 assert.equal(cells.size,40);assert.equal(points.length,40);
 const mirrorX=points.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=points.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX||mirrorY);
 const visited=new Set([points[0].join(',')]),queue=[points[0]];
 for(let at=0;at<queue.length;at++){const[x,y]=queue[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));queue.push(p);}}
 assert.equal(visited.size,40,'One connected actual board');
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let at=0;at<pending.length;at++){const[x,y]=pending[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 const holes=[];for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)if(!cells.has(`${x},${y}`)&&!outside.has(`${x},${y}`))holes.push([x,y]);assert.deepEqual(holes,[]);
 const canonical=ps=>{const minX=Math.min(...ps.map(p=>p[0])),minY=Math.min(...ps.map(p=>p[1]));return ps.map(([x,y])=>`${x-minX},${y-minY}`).sort().join('|');};
 const oldPoints=before.playable,oldTransforms=[];
 for(const reflect of [1,-1])for(let turns=0;turns<4;turns++)oldTransforms.push(canonical(oldPoints.map(([x,y])=>{x*=reflect;for(let n=0;n<turns;n++)[x,y]=[-y,x];return[x,y];})));
 assert(!oldTransforms.includes(canonical(points)),'New shape must differ from every rotation/reflection of the old H');
 report.geometry={width:level.width,height:level.height,playable:40,connected:true,mirrorX,mirrorY,interiorHoles:holes,notOldDihedralTransform:true};
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(b=>b.match?.quarterTurns===0));
 report.audits={art:api.auditCandidateBlockArt(level),opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gateSpans:auditGateSpanLimits(level)};
 for(const[key,result]of Object.entries(report.audits))assert(result.passed,`${key}: ${JSON.stringify(result)}`);
 const skip=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const oldAudit=api.auditRevisedCandidate(level,undefined);report.hardIssues=oldAudit.issues.filter(i=>!skip.has(i.code));assert.deepEqual(report.hardIssues,[]);
 report.replacedHistoricalChecks=oldAudit.issues.filter(i=>skip.has(i.code));
 for(const p of new Set(report.audits.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete,JSON.stringify(report.replay));assert.equal(report.replay.clearEvents,10);assert(report.replay.nonClearingDrags>=16&&report.replay.nonClearingDrags<=20);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.routeProjection=[];
 for(const[index,drag]of drags.entries()){
  const initial=model.snapshot(),prior=stateFromSnapshot(c,initial),bi=c.blocks.findIndex(b=>b.id===drag.blockId);model.beginAction();
  for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),next=stateFromSnapshot(c,after),cost=after.cleared===initial.cleared?1:0;let present=false;
  forEachGesture(c,prior,(i,v,edge)=>{if(i===bi&&v===next[bi]&&edge===cost)present=true;});assert(present,`Actual step ${index+1} must be in lower-bound superset`);
  const changed=prior.slice();changed[bi]=next[bi];assert.deepEqual(changed,next);report.routeProjection.push({step:index+1,blockId:drag.blockId,cost,present});
 }
 assert(model.snapshot().complete);
 const testFiles=['tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'];
 const tests=spawnSync(process.execPath,['--test',...testFiles],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
 report.qualification={testFiles,exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr,error:tests.error?.message??null};assert.equal(tests.status,0,'Fresh full-width/mask and identity/normalization qualifications must pass');
 report.unquotientedFloor=checkFastFloor(level,{floor:16,maxStates:250000,maxMilliseconds:30000});assert(report.unquotientedFloor.thresholdProven,JSON.stringify(report.unquotientedFloor));
 report.quotientedFloor=checkSymmetryFloor(level,{floor:16,maxStates:250000,maxMilliseconds:30000});assert(report.quotientedFloor.thresholdProven,JSON.stringify(report.quotientedFloor));
 report.lowerBound=16;report.upperBound=report.replay.nonClearingDrags;report.exactNecessaryRepositions=report.upperBound===16?16:null;
 report.starTargets=api.levelStarTargets(level);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,lowerBound:report.lowerBound,upperBound:report.upperBound,error:report.error}));
