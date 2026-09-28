import fs from 'node:fs';
import {preserveOther199,currentBaselineFile,rawHash} from './acceptance-baseline.mjs';
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

const file=process.argv[2],formal=process.argv.includes('--formal');
assert(file,'Usage: acceptance-static.mjs candidate.json [--formal]');
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.89.0');
const folder='deliverables/lv20-remake-20260927',baselineFile=folder+'/baseline.json',sourceFile=folder+'/source-ledger.json',correctionFile=folder+'/recheck-source-gates-20260927.md';
const baseline=JSON.parse(fs.readFileSync(baselineFile)),source=JSON.parse(fs.readFileSync(sourceFile));
const data=JSON.parse(fs.readFileSync(file)),drags=data.drags??data.route;let level=data.level;
assert.equal(level?.id,20);assert(drags?.length);
const {api,inputs}=await loadApi();
if(formal){assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[19])),level);level=JSON.parse(JSON.stringify(api.LEVELS[19]));}
const output=`${folder}/acceptance-${formal?'formal-':''}static-${Date.now()}.json`;
const report={generatedAt:new Date().toISOString(),status:'running',formalSourceObjectUsed:formal,ruleVersion:lock.activeVersion,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),difficultyCertified:false,pointerValidated:false,timeValidated:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [...inputs,file,baselineFile,sourceFile,correctionFile,'tools/lv20-remake-20260927/acceptance-static.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs','tools/level21-reposition-floor.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.87.0.md','docs/rules/mechanism-rules-v1.88.0.md','docs/rules/mechanism-rules-v1.89.0.md',currentBaselineFile,'tools/lv20-remake-20260927/acceptance-baseline.mjs'])bind(p);
for(const sec of [462,465,467,469,471,473,476,478])bind(`${folder}/source-video-${sec}.png`);
report.bindings=bindings;
try{
 assert.equal(source.levelId,20);
 for(const key of ['id','name','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(level[key],baseline.level[key],`Preserve ${key}`);
 assert.equal(level.difficulty,'easy');assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 assert.equal(level.timeSeconds,75);assert.equal(level.reward,85);assert.equal(level.parMoves,24);assert.deepEqual(api.levelStarTargets(level),{moveTarget:24,timeTargetSeconds:54});assert.equal(level.designTargets,undefined,'Old planning labels must not be carried into fresh certification');
 report.other199=preserveOther199(api);
 report.sharedSource=Object.entries(baseline.files).filter(([p])=>p!=='src/core/levels.ts').map(([path,before])=>({path,before,now:digest(fs.readFileSync(path))}));assert(report.sharedSource.every(x=>x.before===x.now));
 assert.notDeepEqual(geometry(level),geometry(baseline.level));assert.deepEqual(level.blocked??[],[]);assert.deepEqual(level.seams??[],[]);
 assert.equal(level.blocks.length,14);assert.equal(new Set(level.blocks.map(b=>b.id)).size,14);
 assert.equal(level.shutters.length,1);const cover=level.shutters[0];assert.equal(cover.count,6);assert.equal(cover.skin,'shutter');assert.equal(cover.width*cover.height,15);assert(Object.keys(cover).every(k=>['id','x','y','width','height','count','skin'].includes(k)));
 const allowedRecolors={'source20-b2-02':'orange','source20-b2-06':'purple','source20-b2-04':'cyan'};
 const shapeKey=b=>b.shape.map(p=>p.join(',')).sort().join('|');
 report.sourceBodies=[];
 for(const b of level.blocks){
  assert(Object.keys(b).every(k=>['id','color','shape','x','y','shutterId'].includes(k)),`No added mechanism on ${b.id}`);
  const old=source.blocks.find(x=>x.id===b.id.replace(/^lv20-/,'source20-'));assert(old,`Explicit source identity for ${b.id}`);
  assert.deepEqual(b.shape,old.shape);assert.equal(b.color,allowedRecolors[old.id]??old.color);assert.equal(!!b.shutterId,!!old.shutterId);if(b.shutterId)assert.equal(b.shutterId,cover.id);
  report.sourceBodies.push({id:b.id,sourceId:old.id,sourceColor:old.color,designColor:b.color,recolored:b.color!==old.color,hidden:!!b.shutterId});
 }
 assert.equal(report.sourceBodies.filter(x=>x.recolored).length,3);
 for(const hidden of [false,true]){const bodies=level.blocks.filter(b=>!!b.shutterId===hidden);assert.equal(bodies.length,7);assert.equal(bodies.filter(b=>shapeKey(b)==='0,0|1,0').length,6);assert.equal(bodies.filter(b=>shapeKey(b)==='0,0|0,1|0,2').length,1);}
 for(const field of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert.deepEqual(level[field]??[],[],`No added ${field}`);
 assert.equal(level.gates.length,8);const gates=Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0]));assert.equal(Object.keys(gates).length,8);assert.deepEqual(gates,{yellow:0,orange:6,cyan:10,red:3,blue:2,purple:7,green:8,pink:1});
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen'].includes(k)));
 report.sourceGateFacts={yellow:0,pink:[1,7],blue:[2,10],red:[3,6],green:8};report.designGateMapping=gates;report.minimumAdaptation={gates:['red6→orange6','pink7→purple7','blue10→cyan10'],hiddenBodies:allowedRecolors,remainingBodiesPreserved:11};
 api.validateLevel(level);
 const points=level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]),cells=new Set(points.map(p=>p.join(',')));
 assert.equal(points.length,30);assert.equal(cells.size,30);
 const visited=new Set([points[0].join(',')]),queue=[points[0]];
 for(let at=0;at<queue.length;at++){const[x,y]=queue[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));queue.push(p);}}
 assert.equal(visited.size,30);
 const mirrorX=points.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=points.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX||mirrorY);
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let at=0;at<pending.length;at++){const[x,y]=pending[at];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 const holes=[];for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)if(!cells.has(`${x},${y}`)&&!outside.has(`${x},${y}`))holes.push([x,y]);assert.deepEqual(holes,[]);
 const canonical=ps=>{const minX=Math.min(...ps.map(p=>p[0])),minY=Math.min(...ps.map(p=>p[1]));return ps.map(([x,y])=>`${x-minX},${y-minY}`).sort().join('|');};
 const oldTransforms=[];for(const reflect of [1,-1])for(let turns=0;turns<4;turns++)oldTransforms.push(canonical(baseline.level.playable.map(([x,y])=>{x*=reflect;for(let n=0;n<turns;n++)[x,y]=[-y,x];return[x,y];})));
 assert(!oldTransforms.includes(canonical(points)));report.geometry={width:level.width,height:level.height,playable:30,sourcePlayable:32,sourceOccupied:30,connected:true,mirrorX,mirrorY,interiorHoles:holes,notSourceDihedralTransform:true};
 report.adjacency=[];
 for(const hidden of [false,true]){const bodies=level.blocks.filter(b=>!!b.shutterId===hidden),occupied=new Map();for(const b of bodies)for(const[dx,dy]of b.shape){const k=`${b.x+dx},${b.y+dy}`;assert(cells.has(k));assert(!occupied.has(k));occupied.set(k,b);}for(const[k,b]of occupied){const[x,y]=k.split(',').map(Number);for(const[xx,yy]of [[x+1,y],[x,y+1]]){const other=occupied.get(`${xx},${yy}`);if(other&&other.id!==b.id){assert.notEqual(b.color,other.color,`Independent same-color neighbors ${b.id}/${other.id}`);report.adjacency.push([b.id,other.id]);}}}}
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(b=>b.match?.quarterTurns===0));
 report.audits={art:api.auditCandidateBlockArt(level),opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gateSpans:auditGateSpanLimits(level)};for(const[key,result]of Object.entries(report.audits))assert(result.passed,`${key}: ${JSON.stringify(result)}`);
 const skip=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);const oldAudit=api.auditRevisedCandidate(level,undefined);report.hardIssues=oldAudit.issues.filter(i=>!skip.has(i.code));assert.deepEqual(report.hardIssues,[]);report.replacedHistoricalChecks=oldAudit.issues.filter(i=>skip.has(i.code));
 for(const p of new Set(report.audits.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete,JSON.stringify(report.replay));assert.equal(report.replay.clearEvents,14);assert(report.replay.nonClearingDrags>=5&&report.replay.nonClearingDrags<=10);assert(drags.length<=24);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.routeProjection=[];report.routeMechanisms=[];
 for(const[index,drag]of drags.entries()){
  const initial=model.snapshot(),prior=stateFromSnapshot(c,initial),bi=c.blocks.findIndex(b=>b.id===drag.blockId),moving=initial.blocks.find(b=>b.id===drag.blockId);assert(moving);assert(!moving.shutterId||initial.shutters.find(s=>s.id===moving.shutterId).revealed,'Hidden bodies may not move');
  model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),next=stateFromSnapshot(c,after),cost=after.cleared===initial.cleared?1:0;let present=false;forEachGesture(c,prior,(i,v,edge)=>{if(i===bi&&v===next[bi]&&edge===cost)present=true;});assert(present,`Actual step ${index+1} must be in lower-bound superset`);
  const changed=prior.slice();changed[bi]=next[bi];assert.deepEqual(changed,next);assert.equal(after.blocks.length,initial.blocks.length-(1-cost));
  const shutter=after.shutters[0];assert.equal(shutter.count,Math.max(0,6-after.cleared));assert.equal(shutter.revealed,after.cleared>=6);for(const g of after.gates)assert.equal(g.frozen??0,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-after.cleared));
  if(initial.cleared<6&&after.cleared===6){report.reveal={step:index+1,cleared:6,hiddenIds:after.blocks.filter(b=>b.shutterId).map(b=>b.id)};assert.equal(report.reveal.hiddenIds.length,7);}
  report.routeProjection.push({step:index+1,blockId:drag.blockId,cost,area:moving.shape.length,present});report.routeMechanisms.push({step:index+1,cleared:after.cleared,shutter:structuredClone(shutter),gates:after.gates.map(g=>({id:g.id,frozen:g.frozen??0}))});
 }
 assert(model.snapshot().complete);assert(report.reveal);report.repositionKinds={multiCell:report.routeProjection.filter(x=>x.cost&&x.area>1).length,singleCell:report.routeProjection.filter(x=>x.cost&&x.area===1).length};assert.equal(report.repositionKinds.singleCell,0);
 const testFiles=['tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],tests=spawnSync(process.execPath,['--test',...testFiles],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});report.qualification={testFiles,exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr,error:tests.error?.message??null};assert.equal(tests.status,0);
 report.unquotientedFloor=checkFastFloor(level,{floor:5,maxStates:1000000,maxMilliseconds:30000});assert(report.unquotientedFloor.thresholdProven,JSON.stringify(report.unquotientedFloor));
 report.quotientedFloor=checkSymmetryFloor(level,{floor:5,maxStates:1000000,maxMilliseconds:30000});assert(report.quotientedFloor.thresholdProven,JSON.stringify(report.quotientedFloor));
 report.lowerBound=5;report.upperBound=report.replay.nonClearingDrags;report.exactNecessaryRepositions=report.upperBound===5?5:null;report.difficultyCertified=true;report.starTargets=api.levelStarTargets(level);report.totalDrags=drags.length;report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,status:report.status,lowerBound:report.lowerBound,upperBound:report.upperBound,error:report.error}));
