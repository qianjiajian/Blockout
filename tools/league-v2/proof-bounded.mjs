// Snapshot of qualified daily bounded primitives; league bindings and acceptance live in proof-contract.mjs. Shared daily implementation remains untouched.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {loadRuntime,levelSha256,routeSha256,BANDS,auditStaticCandidate,independentReplay} from '../daily-challenge/formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../daily-challenge/formal-v2/proof-plain.mjs';
import {projectStaticConstraints} from '../daily-challenge/formal-v2/constraint-projection.mjs';
import {projectOpeningOuterBodies} from '../daily-challenge/formal-v2/inventory-projection.mjs';
import {projectFullPhysicalShutters} from '../daily-challenge/formal-v2/shutter-materialization-projection.mjs';
import {canonicalExit,replayScheduledRoute} from '../daily-challenge/formal-v2/proof-scheduled-route.mjs';
import {compileSpatial,NONE} from '../continuation211-colored-witness.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

export const BOUNDED_VERSION='daily-formal-v3-board-budget-1';
export const DEFAULT_BUDGET=Object.freeze({maxStates:10000,maxTransitions:1000000,maxMicroStates:500000,maxDragStates:2000,maxMilliseconds:5000});
const ceilings={maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxDragStates:10000,maxMilliseconds:30000};
export function boundedBudget(input={}){
  const budget={...DEFAULT_BUDGET,...input};
  for(const [key,value]of Object.entries(budget))if(!(key in ceilings)||!Number.isSafeInteger(value)||value<1||value>ceilings[key])throw Error(`Invalid bounded budget ${key}: ${value}`);
  return budget;
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedShape=b=>b.shape.map(([x,y])=>[x-Math.min(...b.shape.map(p=>p[0])),y-Math.min(...b.shape.map(p=>p[1]))]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
const sortJson=values=>values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
/** IDs, names, scores and counts cannot turn an exhausted physical design into
 * a fresh retry. Redesign requires a changed shape inventory AND cell colours.
 * This is a conservative retry guard, not the separate v3 diversity gate. */
export function designFingerprints(level){
  const shapes=sortJson(level.blocks.map(normalizedShape));
  const cells=sortJson(level.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy,b.layers??[b.color]])));
  const partitions=sortJson(level.blocks.map(b=>sortJson(b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]))));
  const board={width:level.width,height:level.height,playable:level.playable,blocked:level.blocked};
  const shapeSha256=levelSha256(shapes),colorSha256=levelSha256(cells);
  return{shapeSha256,colorSha256,colorAssignments:level.blocks.map(b=>({id:b.id,colors:b.layers??[b.color]})),designSha256:levelSha256({board,partitions,cells})};
}
export async function createAttemptLedger(directory){
  await fs.mkdir(directory,{recursive:true});
  return{
    async claim(level,{redesignOf,allowRevalidation=false}={}){
      const fingerprints=designFingerprints(level),id=fingerprints.designSha256;
      if(redesignOf){
        if(!/^[a-f0-9]{64}$/.test(redesignOf))throw Error('Invalid redesign parent fingerprint');
        const parent=JSON.parse(await fs.readFile(path.join(directory,`${redesignOf}.request.json`),'utf8'));
        const outcome=JSON.parse(await fs.readFile(path.join(directory,`${redesignOf}.result.json`),'utf8'));
        if(outcome.accepted)throw Error('Redesign parent is not a failed attempt');
        const priorColors=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
        const shared=fingerprints.colorAssignments.filter(b=>priorColors.has(b.id));
        const changedColors=shared.length?shared.some(b=>priorColors.get(b.id)!==JSON.stringify(b.colors))
          :levelSha256(sortJson(parent.colorAssignments.map(b=>b.colors)))!==levelSha256(sortJson(fingerprints.colorAssignments.map(b=>b.colors)));
        if(parent.shapeSha256===fingerprints.shapeSha256||parent.colorSha256===fingerprints.colorSha256||!changedColors)throw Error('Failed input requires BOTH actual new colours and shape inventory');
      }
      const request={id,levelSha256:levelSha256(level),...fingerprints,redesignOf:redesignOf??null,startedAt:new Date().toISOString()};
      try{await fs.writeFile(path.join(directory,`${id}.request.json`),JSON.stringify(request,null,2)+'\n',{flag:'wx'});}
      catch(error){
        if(error.code!=='EEXIST')throw error;
        const blocked=await fs.stat(path.join(directory,`${id}.blocked.json`)).then(()=>true).catch(()=>false);
        const previous=await fs.readFile(path.join(directory,`${id}.result.json`),'utf8').then(JSON.parse).catch(()=>null);
        if(blocked||!allowRevalidation||previous?.accepted!==true)throw Error('INPUT_ALREADY_ATTEMPTED: no reset, continuation, metadata rename or alternate-solver retry');
        request.revalidates=id;request.id=`${id}-revalidation-${randomUUID()}`;
        request.lockFile=path.join(directory,`${id}.revalidation.lock`);
        await fs.writeFile(request.lockFile,request.id,{flag:'wx'});
        await fs.writeFile(path.join(directory,`${request.id}.request.json`),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
      }
      return request;
    },
    async finish(request,result){
      await fs.writeFile(path.join(directory,`${request.id}.result.json`),JSON.stringify({accepted:result.accepted===true,status:result.status,
        levelSha256:result.levelSha256,lower:result.lowerBound?.result,upper:result.route?.search,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
      if(!result.accepted)await fs.writeFile(path.join(directory,`${request.designSha256}.blocked.json`),JSON.stringify({attemptId:request.id,status:result.status})+'\n',{flag:'wx'});
      if(request.lockFile)await fs.unlink(request.lockFile);
    },
  };
}

/** Import already-attempted failures before another producer starts. This only
 * blocks retry; it cannot import an accepted certificate or mint any bound. */
export async function importFailedAttempt(directory,packet,sourceFile){
  if(!packet?.level||packet.accepted===true||!packet.proof)throw Error('Only concrete prior failed search inputs may be imported');
  if(packet.levelSha256&&packet.levelSha256!==levelSha256(packet.level))throw Error('Historical failed input hash mismatch');
  const p=packet.proof;
  if(!Number.isSafeInteger(p.discoveredStates)||!Number.isSafeInteger(p.exploredStates)||!Number.isSafeInteger(p.attemptedTransitions))throw Error('Missing historical search accounting');
  const ledger=await createAttemptLedger(directory),request=await ledger.claim(packet.level);
  await ledger.finish(request,{accepted:false,status:'HISTORICAL_FAILED_INPUT_DO_NOT_RETRY',levelSha256:levelSha256(packet.level),
    lowerBound:{result:{...p,historicalSourceFile:sourceFile}},route:null});
  return{id:request.id,sourceFile,states:p.discoveredStates,expanded:p.exploredStates,termination:p.termination};
}

/** Qualified optional-exit plain BFS. Full committed boards are the 10000-state
 * unit; the held-body coordinate BFS and every closure scan are separately
 * counted. A stopped task is UNKNOWN even if it had an earlier partial floor.
 * This primitive alone never accepts a candidate or supplies an actual U. */
export function boundedPlainTask(level,api,options){
  const {floor,searchUpper=null,...requested}=options??{},budget=boundedBudget(requested);
  if(!Number.isSafeInteger(floor)||floor<1)throw Error('Positive finite floor required');
  if(searchUpper!==null&&(!Number.isSafeInteger(searchUpper)||searchUpper<floor||searchUpper>256))throw Error('Invalid finite searchUpper');
  const started=Date.now(),inputSha256=levelSha256(level),counts={discoveredStates:0,quotientDiscoveredStates:0,rawFullBoardStates:0,exploredStates:0,attemptedTransitions:0,
    microDiscoveredStates:0,microExploredStates:0,microNeighborChecks:0,exitChecks:0,closureCalls:0,closureRemovals:0,parkingTransitions:0};
  let c,certifiedFloor=0;
  const result=(status,termination,extra={})=>({status,termination,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:inputSha256,
    abstraction:'plain-optional-gesture-monotone-clear-identical-body-quotient-v3',budget,...counts,visitedStates:counts.discoveredStates,certifiedFloor,
    elapsedMilliseconds:Date.now()-started,fullBoardStateDefinition:'distinct complete labeled committed boards, including parking and each closure removal; held-body coordinate microstates excluded',
    quotientStateDefinition:'closure-normalized committed board modulo identical shape-and-color bodies; separately counted, not used to bypass raw cap',
    microStateDefinition:'held-body coordinate BFS; separate from full-board state budget',...extra});
  try{assertPlainProofDomain(level);c=compileSpatial(level,api);}catch(error){return result('unsupported','unsupported',{reason:error.message});}
  const stop=reason=>{const error=Error(reason);error.budgetStop=true;throw error;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const transition=kind=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;if(kind)counts[kind]++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  const rawBoards=new Set();
  const recordRaw=s=>{
    const k=String.fromCharCode(...s);if(rawBoards.has(k))return;
    if(rawBoards.size>=budget.maxStates)stop('max-raw-board-states');
    rawBoards.add(k);counts.rawFullBoardStates=counts.discoveredStates=rawBoards.size;
  };
  const groups=new Map();for(let i=0;i<c.N;i++){const b=c.blocks[i],key=JSON.stringify([b.color,normalizedShape(b)]);groups.set(key,[...(groups.get(key)??[]),i]);}
  const interchangeable=[...groups.values()],key=s=>String.fromCharCode(...interchangeable.flatMap(ids=>ids.map(i=>s[i]).sort((a,b)=>a-b)));
  const overlap=(a,b)=>a.some((word,i)=>(word&b[i])!==0);
  const reachable=(s,i,visit)=>{
    const b=c.blocks[i],occ=Array(c.words).fill(0);
    for(let j=0;j<c.N;j++)if(i!==j&&s[j]!==NONE)for(let w=0;w<c.words;w++)occ[w]|=c.blocks[j].poses[s[j]].mask[w];
    const parents=new Int16Array(c.W*c.H).fill(-1),queue=[s[i]];parents[s[i]]=s[i];micro();
    const drag=(p,exitSide)=>{const points=[];while(p!==s[i]){points.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:points.reverse(),...(exitSide?{exitSide}:{})};};
    for(let at=0;at<queue.length;at++){
      guard();counts.microExploredStates++;const p=queue[at],pose=b.poses[p];
      if(visit(p,pose,side=>drag(p,side))===false)return;
      for(const next of pose.neighbors){transition('microNeighborChecks');if(parents[next]>=0||overlap(b.poses[next].mask,occ))continue;
        if(queue.length>=budget.maxDragStates)stop('max-drag-states');micro();parents[next]=p;queue.push(next);}
    }
  };
  const closure=original=>{
    counts.closureCalls++;const s=original.slice(),drags=[];recordRaw(s);let changed=true;
    while(changed){guard();changed=false;for(let i=0;i<c.N;i++)if(s[i]!==NONE){let exit;
      reachable(s,i,(_p,pose,drag)=>{transition('exitChecks');if(pose.exits[0].length){exit=drag(pose.exits[0][0].side);return false;}});
      if(exit){s[i]=NONE;recordRaw(s);drags.push(exit);counts.closureRemovals++;changed=true;}
    }}return{s,drags};
  };
  const nodes=[],visited=new Map(),complete=s=>s.every(p=>p===NONE);
  const discover=k=>{if(counts.quotientDiscoveredStates>=budget.maxStates)stop('max-quotient-states');counts.quotientDiscoveredStates++;visited.set(k,nodes.length);};
  const routeTo=index=>{const segments=[];while(index>=0){segments.push(nodes[index].drags);index=nodes[index].parent;}return segments.reverse().flat();};
  try{
    const initial=closure(c.initial);discover(key(initial.s));nodes.push({...initial,parent:-1,cost:0});
    if(complete(initial.s))return result('relaxed-shortcut','relaxed-completion',{cost:0,drags:initial.drags});
    let current=[0];const maxDepth=searchUpper??floor-1;
    for(let cost=0;cost<=maxDepth&&current.length;cost++){
      certifiedFloor=cost+1;if(searchUpper===null&&certifiedFloor>=floor)return result('threshold-proven','below-threshold-exhausted');
      const next=[];
      for(const index of current){
        guard();if(counts.exploredStates>=budget.maxStates)stop('max-expanded-states');counts.exploredStates++;
        if(cost>=maxDepth)continue;const state=nodes[index].s;
        for(let i=0;i<c.N;i++)if(state[i]!==NONE){let solution;
          reachable(state,i,(p,_pose,drag)=>{
            if(p===state[i])return;transition('parkingTransitions');
            const moved=state.slice();moved[i]=p;const reduced=closure(moved),k=key(reduced.s);if(visited.has(k))return;
            const id=nodes.length;discover(k);nodes.push({...reduced,parent:index,cost:cost+1,drags:[drag(),...reduced.drags]});
            if(complete(reduced.s)){solution=id;return false;}next.push(id);
          });
          if(solution!==undefined){const cost=nodes[solution].cost;return result(cost<floor?'relaxed-shortcut':'threshold-proven',cost<floor?'relaxed-completion':'below-threshold-exhausted',
            {cost,drags:routeTo(solution),routeTermination:'minimum-relaxed-route-found'});}
        }
      }current=next;
    }
    return result('threshold-proven','below-threshold-exhausted',{routeTermination:searchUpper===null?'not-requested':'search-upper-exhausted'});
  }catch(error){return result(error.budgetStop?'unknown':'invalid',error.message,{thresholdProven:false,reason:error.message});}
}

export function boundedLowerTask(runtime,level,difficulty,budget={}){
  const band=BANDS[difficulty];if(!band)throw Error('Unknown daily difficulty');
  const options=boundedBudget(budget),before=levelSha256(level);runtime.validateLevel(level);
  let projection=null,plain=false;
  try{assertPlainProofDomain(level);plain=true;}catch{}
  if(!plain)for(const project of [()=>projectStaticConstraints(level),()=>projectFullPhysicalShutters(level,runtime),()=>projectOpeningOuterBodies(level,runtime)]){
    try{const p=project();runtime.validateLevel(p.projectedLevel);assertPlainProofDomain(p.projectedLevel);
      if(p.sourceLevelSha256!==before||p.projectedLevelSha256!==levelSha256(p.projectedLevel))throw Error('Projection hash mismatch');projection=p;break;
    }catch{}
  }
  const input=projection?.projectedLevel??level;
  const result=plain||projection?boundedPlainTask(input,runtime,{floor:band.lower,...options}):{status:'unsupported',thresholdProven:false,termination:'no-qualified-plain-projection',budget:options,discoveredStates:0,exploredStates:0,attemptedTransitions:0};
  if(levelSha256(level)!==before)throw Error('Lower task mutated original');
  return{method:projection?`v3-${projection.method}`:'v3-plain',inputLevelSha256:before,projectedLevelSha256:projection?.projectedLevelSha256??null,projection,requiredFloor:band.lower,result};
}

/** Constructive route search, not an optimality proof. It mirrors the qualified
 * original-model first-contact gesture policy but additionally reports every
 * held micro state and enforces both discovered AND expanded board limits. */
export function boundedUpperSearch(runtime,level,requested={}){
  const budget=boundedBudget(requested),started=Date.now(),counts={discoveredStates:0,exploredStates:0,attemptedTransitions:0,microDiscoveredStates:0,microExploredStates:0};
  const out=(status,termination,extra={})=>({status,termination,witnessFound:status==='witness',budget,...counts,visitedStates:counts.discoveredStates,
    elapsedMilliseconds:Date.now()-started,sourceLevelSha256:levelSha256(level),lowerBoundCertified:false,drags:[],...extra});
  if(level.blocks.some(b=>b.timedBombSeconds!==undefined)||level.generators?.some(g=>g.trigger==='time')||level.elevators?.length||level.conveyors?.length)
    return out('unsupported','explicit-timed-route-required');
  const stop=reason=>{const e=Error(reason);e.budgetStop=true;throw e;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const spend=()=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  const stateKey=model=>{const {moves,...snapshot}=model.snapshot();return JSON.stringify(snapshot);};
  const layers=model=>{const s=model.snapshot();return[...s.blocks,...s.queuedBlocks].reduce((n,b)=>n+b.layers.length,0);};
  try{
    runtime.validateLevel(level);const initial=new runtime.PuzzleModel(structuredClone(level));initial.startCountdown();
    const nodes=[{model:initial,parent:-1,depth:0,remaining:layers(initial)}],open=[0],seen=new Set([stateKey(initial)]);counts.discoveredStates=1;
    const routeTo=index=>{const route=[];while(nodes[index].parent>=0){route.push(nodes[index].drag);index=nodes[index].parent;}return route.reverse();};
    const witness=drags=>{const replay=runtime.replayRevisedRoute(level,drags);return replay.valid&&replay.complete?out('witness','witness',{drags,replay}):out('invalid','fresh-replay-rejected',{replay});};
    if(initial.snapshot().complete)return witness([]);
    let found;
    const enqueue=(parent,drag)=>{
      const model=nodes[parent].model.clone();model.beginAction();
      for(const point of drag.path){spend();if(!model.moveBlockStep(drag.blockId,...point))throw Error('Upper gesture replay rejected unit move');}
      if(drag.exitSide){spend();if(!model.tryExit(drag.blockId,drag.exitSide).ok)throw Error('Upper gesture replay rejected exit');}
      if(!model.commitAction())throw Error('Upper gesture had no effective commit');
      const key=stateKey(model);if(seen.has(key))return;
      if(counts.discoveredStates>=budget.maxStates)stop('max-states');seen.add(key);counts.discoveredStates++;
      if(model.snapshot().complete){found=[...routeTo(parent),drag];return;}
      nodes.push({model,parent,drag,depth:nodes[parent].depth+1,remaining:layers(model)});open.push(nodes.length-1);
    };
    while(open.length){
      guard();let best=0;for(let i=1;i<open.length;i++){const a=nodes[open[i]],b=nodes[open[best]];if(a.remaining<b.remaining||a.remaining===b.remaining&&a.depth<b.depth)best=i;}
      const parent=open.splice(best,1)[0],source=nodes[parent].model;
      if(counts.exploredStates>=budget.maxStates)stop('max-expanded-states');counts.exploredStates++;
      for(const selected of source.snapshot().blocks){
        if(!source.isBlockActive(selected))continue;
        const inner=[{model:source,path:[]}],innerSeen=new Set([stateKey(source)]);micro();
        for(let cursor=0;cursor<inner.length;cursor++){
          guard();counts.microExploredStates++;const current=inner[cursor],held=current.model.getBlock(selected.id);if(!held)continue;
          const previous=current.path.length>1?current.path.at(-2):current.path.length?[selected.x,selected.y]:undefined;
          spend();const automatic=canonicalExit(runtime,current.model,selected.id,previous);
          if(automatic){enqueue(parent,{blockId:selected.id,path:current.path,exitSide:automatic});if(found)return witness(found);continue;}
          if(current.path.length)enqueue(parent,{blockId:selected.id,path:current.path});
          for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
            spend();const model=current.model.clone();model.beginAction();const target=[held.x+dx,held.y+dy];if(!model.moveBlockStep(selected.id,...target))continue;
            const key=stateKey(model);if(innerSeen.has(key))continue;
            if(innerSeen.size>=budget.maxDragStates)stop('max-drag-states');micro();innerSeen.add(key);inner.push({model,path:[...current.path,target]});
          }
        }
      }
    }return out('unknown','search-exhausted');
  }catch(error){return out(error.budgetStop?'unknown':'invalid',error.message,{reason:error.message});}
}

