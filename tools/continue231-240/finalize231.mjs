import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ROOT, loadApi, audit, replay, digest, ruleGate, writeNew } from './common.mjs';
import { compileSpatial, each, assertStateMatches } from '../continuation211-colored-witness.mjs';

ruleGate();
const { api, inputs } = await loadApi();
const input=ROOT+'/author231/run-4000-1792395600871/report.json';
const raw=JSON.parse(fs.readFileSync(input)).accepted;
assert(raw.proof.thresholdProven&&raw.proof.floor===5);
assert.equal(digest(raw.level),raw.proof.sourceLevelSha256);
const level=structuredClone(raw.level);
level.preservedMoveTarget=raw.drags.length;
level.mechanismAdaptation.change='源7×10腰部缺口改为四角切口原创对称轮廓，66格。保留红普通门与蓝6/青4/绿12/紫14/黄16五冰门、2黄彩格。v1.11彩格优先：撤去4壳属性，保28个本体库存；蓝T4改同面积SQ2，其余非原向L形改q0 L3。原两空彩格的面积补1个V2，合29体；普通体形色配对重新分配，六色外色总量保留并增加1个黄色体。左侧红门清除、青色停车和4/6门解冻构成原创顺序，普通形色配对及全部位置重排，非逐块来源复刻。三星采用当前完整39拖，非最优拖数。';
const gameplay=l=>Object.fromEntries(['width','height','playable','blocks','gates','coloredGrids','mechanismRules'].map(k=>[k,l[k]]));
assert.deepEqual(gameplay(level),gameplay(raw.level),'Scoring/description update must leave every rule and pose unchanged');
const c=compileSpatial(level,api);
const staticAudit=audit(level,api),route=replay(level,raw.drags,api,{complete:true,timed:true,requirePointerCompatible:true});
assert.equal(route.nonClearingDrags,10);assert.equal(route.effectiveDrags,39);
const encode=snapshot=>Uint16Array.from(level.blocks.map(b=>{
  const now=snapshot.blocks.find(a=>a.id===b.id);return now?now.y*level.width+now.x:65535;
}));
const stateKey=s=>JSON.stringify([...s]);
const model=new api.PuzzleModel(level);model.startCountdown();
const routeModels=[model.clone()];
const gridConstraints=[];
for(const [index,d]of raw.drags.entries()){
  model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));
  if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
  const snap=model.snapshot();assertStateMatches(c,encode(snap),snap);routeModels.push(model.clone());
  // Check an actual reachable world for a rejection caused specifically by a
  // wrong-colour floor cell, with occupancy and geometry independently clear.
  const occupied=new Map(snap.blocks.flatMap(b=>b.shape.map(([x,y])=>[[x+b.x,y+b.y].join(','),b.id])));
  const legal=new Set(level.playable.map(p=>p.join(',')));
  for(const b of snap.blocks)for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){
    const x=b.x+dx,y=b.y+dy,cells=b.shape.map(([a,z])=>[a+x,z+y]);
    if(!cells.every(p=>legal.has(p.join(','))&&(!occupied.has(p.join(','))||occupied.get(p.join(','))===b.id)))continue;
    if(!cells.some(p=>level.coloredGrids.some(g=>g.color!==b.color&&g.cells.some(q=>p[0]===q[0]&&p[1]===q[1]))))continue;
    const trial=model.clone();trial.beginAction();assert.equal(trial.moveBlockStep(b.id,x,y),false);
    if(gridConstraints.length<12)gridConstraints.push({afterDrag:index+1,blockId:b.id,color:b.color,to:[x,y],cells,reason:'foreign-colored-floor-only'});
  }
}
assert(gridConstraints.length>0,'Colored floors must participate in reachable spatial decisions');

// Independent current-PuzzleModel outgoing gestures. Unlike the proof, this
// enumerator does not consult cached poses, exit tables or normalization.
function realEdges(m){
  const result=new Set(),snapshot=m.snapshot();
  for(const b of snapshot.blocks){if(!m.isBlockActive(b))continue;
    const paths=[[]],seen=new Set([[b.x,b.y].join(',')]);
    for(let i=0;i<paths.length;i++){
      const path=paths[i],start=()=>{const clone=m.clone();clone.beginAction();for(const p of path)assert(clone.moveBlockStep(b.id,...p));return clone;},held=start();
      const now=held.getBlock(b.id);
      if(path.length){const end=start();assert(end.commitAction());result.add('1:'+stateKey(encode(end.snapshot())));}
      for(const side of ['left','right','top','bottom']){const end=start();if(end.tryExit(b.id,side).ok){assert(end.commitAction());result.add('0:'+stateKey(encode(end.snapshot())));}}
      for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const p=[now.x+dx,now.y+dy],key=p.join(',');if(seen.has(key))continue;const next=start();if(next.moveBlockStep(b.id,...p)){seen.add(key);paths.push([...path,p]);}}
    }
  }return result;
}
const samples=[...Array.from({length:12},(_,i)=>i),15,20,25,30,35,38];
const checks=[];
for(const index of samples){
  const m=routeModels[index],s=encode(m.snapshot()),actual=realEdges(m),relaxed=new Set();
  each(c,s,(next,cost)=>relaxed.add(cost+':'+stateKey(next)),{optionalExit:true});
  for(const edge of actual)assert(relaxed.has(edge),`Model successor missing in lower graph at ${index}`);
  checks.push({routeState:index,realEdges:actual.size,lowerEdges:relaxed.size,actualSubsetOfLower:true});
}
const modelFiles=[...inputs,'tools/continuation211-colored-proof.mjs','tools/continuation211-colored-witness.mjs',
  'tools/remake191-200/root200/domain.mjs','tools/continue231-240/finalize231.mjs'];
const codeSha256=Object.fromEntries([...new Set(modelFiles)].map(p=>[p,digest(fs.readFileSync(p))]));
const sourceLedger=ROOT+'/author231/source-block-transcription.json';
const packet={status:'HEADLESS_QUALIFIED_PENDING_DUAL_POINTER',activeRule:'1.198.0',level,levelSha256:digest(level),
  drags:raw.drags,routeSha256:digest(raw.drags),L:5,U:10,starMoves:39,starTime:api.levelStarTargets(level).timeTargetSeconds,
  sourceLedger,sourceLedgerSha256:digest(fs.readFileSync(sourceLedger)),sourceFrame:ROOT+'/source/frame-10.png',
  sourceFrameSha256:digest(fs.readFileSync(ROOT+'/source/frame-10.png')),staticAudit,replay:route,
  lower:{...raw.proof,sourceLevelSha256:digest(level)},lowerBinding:{input,inputSha256:digest(fs.readFileSync(input)),originalLevelSha256:digest(raw.level),
    gameplayDeepEqual:true,scoringOnlyRebind:true,proofWasNotRerun:true,
    normalizationReason:'No shells, flips, keys, generators, lifts or timers. Full body removal only frees cells and advances ice gates; static coloured cells are unchanged. Removing an available body early cannot raise minimum parking cost. Optional contact and optimistic exits only add edges; identity quotient includes every non-pose property.'},
  qualification:{status:'PASS_MODEL_EDGE_INCLUSION_SAMPLES',checks,codeSha256,completeRouteStateAgreement:true,
    fullGraphExhaustionClaimed:false,realEdgeCount:checks.reduce((n,r)=>n+r.realEdges,0)},
  mechanismReview:{decision:'先清红门开放两排，再把青色单格和蓝色H2停入空位，依次解开4、6及后续冰门；黄色彩格限制异色借道。',gridConstraints},
  pointerValidated:false,formalAdopted:false,releaseApproved:false};
const output=ROOT+'/author231/qualified231.json';writeNew(output,packet);
console.log(JSON.stringify({output,L:5,U:10,drags:39,levelSha256:packet.levelSha256,qualificationEdges:packet.qualification.realEdgeCount}));
