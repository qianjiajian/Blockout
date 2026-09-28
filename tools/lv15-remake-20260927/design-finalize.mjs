import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey,clearCount,checkFastFloor} from '../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';

const sourceFile='deliverables/lv15-remake-20260927/design-search-1790492591676/route-2.json';
const ledgerFile='deliverables/lv15-remake-20260927/source-ledger.json',baselineFile='deliverables/lv15-remake-20260927/baseline.json';
const stamp=Date.now(),candidateFile=`deliverables/lv15-remake-20260927/design-final-${stamp}.json`,reportFile=`deliverables/lv15-remake-20260927/design-proof-${stamp}.json`;
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.83.0');
const {level,drags}=JSON.parse(fs.readFileSync(sourceFile));
const baseline=JSON.parse(fs.readFileSync(baselineFile)).level,ledger=JSON.parse(fs.readFileSync(ledgerFile));
fs.writeFileSync(candidateFile,JSON.stringify({level,drags},null,2)+'\n',{flag:'wx'});
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [sourceFile,ledgerFile,baselineFile,candidateFile,'tools/lv15-remake-20260927/design-finalize.mjs',
 'tools/revised-preview-validation-v160.mjs','tools/verify-rules-lock.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs',
 'tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs',
 'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md'])bind(p);
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,candidateFile,
 candidateRawSha256:bindings[candidateFile],levelSha256:digest(level),routeSha256:digest(drags),sourceFile,
 scope:'Candidate source/static checks and fresh supported shell-aware spatial lower bound/full model replay, not GUI/time/formal adoption',
 pointerValidated:false,timeValidated:false,formalAdoptionValidated:false,bindings};
try{
 const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
  export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
  export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';
  export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
  export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
  export {levelStarTargets} from './src/core/levelStarConditions.ts';`},bundle:true,write:false,platform:'node',format:'esm',metafile:true});
 for(const p of Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>'))bind(p);
 const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const inv=bs=>bs.map(b=>JSON.stringify({color:b.color,shape:b.shape,layers:b.layers??[b.color],frozen:b.frozen??0})).sort();
 assert.deepEqual(inv(level.blocks),inv(ledger.blocks));
 const gi=gs=>gs.map(g=>JSON.stringify({color:g.color,frozen:g.frozen??0})).sort();assert.deepEqual(gi(level.gates),gi(ledger.gates));
 assert.equal(level.id,15);assert.equal(level.difficulty,'easy');assert.equal(level.designTargets,undefined);
 for(const key of ['id','name','timeSeconds','reward','parMoves','featureIntro'])assert.deepEqual(level[key],baseline[key]);
 assert.equal(level.timeSeconds,120);assert.equal(level.reward,60);assert.equal(level.parMoves,536);assert.equal(level.preservedMoveTarget,34);
 report.starTargets=api.levelStarTargets(level);assert.deepEqual(report.starTargets,{moveTarget:34,timeTargetSeconds:86});
 assert.equal(level.blocks.length,10);assert.equal(level.blocks.filter(b=>b.layers?.length===2).length,5);
 assert(level.blocks.every(b=>b.shape.length===4&&(b.layers?.length??1)<=2&&!b.frozen));
 for(const p of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','blocked','seams'])assert.deepEqual(level[p]??[],[]);
 api.validateLevel(level);
 const ps=level.playable,cells=new Set(ps.map(p=>p.join(','))),owner=new Map();assert.equal(ps.length,40);assert.equal(cells.size,40);
 for(const b of level.blocks)for(const[dx,dy]of b.shape){const k=[b.x+dx,b.y+dy].join(',');assert(cells.has(k));assert(!owner.has(k));owner.set(k,b);}
 assert.equal(owner.size,40);const adjacency=[];
 for(const[k,b]of owner){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=owner.get(p.join(','));if(o&&o.id!==b.id&&o.color===b.color)adjacency.push([b.id,o.id]);}}assert.deepEqual(adjacency,[]);
 const mirrorX=ps.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=ps.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX||mirrorY);
 const visited=new Set([ps[0].join(',')]),todo=[ps[0]];
 for(let i=0;i<todo.length;i++){const[x,y]=todo[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));todo.push(p);}}assert.equal(visited.size,40);
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let i=0;i<pending.length;i++){const[x,y]=pending[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)assert(cells.has(`${x},${y}`)||outside.has(`${x},${y}`));
 const shapeKey=points=>{const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));return points.map(([x,y])=>`${x-minX},${y-minY}`).sort().join('|');};
 const transforms=[];for(const reflect of [1,-1])for(let turn=0;turn<4;turn++)transforms.push(shapeKey(baseline.playable.map(([x,y])=>{x*=reflect;for(let i=0;i<turn;i++)[x,y]=[-y,x];return[x,y];})));
 assert(!transforms.includes(shapeKey(ps)));
 report.geometry={width:level.width,height:level.height,playable:40,mirrorX,mirrorY,connected:true,holes:0,notSourceD4:true,
  rows:Array.from({length:level.height},(_,y)=>Array.from({length:level.width},(_,x)=>cells.has(`${x},${y}`)?'#':'.').join(''))};
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(r=>r.match?.quarterTurns===0));
 report.art=api.auditCandidateBlockArt(level);report.coverage=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());report.gateSpans=auditGateSpanLimits(level);
 for(const v of [report.art,report.coverage,report.gateSpans])assert(v.passed,JSON.stringify(v));for(const p of new Set(report.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 const historical=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const old=api.auditRevisedCandidate(level,undefined);report.hardIssues=old.issues.filter(i=>!historical.has(i.code));assert.deepEqual(report.hardIssues,[]);report.replacedHistoricalChecks=old.issues.filter(i=>historical.has(i.code));
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete);assert.equal(report.replay.nonClearingDrags,6);assert.equal(report.replay.clearEvents,15);assert.equal(report.replay.effectiveDrags,21);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.steps=[];let peels=0,removals=0,repositions=0;
 for(const[index,drag]of drags.entries()){
  const before=model.snapshot(),body=before.blocks.find(b=>b.id===drag.blockId),initial=stateFromSnapshot(c,before),start=[body.x,body.y];assert.equal(body.frozen,0);
  model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),remaining=after.blocks.find(b=>b.id===drag.blockId),next=stateFromSnapshot(c,after),event=after.cleared-before.cleared,cost=event?0:1;
  const kind=!event?'reposition':remaining?'peel':'removal';if(kind==='peel'){
   peels++;assert.equal(before.blocks.length,after.blocks.length);assert.deepEqual(remaining.layers,body.layers.slice(1));assert.equal(remaining.color,body.layers[1]);
   assert.deepEqual(remaining.shape,body.shape);assert.deepEqual([remaining.x,remaining.y],drag.path.at(-1)??start);
  }else if(kind==='removal')removals++;else repositions++;
  assert.equal(event,cost?0:1);assert.equal(clearCount(c,next),after.cleared);
  let projected=false;forEachGesture(c,initial,(bi,value,edge)=>{if(c.blocks[bi].id!==drag.blockId||edge!==cost)return;const s=initial.slice();s[bi]=value;if(stateKey(s)===stateKey(next)){projected=true;return false;}});assert(projected);
  for(const g of after.gates)assert.equal(g.frozen,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-after.cleared));
  report.steps.push({step:index+1,blockId:drag.blockId,initialLayers:body.layers,finalLayers:remaining?.layers??null,start,path:drag.path,exitSide:drag.exitSide??null,kind,cost,
   clearedBefore:before.cleared,clearedAfter:after.cleared,projected,remainingGateIce:after.gates.map(g=>({color:g.color,frozen:g.frozen}))});
 }
 assert.equal(peels,5);assert.equal(removals,10);assert.equal(repositions,6);report.events={peels,removals,repositions,multiCellRepositions:6,singleCellRepositions:0};
 const tests=spawnSync(process.execPath,['--test','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:4000000});
 report.qualification={exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr,scope:'Includes real-model shell stage edges, peel clear increments and frozen gate examples; normalization explicitly never forces peels.'};assert.equal(tests.status,0);
 let t=Date.now();report.quotientFloor=checkSymmetryFloor(level,{floor:6,maxStates:500000,maxMilliseconds:30000});report.quotientFloor.elapsedMs=Date.now()-t;assert(report.quotientFloor.thresholdProven,JSON.stringify(report.quotientFloor));
 t=Date.now();report.rawMaskFloor=checkFastFloor(level,{floor:6,maxStates:1000000,maxMilliseconds:30000});report.rawMaskFloor.elapsedMs=Date.now()-t;assert(report.rawMaskFloor.thresholdProven,JSON.stringify(report.rawMaskFloor));
 report.proofArgument='The <=2-layer optional-contact mask graph contains every supported real turning drag. Peels retain the complete footprint at the reached pose, change only the layer stage, cost zero repositions and add one clear to all ice gates. Only final removals are normalized; peels never are. Both raw and mechanically-identical identity-quotient graphs freshly exhaust costs0..5. Current full-model witness costs6, establishing exact6 in the required easy5..10 band.';
 report.requiredFloor=5;report.lowerBound=6;report.upperBound=6;report.exactNecessaryRepositions=6;report.sourceInventoryPairedExact=true;
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidateFile,reportFile,status:report.status,levelSha256:report.levelSha256,lower:report.lowerBound,upper:report.upperBound,events:report.events,error:report.error}));
