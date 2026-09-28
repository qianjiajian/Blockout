import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,stateKey,checkFastFloor} from '../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';

const sourceFile='deliverables/lv12-remake-20260927/design-local-1790491396104/route-4.json';
const sourceLedger='deliverables/lv12-remake-20260927/source-ledger.json';
const stamp=Date.now(),candidateFile=`deliverables/lv12-remake-20260927/design-final-${stamp}.json`;
const reportFile=`deliverables/lv12-remake-20260927/design-proof-${stamp}.json`;
const lock=verifyRulesLock();assert.equal(lock.ok,true);assert.equal(lock.activeVersion,'1.82.0');
const prior=JSON.parse(fs.readFileSync(sourceFile)),level=structuredClone(prior.level),drags=prior.drags;
assert.equal(drags.length,28);assert.equal(level.preservedMoveTarget,21);
level.preservedMoveTarget=drags.length;
const candidate={level,drags};
fs.writeFileSync(candidateFile,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
for(const p of [candidateFile,sourceFile,sourceLedger,'tools/lv12-remake-20260927/design-finalize.mjs',
 'tools/revised-preview-validation-v160.mjs','tools/verify-rules-lock.mjs','tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs',
 'tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs',
 'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.81.0.md','docs/rules/mechanism-rules-v1.82.0.md'])bind(p);
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,candidateFile,
 levelSha256:digest(level),routeSha256:digest(drags),candidateRawSha256:bindings[candidateFile],source:sourceFile,
 scope:'Fresh specific candidate lower bound and full authoritative spatial witness; GUI/time/formal adoption independent',
 pointerValidated:false,timeValidated:false,formalAdoptionValidated:false,bindings};
try{
 const bundled=await build({stdin:{resolveDir:process.cwd(),contents:`
  export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
  export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
  export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';
  export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
  export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
  export {levelStarTargets} from './src/core/levelStarConditions.ts';`},
  bundle:true,write:false,platform:'node',format:'esm',metafile:true});
 for(const p of Object.keys(bundled.metafile.inputs).filter(p=>p!=='<stdin>'))bind(p);
 const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const ledger=JSON.parse(fs.readFileSync(sourceLedger));
 const inv=bs=>bs.map(b=>JSON.stringify({color:b.color,shape:b.shape,frozen:b.frozen??0})).sort();
 assert.deepEqual(inv(level.blocks),inv(ledger.blocks));
 const gi=gs=>gs.map(g=>JSON.stringify({color:g.color,frozen:g.frozen??0})).sort();
 assert.deepEqual(gi(level.gates),gi(ledger.gates));
 assert.equal(level.blocks.length,12);assert.equal(level.designTargets,undefined);
 assert.deepEqual(level.blocks.map(b=>b.shape),Array.from({length:12},()=>[[0,0],[0,1],[0,2]]));
 assert.deepEqual(level.blocks.filter(b=>b.frozen).map(b=>b.frozen).sort(),[1,1,2,2]);
 for(const p of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors','blocked','seams'])assert.deepEqual(level[p]??[],[]);
 assert.equal(level.id,12);assert.equal(level.name,'窄道融霜');assert.equal(level.difficulty,'hard');
 assert.equal(level.timeSeconds,120);assert.equal(level.reward,45);assert.equal(level.parMoves,21);
 report.starTargets=api.levelStarTargets(level);assert.equal(report.starTargets.moveTarget,28);assert.equal(report.starTargets.timeTargetSeconds,86);
 api.validateLevel(level);
 const ps=level.playable,cells=new Set(ps.map(p=>p.join(','))),owner=new Map();assert.equal(ps.length,36);assert.equal(cells.size,36);
 for(const b of level.blocks)for(const[dx,dy]of b.shape){const p=[b.x+dx,b.y+dy],k=p.join(',');assert(cells.has(k));assert(!owner.has(k));owner.set(k,b);}
 assert.equal(owner.size,36);const adjacency=[];
 for(const[k,b]of owner){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=owner.get(p.join(','));if(o&&o.id!==b.id&&o.color===b.color)adjacency.push([b.id,o.id]);}}
 assert.deepEqual(adjacency,[]);
 const mirrorX=ps.every(([x,y])=>cells.has(`${level.width-1-x},${y}`)),mirrorY=ps.every(([x,y])=>cells.has(`${x},${level.height-1-y}`));assert(mirrorX||mirrorY);
 const visited=new Set([ps[0].join(',')]),todo=[ps[0]];
 for(let i=0;i<todo.length;i++){const[x,y]=todo[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(cells.has(p.join(','))&&!visited.has(p.join(','))){visited.add(p.join(','));todo.push(p);}}
 assert.equal(visited.size,36);
 const outside=new Set(['-1,-1']),pending=[[-1,-1]];
 for(let i=0;i<pending.length;i++){const[x,y]=pending[i];for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const[xx,yy]=p,k=p.join(',');if(xx>=-1&&xx<=level.width&&yy>=-1&&yy<=level.height&&!cells.has(k)&&!outside.has(k)){outside.add(k);pending.push(p);}}}
 for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)assert(cells.has(`${x},${y}`)||outside.has(`${x},${y}`));
 report.geometry={width:level.width,height:level.height,playable:36,mirrorX,mirrorY,connected:true,holes:0,sourcePlayables:42,sourceD4DistinctByCellCount:true,
  rows:Array.from({length:level.height},(_,y)=>Array.from({length:level.width},(_,x)=>cells.has(`${x},${y}`)?'#':'.').join(''))};
 report.native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(report.native.every(r=>r.match?.quarterTurns===0));
 report.art=api.auditCandidateBlockArt(level);report.coverage=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());report.gateSpans=auditGateSpanLimits(level);
 for(const v of [report.art,report.coverage,report.gateSpans])assert(v.passed,JSON.stringify(v));
 for(const p of new Set(report.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bind(p);
 const omittedHistorical=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const old=api.auditRevisedCandidate(level,undefined);report.hardIssues=old.issues.filter(i=>!omittedHistorical.has(i.code));assert.deepEqual(report.hardIssues,[]);
 report.explicitlyReplacedSourceChecks=old.issues.filter(i=>omittedHistorical.has(i.code));
 report.replay=api.replayRevisedRoute(level,drags);assert(report.replay.valid&&report.replay.complete);assert.equal(report.replay.nonClearingDrags,16);assert.equal(report.replay.clearEvents,12);assert.equal(report.replay.effectiveDrags,28);
 const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();report.steps=[];
 for(const[index,drag]of drags.entries()){
  const before=model.snapshot(),body=model.getBlock(drag.blockId),initial=stateFromSnapshot(c,before),start=[body.x,body.y];assert.equal(body.frozen,0);assert.equal(body.shape.length,3);
  model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());
  const after=model.snapshot(),next=stateFromSnapshot(c,after),cost=before.cleared===after.cleared?1:0;let projected=false;
  forEachGesture(c,initial,(bi,value,edge)=>{if(c.blocks[bi].id!==drag.blockId||edge!==cost)return;const s=initial.slice();s[bi]=value;if(stateKey(s)===stateKey(next)){projected=true;return false;}});assert(projected);
  for(const b of after.blocks)assert.equal(b.frozen,Math.max(0,(level.blocks.find(x=>x.id===b.id).frozen??0)-after.cleared));
  for(const g of after.gates)assert.equal(g.frozen,Math.max(0,(level.gates.find(x=>x.id===g.id).frozen??0)-after.cleared));
  report.steps.push({step:index+1,blockId:drag.blockId,color:body.color,area:3,start,path:drag.path,exitSide:drag.exitSide??null,clearedBefore:before.cleared,clearedAfter:after.cleared,cost,projected,
   remainingBodyIce:after.blocks.filter(b=>b.frozen).map(b=>({id:b.id,frozen:b.frozen})),remainingGateIce:after.gates.filter(g=>g.frozen).map(g=>({color:g.color,frozen:g.frozen}))});
 }
 const tests=spawnSync(process.execPath,['--test','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:4000000});
 report.qualification={exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr};assert.equal(tests.status,0);
 let t=Date.now();report.quotientFloor=checkSymmetryFloor(level,{floor:16,maxStates:1000000,maxMilliseconds:30000});report.quotientFloor.elapsedMs=Date.now()-t;assert(report.quotientFloor.thresholdProven,JSON.stringify(report.quotientFloor));
 console.log(JSON.stringify({candidateFile,phase:'fresh-quotient-floor16',result:report.quotientFloor}));
 t=Date.now();report.rawMaskFloor=checkFastFloor(level,{floor:16,maxStates:1000000,maxMilliseconds:2500});report.rawMaskFloor.elapsedMs=Date.now()-t;
 report.proofArgument='The supported optional-contact/unlimited-time mask graph contains every real unit-step turning drag and preserves all numeric body/gate countdowns. Permutation of identical shape/color/ice bodies and monotone zero-cost removal normalization preserve its optimum. Fresh exhaustion below16 therefore excludes real costs0..15; independent current PuzzleModel gives complete cost16.';
 report.lowerBound=16;report.upperBound=16;report.exactNecessaryRepositions=16;report.multiCellRepositions=16;report.singleCellRepositions=0;
 report.sourceInventoryPairedExact=true;report.scoringChange={authorizedBy:'v1.82.0',before:21,after:28,timeTargetSeconds:86,timeSeconds:120,parMoves:21};
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidateFile,reportFile,status:report.status,levelSha256:report.levelSha256,lower:report.lowerBound,upper:report.upperBound,error:report.error}));
