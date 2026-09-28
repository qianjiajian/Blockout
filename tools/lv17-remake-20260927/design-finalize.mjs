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
import {checkNativeFloor,SOURCE as nativeSource,WRAPPER as nativeWrapper} from './design-native.mjs';

const sourceFile='deliverables/lv17-remake-20260927/design-bottom-1790495976071/attempt-2.json';
const ledgerFile='deliverables/lv17-remake-20260927/source-ledger.json',baselineFile='deliverables/lv17-remake-20260927/baseline.json';
const qualificationFile='deliverables/lv17-remake-20260927/validation-qualification-1790495649173.json';
const stamp=Date.now(),candidateFile='deliverables/lv17-remake-20260927/design-final-1790496481129.json',reportFile=`deliverables/lv17-remake-20260927/design-proof-${stamp}.json`;
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const {level,drags}=JSON.parse(fs.readFileSync(sourceFile));
const baseline=JSON.parse(fs.readFileSync(baselineFile)).level,ledger=JSON.parse(fs.readFileSync(ledgerFile));
assert.deepEqual(JSON.parse(fs.readFileSync(candidateFile)),{level,drags});
assert.equal(digest(fs.readFileSync(candidateFile)),'7af3bd619d59da2cc74d7e908507754071912938547247b47b721e864aef1cae');
console.log(JSON.stringify({candidateFile,status:'FROZEN_CANDIDATE_PROOF_RUNNING'}));
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [sourceFile,ledgerFile,baselineFile,candidateFile,qualificationFile,'tools/lv17-remake-20260927/design-finalize.mjs',
 'tools/lv17-remake-20260927/design-search.mjs','tools/lv17-remake-20260927/design-bottom.mjs',nativeSource,nativeWrapper,'tools/lv11-remake-20260927/design-witness.mjs',
 'tools/revised-preview-validation-v160.mjs','tools/verify-rules-lock.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs',
 'tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs',
 'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md'])bind(p);
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
 const property=b=>({color:b.color,shape:b.shape,layers:b.layers??[b.color],frozen:b.frozen??0});
 assert.deepEqual(level.blocks.map(b=>JSON.stringify(property(b))).sort(),ledger.blocks.map(b=>JSON.stringify(property(b))).sort());
 report.sourceMapping=level.blocks.map(b=>{const id=b.id.replace(/^lv17-/,'source17-'),s=ledger.blocks.find(b=>b.id===id);assert(s);assert.deepEqual(property(b),property(s));return{candidateId:b.id,sourceId:id,sourceColor:s.sourceColor,color:b.color};});
 const gi=gs=>gs.map(g=>JSON.stringify({color:g.color,frozen:g.frozen??0})).sort();assert.deepEqual(gi(level.gates),gi(ledger.gates));
 assert.equal(level.id,17);assert.equal(level.difficulty,'normal');assert.equal(level.designTargets,undefined);assert.equal(level.featureIntro,undefined);
 for(const key of ['id','name','timeSeconds','reward','parMoves'])assert.deepEqual(level[key],baseline[key]);
 assert.equal(level.timeSeconds,135);assert.equal(level.reward,70);assert.equal(level.parMoves,71);assert.equal(level.preservedMoveTarget,71);
 report.starTargets=api.levelStarTargets(level);assert.deepEqual(report.starTargets,{moveTarget:71,timeTargetSeconds:97});
 assert.equal(level.blocks.length,26);assert.equal(level.blocks.filter(b=>b.layers?.length===2).length,5);
 assert.equal(level.blocks.filter(b=>b.shape.length===3).length,6);assert.equal(level.blocks.filter(b=>b.shape.length===1).length,12);
 assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen).sort((a,b)=>a-b),[6,6,6,18,18,19,19]);
 assert(level.blocks.every(b=>(b.layers?.length??1)<=2));
 for(const p of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','blocked','seams'])assert.deepEqual(level[p]??[],[]);
 api.validateLevel(level);
 const ps=level.playable,cells=new Set(ps.map(p=>p.join(','))),owner=new Map();assert.equal(ps.length,48);assert.equal(cells.size,48);
 for(const b of level.blocks)for(const[dx,dy]of b.shape){const k=[b.x+dx,b.y+dy].join(',');assert(cells.has(k));assert(!owner.has(k));owner.set(k,b);}assert.equal(owner.size,48);
 const adjacency=[];for(const[k,b]of owner){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=owner.get(p.join(','));if(o&&o.id!==b.id&&o.color===b.color)adjacency.push([b.id,o.id]);}}assert.deepEqual(adjacency,[]);
 const mirrorX=ps.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=ps.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX&&mirrorY);
 const visited=new Set([ps[0].join(',')]),todo=[ps[0]];
 for(let i=0;i<todo.length;i++){const[x,y]=todo[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));todo.push(p);}}assert.equal(visited.size,48);
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let i=0;i<pending.length;i++){const[x,y]=pending[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)assert(cells.has(`${x},${y}`)||outside.has(`${x},${y}`));
 const layout=(blocks,reflect=1,turns=0)=>{
  const rows=blocks.map(b=>b.shape.map(([dx,dy])=>{let x=(b.x+dx)*reflect,y=b.y+dy;for(let n=0;n<turns;n++)[x,y]=[-y,x];return[x,y];}));
  const all=rows.flat(),mx=Math.min(...all.map(p=>p[0])),my=Math.min(...all.map(p=>p[1]));
  return rows.map(row=>row.map(([x,y])=>[x-mx,y-my].join(',')).sort().join('|')).sort().join(';');
 };
 const sourcePartitions=[];for(const reflect of [1,-1])for(let turn=0;turn<4;turn++)sourcePartitions.push(layout(ledger.blocks,reflect,turn));assert(!sourcePartitions.includes(layout(level.blocks)));
 assert.equal(level.width,6);assert.equal(level.height,8);
 report.geometry={width:6,height:8,playable:48,mirrorX,mirrorY,connected:true,holes:0,sourceRectanglePreserved:true,partitionChangedBeyondSourceD4:true};
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(r=>r.match?.quarterTurns===0));
 report.art=api.auditCandidateBlockArt(level);report.coverage=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());report.gateSpans=auditGateSpanLimits(level);
 for(const v of [report.art,report.coverage,report.gateSpans])assert(v.passed,JSON.stringify(v));for(const p of new Set(report.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 const historical=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const old=api.auditRevisedCandidate(level,undefined);report.hardIssues=old.issues.filter(i=>!historical.has(i.code));assert.deepEqual(report.hardIssues,[]);report.replacedHistoricalChecks=old.issues.filter(i=>historical.has(i.code));
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete);assert.equal(report.replay.nonClearingDrags,13);assert.equal(report.replay.clearEvents,31);assert.equal(report.replay.effectiveDrags,44);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.steps=[];let peels=0,removals=0,repositions=0,multiCellRepositions=0,singleCellRepositions=0;const perBlock={};
 for(const[index,drag]of drags.entries()){
  const before=model.snapshot(),body=before.blocks.find(b=>b.id===drag.blockId),initial=stateFromSnapshot(c,before),start=[body.x,body.y];assert.equal(body.frozen,0);
  model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),remaining=after.blocks.find(b=>b.id===drag.blockId),next=stateFromSnapshot(c,after),event=after.cleared-before.cleared,cost=event?0:1;
  const kind=!event?'reposition':remaining?'peel':'removal';if(kind==='peel'){
   peels++;assert.equal(before.blocks.length,after.blocks.length);assert.deepEqual(remaining.layers,body.layers.slice(1));assert.equal(remaining.color,body.layers[1]);assert.deepEqual(remaining.shape,body.shape);assert.deepEqual([remaining.x,remaining.y],drag.path.at(-1)??start);
  }else if(kind==='removal')removals++;else{repositions++;if(body.shape.length>1)multiCellRepositions++;else singleCellRepositions++;const row=perBlock[body.id]??={area:body.shape.length,steps:[]};row.steps.push(index+1);}
  assert.equal(event,cost?0:1);assert.equal(clearCount(c,next),after.cleared);
  let projected=false;forEachGesture(c,initial,(bi,value,edge)=>{if(c.blocks[bi].id!==drag.blockId||edge!==cost)return;const s=initial.slice();s[bi]=value;if(stateKey(s)===stateKey(next)){projected=true;return false;}});assert(projected);
  for(const g of after.gates)assert.equal(g.frozen,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-after.cleared));
  for(const b of after.blocks)assert.equal(b.frozen,Math.max(0,(level.blocks.find(x=>x.id===b.id).frozen??0)-after.cleared));
  report.steps.push({step:index+1,blockId:drag.blockId,area:body.shape.length,initialLayers:body.layers,finalLayers:remaining?.layers??null,start,path:drag.path,exitSide:drag.exitSide??null,kind,cost,clearedBefore:before.cleared,clearedAfter:after.cleared,projected,remainingGateIce:after.gates.map(g=>({color:g.color,frozen:g.frozen}))});
 }
 assert.equal(peels,5);assert.equal(removals,26);assert.equal(repositions,13);assert.equal(multiCellRepositions,7);assert.equal(singleCellRepositions,6);report.events={peels,removals,repositions,multiCellRepositions,singleCellRepositions};report.repositionsByBlock=perBlock;
 const qualification=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(qualification.status,'PASS');assert.equal(qualification.ruleVersion,'1.85.0');
 for(const[p,h]of Object.entries(qualification.bindings)){assert.equal(digest(fs.readFileSync(p)),h,p);bind(p);}report.shellQualification={file:qualificationFile,sha256:bindings[qualificationFile],status:qualification.status,fixtures:qualification.fixtures.length,narrowGateCases:qualification.narrowGates.length};
 const tests=spawnSync(process.execPath,['--test','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:4000000});report.qualification={exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr};assert.equal(tests.status,0);
 const nativeQualificationFile=process.argv[2];assert(nativeQualificationFile,'Pass current native qualification JSON path');
 const nq=JSON.parse(fs.readFileSync(nativeQualificationFile));assert.equal(nq.status,'PASS');
 bind(nativeQualificationFile);for(const[p,h]of Object.entries(nq.bindings)){assert.equal(digest(fs.readFileSync(p)),h,p);bind(p);}
 report.nativeQualification={file:nativeQualificationFile,sha256:bindings[nativeQualificationFile],status:nq.status};
 let t=Date.now();report.nativeFloor=checkNativeFloor(level,{floor:11,maxStates:3000000,maxMilliseconds:45000});report.nativeFloor.elapsedMs=Date.now()-t;assert(report.nativeFloor.thresholdProven,JSON.stringify(report.nativeFloor));
 for(const p of [report.nativeFloor.exe,report.nativeFloor.input,report.nativeFloor.output])bind(p);
 t=Date.now();report.rawMaskFloor=checkFastFloor(level,{floor:11,maxStates:250000,maxMilliseconds:5000});report.rawMaskFloor.elapsedMs=Date.now()-t;
 report.proofArgument='The current qualified <=2-layer optional-contact compiler contains every supported real turning drag; all five shells retain rigid occupancy at the peel pose, cost zero repositions, and advance every source body/gate ice counter. Frozen19 H3 shells cannot act before clear19. The unchanged qualified native backend normalizes final removals only, quotients exact shape/layers/ice identities, and soundly omits terminal-budget incomplete states only when no zero-cost peel exists. Fresh exhaustion excludes costs0..10. Raw mask and prior JS timeouts remain UNKNOWN, not certificates. Full authoritative U13 makes the optimum lie in [11,13], not necessarily13.';
 report.requiredFloor=11;report.lowerBound=11;report.upperBound=13;report.exactNecessaryRepositions=null;report.sourceInventoryPairedExact=true;
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidateFile,reportFile,status:report.status,levelSha256:report.levelSha256,lower:report.lowerBound,upper:report.upperBound,events:report.events,error:report.error}));
