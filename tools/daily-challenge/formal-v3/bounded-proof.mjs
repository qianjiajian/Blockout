import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {loadRuntime,levelSha256,routeSha256,BANDS,auditStaticCandidate,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {projectStaticConstraints} from '../formal-v2/constraint-projection.mjs';
import {projectOpeningOuterBodies} from '../formal-v2/inventory-projection.mjs';
import {projectFullPhysicalShutters} from '../formal-v2/shutter-materialization-projection.mjs';
import {canonicalExit,replayScheduledRoute} from '../formal-v2/proof-scheduled-route.mjs';
import {compileSpatial,NONE} from '../../continuation211-colored-witness.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {assertIceProofDomain,boundedIceTask,ICE_PROOF_VERSION} from './bounded-ice-proof.mjs';
import {assertIcePreservingDomain,projectIcePreservingConstraints,ICE_PRESERVING_LOWER_METHOD} from './ice-preserving-projection.mjs';

export const BOUNDED_VERSION='daily-formal-v3-board-budget-1';
export const DEFAULT_BUDGET=Object.freeze({maxStates:10000,maxTransitions:1000000,maxMicroStates:500000,maxDragStates:2000,maxMilliseconds:5000});
const ceilings={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
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
  const blocked=new Set((level.blocked??[]).map(p=>p.join(',')));
  const legal=(level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]))
    .filter(p=>!blocked.has(p.join(','))).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  const board={width:level.width,height:level.height,...(legal.length===level.width*level.height?{}:{playable:legal})};
  const shapeSha256=levelSha256(shapes),colorSha256=levelSha256(cells);
  return{shapeSha256,colorSha256,colorAssignments:level.blocks.map(b=>({id:b.id,colors:b.layers??[b.color]})),designSha256:levelSha256({board,partitions,cells})};
}
const ledgerMigrations=new Map();
const retryIdentity=record=>levelSha256({shapeSha256:record.shapeSha256,colorSha256:record.colorSha256});
const writeOnce=async(file,value)=>{try{await fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return true;}catch(error){if(error.code==='EEXIST')return false;throw error;}};
/** Preserve old immutable attempts when canonical board encoding changes. The
 * old requests already bind shape inventory and the complete coloured cell
 * multiset, so this conservative alias cannot permit a new retry. It may reject
 * an otherwise new board with identical bodies; changing both shape and colour
 * is required after a failure anyway. No prior request/result is rewritten. */
async function migrateLedgerIdentities(directory){
  const identities=path.join(directory,'identities');await fs.mkdir(identities,{recursive:true});
  const groups=new Map();
  for(const name of await fs.readdir(directory))if(name.endsWith('.request.json')){
    const record=JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));
    if(!/^[a-f0-9]{64}$/.test(record.shapeSha256)||!/^[a-f0-9]{64}$/.test(record.colorSha256))throw Error('Legacy ledger lacks retry identity');
    const identity=retryIdentity(record),origin=record.revalidates??record.id;
    const outcome=await fs.readFile(path.join(directory,`${record.id}.result.json`),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    const rows=groups.get(identity)??[];rows.push({origin,attemptId:record.id,accepted:outcome?.accepted===true,pending:!outcome});groups.set(identity,rows);
  }
  for(const [identity,rows]of groups){
    const preferred=rows.find(row=>!row.accepted&&!row.pending)??rows.find(row=>row.pending)??rows[0];
    await writeOnce(path.join(identities,`${identity}.json`),{origin:preferred.origin,legacyAttemptIds:rows.map(row=>row.attemptId)});
    if(rows.some(row=>!row.accepted&&!row.pending))await writeOnce(path.join(identities,`${identity}.blocked.json`),{reason:'historical-failure',attemptIds:rows.filter(row=>!row.accepted&&!row.pending).map(row=>row.attemptId)});
  }
  return{legacyRequests:[...groups.values()].reduce((n,rows)=>n+rows.length,0),identities:groups.size};
}
export async function createAttemptLedger(directory){
  directory=path.resolve(directory);await fs.mkdir(directory,{recursive:true});
  if(!ledgerMigrations.has(directory))ledgerMigrations.set(directory,migrateLedgerIdentities(directory));
  await ledgerMigrations.get(directory);
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
      const identity=retryIdentity(fingerprints),identityFile=path.join(directory,'identities',`${identity}.json`);
      const firstIdentity=await writeOnce(identityFile,{origin:id});
      const {origin}=JSON.parse(await fs.readFile(identityFile,'utf8'));
      const request={id,levelSha256:levelSha256(level),...fingerprints,retryIdentitySha256:identity,identityOrigin:origin,redesignOf:redesignOf??null,startedAt:new Date().toISOString()};
      try{
        if(!firstIdentity){const error=Error('Existing physical retry identity');error.code='EEXIST';throw error;}
        await fs.writeFile(path.join(directory,`${id}.request.json`),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
      }
      catch(error){
        if(error.code!=='EEXIST')throw error;
        const blocked=await fs.stat(path.join(directory,'identities',`${identity}.blocked.json`)).then(()=>true).catch(()=>false)
          ||await fs.stat(path.join(directory,`${origin}.blocked.json`)).then(()=>true).catch(()=>false);
        const previous=await fs.readFile(path.join(directory,`${origin}.result.json`),'utf8').then(JSON.parse).catch(()=>null);
        if(blocked||!allowRevalidation||previous?.accepted!==true)throw Error('INPUT_ALREADY_ATTEMPTED: no reset, continuation, metadata rename or alternate-solver retry');
        request.revalidates=origin;request.id=`${origin}-revalidation-${randomUUID()}`;
        request.lockFile=path.join(directory,`${origin}.revalidation.lock`);
        await fs.writeFile(request.lockFile,request.id,{flag:'wx'});
        await fs.writeFile(path.join(directory,`${request.id}.request.json`),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
      }
      return request;
    },
    async finish(request,result){
      await fs.writeFile(path.join(directory,`${request.id}.result.json`),JSON.stringify({accepted:result.accepted===true,status:result.status,
        levelSha256:result.levelSha256,lower:result.lowerBound?.result,upper:result.route?.search,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
      if(!result.accepted){
        await writeOnce(path.join(directory,`${request.identityOrigin}.blocked.json`),{attemptId:request.id,status:result.status});
        await writeOnce(path.join(directory,'identities',`${request.retryIdentitySha256}.blocked.json`),{attemptId:request.id,status:result.status});
      }
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
  const ledger=await createAttemptLedger(directory),request=await ledger.claim(packet.level,{allowRevalidation:true});
  await ledger.finish(request,{accepted:false,status:'HISTORICAL_FAILED_INPUT_DO_NOT_RETRY',levelSha256:levelSha256(packet.level),
    lowerBound:{result:{...p,historicalSourceFile:sourceFile}},route:null});
  return{id:request.id,sourceFile,states:p.discoveredStates,expanded:p.exploredStates,termination:p.termination};
}

/** Qualified optional-exit plain BFS. Every distinct labelled committed board
 * actually visited, including parking candidates and all clear intermediates,
 * is charged before closure/quotient pruning. Held coordinates are separate.
 * A stopped task is UNKNOWN even if it had an earlier partial floor.
 * This primitive alone never accepts a candidate or supplies an actual U. */
export function boundedPlainTask(level,api,options){
  const {floor,searchUpper=null,...requested}=options??{},budget=boundedBudget(requested);
  if(!Number.isSafeInteger(floor)||floor<1)throw Error('Positive finite floor required');
  if(searchUpper!==null&&(!Number.isSafeInteger(searchUpper)||searchUpper<floor||searchUpper>256))throw Error('Invalid finite searchUpper');
  const started=Date.now(),inputSha256=levelSha256(level),counts={discoveredStates:0,exploredStates:0,
    rawFullBoardStates:0,rawExploredStates:0,quotientDiscoveredStates:0,quotientExploredStates:0,rawBoardExpansionVisits:0,attemptedTransitions:0,
    microDiscoveredStates:0,microExploredStates:0,microNeighborChecks:0,exitChecks:0,closureCalls:0,closureRemovals:0,parkingTransitions:0};
  let c,certifiedFloor=0;
  const result=(status,termination,extra={})=>({status,termination,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:inputSha256,
    abstraction:'plain-optional-gesture-monotone-clear-identical-body-quotient-v3',budget,...counts,visitedStates:counts.discoveredStates,certifiedFloor,
    elapsedMilliseconds:Date.now()-started,fullBoardStateDefinition:'distinct labelled complete committed boards including initial, every parking candidate and each closure removal',
    quotientStateDefinition:'closure-normalized board modulo identical shape-and-color bodies; diagnostic only, never substitutes for the raw budget',
    microStateDefinition:'held-body coordinate BFS; separate from full-board state budget',...extra});
  try{assertPlainProofDomain(level);c=compileSpatial(level,api);}catch(error){return result('unsupported','unsupported',{reason:error.message});}
  const stop=reason=>{const error=Error(reason);error.budgetStop=true;throw error;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const transition=kind=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;if(kind)counts[kind]++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  const rawBoards=new Set(),rawExpanded=new Set(),rawKey=s=>String.fromCharCode(...s);
  const recordRaw=s=>{
    guard();const k=rawKey(s);if(rawBoards.has(k))return k;
    if(rawBoards.size>=budget.maxStates)stop('max-raw-board-states');rawBoards.add(k);
    counts.discoveredStates=counts.rawFullBoardStates=rawBoards.size;return k;
  };
  const expandRaw=s=>{
    const k=recordRaw(s);counts.rawBoardExpansionVisits++;
    if(rawExpanded.has(k))return;
    if(rawExpanded.size>=budget.maxStates)stop('max-raw-expanded-states');rawExpanded.add(k);
    counts.exploredStates=counts.rawExploredStates=rawExpanded.size;
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
      expandRaw(s);
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
        guard();expandRaw(nodes[index].s);counts.quotientExploredStates++;
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

/** Decide the qualified domain before claiming a physical input. No search
 * strategy is selected in response to a failed or exhausted earlier search. */
export function selectBoundedStrategy(level,{providedRoute=false,routeStrategy='auto'}={}){
  if(!['auto','plain-minimum','ice-minimum','native'].includes(routeStrategy))throw Error('Unknown bounded route strategy');
  let plain=false,ice=false,iceProjection=false;
  try{assertPlainProofDomain(level);plain=true;}catch{}
  try{assertIceProofDomain(level);ice=true;}catch{}
  const hasIce=[...(level.blocks??[]),...(level.gates??[]),...(level.flipDoors??[])].some(x=>(x.frozen??0)>0);
  if(hasIce)try{assertIcePreservingDomain(level);iceProjection=true;}catch{}
  const iceMechanisms=ice&&hasIce;
  if(routeStrategy==='plain-minimum'&&!plain)throw Error('plain-minimum requires qualified plain domain');
  if(routeStrategy==='ice-minimum'&&!ice)throw Error('ice-minimum requires qualified static single-layer ice domain');
  return {route:providedRoute?'provided':routeStrategy==='plain-minimum'?'plain-joint':routeStrategy==='ice-minimum'?'ice-joint'
    :routeStrategy==='native'?'native':iceMechanisms?'ice-joint':plain?'plain-joint':'native',
    lower:iceMechanisms||routeStrategy==='ice-minimum'?'ice-native':iceProjection?'ice-preserving':plain?'plain':'projected-plain'};
}

export function boundedLowerTask(runtime,level,difficulty,budget={}){
  const band=BANDS[difficulty];if(!band)throw Error('Unknown daily difficulty');
  const options=boundedBudget(budget),before=levelSha256(level);runtime.validateLevel(level);
  const lowerStrategy=selectBoundedStrategy(level).lower;
  if(lowerStrategy==='ice-native'){
    const result=boundedIceTask(level,runtime,{floor:band.lower,...options});
    if(levelSha256(level)!==before)throw Error('Native ice lower mutated original');
    return{method:'v3-native-static-ice',inputLevelSha256:before,projectedLevelSha256:null,projection:null,requiredFloor:band.lower,result};
  }
  if(lowerStrategy==='ice-preserving'){
    const projection=projectIcePreservingConstraints(level,runtime),result=boundedIceTask(projection.projectedLevel,runtime,{floor:band.lower,...options});
    if(levelSha256(level)!==before)throw Error('Ice-preserving lower mutated original');
    return{method:ICE_PRESERVING_LOWER_METHOD,inputLevelSha256:before,projectedLevelSha256:projection.projectedLevelSha256,
      projection,requiredFloor:band.lower,result};
  }
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
    rawFullBoardStates:counts.discoveredStates,rawExploredStates:counts.exploredStates,
    fullBoardStateDefinition:'distinct labelled complete committed PuzzleModel snapshots except move score; no quotient or clear closure',
    elapsedMilliseconds:Date.now()-started,sourceLevelSha256:levelSha256(level),lowerBoundCertified:false,drags:[],...extra});
  // A unit held step can immediately reveal a lift or dispense a move-fed
  // queue head. Those are whole-world changes, not exempt coordinate BFS.
  // Until this constructive search accounts for them in its board budget,
  // require a provided route; the separate fresh replay/lower path remains.
  if(level.generators?.length||level.shutters?.some(s=>s.skin==='lift')||level.elevators?.length||level.conveyors?.length)
    return out('unsupported','held-world-mutation-requires-provided-route');
  if(level.blocks.some(b=>b.timedBombSeconds!==undefined))return out('unsupported','explicit-timed-route-required');
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

export async function loadBoundedRuntime(){
  const runtime=await loadRuntime(),lock=verifyRulesLock();if(!lock.ok||!['1.154.0','1.155.0'].includes(lock.activeVersion))throw Error('Reviewed rules inheriting daily v1.154 required');
  const own='tools/daily-challenge/formal-v3/bounded-proof.mjs',ice='tools/daily-challenge/formal-v3/bounded-ice-proof.mjs',projection='tools/daily-challenge/formal-v3/ice-preserving-projection.mjs';
  const bindings={...runtime.toolchainBindings,[own]:sha(await fs.readFile(fileURLToPath(import.meta.url))),[ice]:sha(await fs.readFile(ice)),[projection]:sha(await fs.readFile(projection))};
  const manifest=JSON.parse(await fs.readFile('docs/rules/manifest.json','utf8'));
  return{...runtime,toolchainBindings:bindings,toolchainSha256:levelSha256(bindings),
    iceProofVersion:ICE_PROOF_VERSION,iceBindings:bindings,iceProofSha256:levelSha256(bindings),boundedRuleVersion:lock.activeVersion,
    dailyBudgetRuleVersion:'1.154.0',boundedRuleSha256:manifest.versions.find(v=>v.version===lock.activeVersion).sha256,
    dailyBudgetRuleSha256:manifest.versions.find(v=>v.version==='1.154.0').sha256};
}

/** One first-attempt, ice-preserving joint exploration for a freshly authored
 * input. This is a math pool record, not static/design/slot acceptance. The
 * domain and budget are fixed before the shared ledger claim. An UNKNOWN or
 * invalid actual route is finished as failed; there is no second strategy.
 */
export async function exploreBoundedIceCandidate(runtime,candidate,{floor=16,searchUpper=64,budget={},
  ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts',redesignOf}={}){
  if(runtime.iceProofVersion!==ICE_PROOF_VERSION)throw Error('Use loadBoundedRuntime');
  const options=boundedBudget(budget),level=structuredClone(candidate.level);
  assertIceProofDomain(level);runtime.validateLevel(level);
  if(!Number.isSafeInteger(floor)||floor<1||!Number.isSafeInteger(searchUpper)||searchUpper<floor||searchUpper>256)throw Error('Invalid finite joint ice target');
  const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf});
  const report={schemaVersion:3,contractVersion:BOUNDED_VERSION,exploratory:true,accepted:false,formalReady:false,
    designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,
    sourceLevelId:candidate.sourceLevelId,level,levelSha256:levelSha256(level),attempt,solverStrategy:{route:'ice-joint',lower:'ice-native'},
    toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,ruleVersion:runtime.boundedRuleVersion,
    ruleSha256:runtime.boundedRuleSha256,dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
    floor,searchUpper,status:'UNKNOWN_ICE_JOINT',L:null,U:null,difficulty:null};
  try{
    const search=boundedIceTask(level,runtime,{floor,searchUpper,...options});report.proof=search;
    if(!['threshold-proven','relaxed-shortcut'].includes(search.status)||!Number.isSafeInteger(search.cost)||!Array.isArray(search.drags))return report;
    report.drags=structuredClone(search.drags);report.routeSha256=routeSha256(report.drags);
    const canonical=runtime.replayRevisedRoute(level,report.drags),independent=independentReplay(runtime,level,report.drags);
    report.replay=canonical;report.independentReplay=independent;
    if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||independent.failed
      ||independent.remainingBodies!==0||independent.remainingQueued!==0||canonical.nonClearingDrags!==search.cost||independent.nonClearingDrags!==search.cost
      ||canonical.effectiveDrags!==report.drags.length||independent.effectiveDrags!==report.drags.length
      ||canonical.clearEvents!==level.blocks.length||independent.clearEvents!==level.blocks.length){report.status='REJECTED_ORIGINAL_ROUTE';return report;}
    report.L=report.U=search.cost;report.difficulty=search.cost<16?null:search.cost<=20?1:search.cost<=30?2:3;
    if(!search.thresholdProven||search.cost<floor){report.status='COUNTEREXAMPLE_BELOW_FLOOR';return report;}
    report.accepted=true;report.status='ICE_EXPLORATORY_LU_VERIFIED';return report;
  }catch(error){report.status='INVALID_ICE_ATTEMPT';report.reason=error.message;return report;}
  finally{
    if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='REJECTED_INPUT_MUTATION';}
    report.redesignRequired=!report.accepted;await ledger.finish(attempt,report);
  }
}

export async function verifyBoundedCandidate(runtime,candidate,{ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts',routeBudget={},lowerBudget={},redesignOf,
  allowRevalidation=false,routeStrategy='auto',searchUpper=128}={}){
  if(runtime.dailyBudgetRuleVersion!=='1.154.0')throw Error('Use loadBoundedRuntime for v3 qualification');
  const upperOptions=boundedBudget(routeBudget),lowerOptions=boundedBudget(lowerBudget),level=structuredClone(candidate.level),band=BANDS[candidate.difficulty];
  if(!band)throw Error('Unknown daily difficulty');
  const solverStrategy=selectBoundedStrategy(level,{providedRoute:Array.isArray(candidate.drags),routeStrategy});
  if(!Number.isSafeInteger(searchUpper)||searchUpper<band.lower||searchUpper>256)throw Error('Finite route searchUpper must be between the band floor and 256');
  const ledger=await createAttemptLedger(ledgerDirectory);let attempt;
  const report={schemaVersion:3,contractVersion:BOUNDED_VERSION,ruleVersion:runtime.boundedRuleVersion,formalId:candidate.formalId,stageKey:candidate.stageKey,
    ruleSha256:runtime.boundedRuleSha256,dailyBudgetRuleVersion:runtime.dailyBudgetRuleVersion,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
    sourceLevelId:candidate.sourceLevelId,difficulty:candidate.difficulty,level,levelSha256:levelSha256(level),band,
    accepted:false,formalReady:false,designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false,
    status:'BLOCKED_STATIC',solverStrategy,toolchainBindings:runtime.toolchainBindings,toolchainSha256:runtime.toolchainSha256,L:null,U:null,reasons:[]};
  try{
    report.staticAudit=await auditStaticCandidate(runtime,{...candidate,level});report.sourceLevelSha256=report.staticAudit.sourceLevelSha256;
    if(!report.staticAudit.passed){report.reasons=report.staticAudit.issues;return report;}
    if(!report.staticAudit.support.supported){report.status='UNSUPPORTED_ROUTE_DOMAIN';report.reasons=report.staticAudit.support.reasons;return report;}
    attempt=await ledger.claim(level,{redesignOf,allowRevalidation});report.attempt=attempt;
    let drags=candidate.drags,search=null;
    if(!drags){
      if(['plain-joint','ice-joint'].includes(solverStrategy.route)){
        const jointBudget=Object.fromEntries(Object.keys(lowerOptions).map(k=>[k,Math.min(lowerOptions[k],upperOptions[k])]));
        const ice=solverStrategy.route==='ice-joint';
        search=(ice?boundedIceTask:boundedPlainTask)(level,runtime,{floor:band.lower,searchUpper:band.upper??searchUpper,...jointBudget});
        report.lowerBound={method:ice?'v3-native-static-ice-joint-search':'v3-plain-joint-search',inputLevelSha256:report.levelSha256,projectedLevelSha256:null,projection:null,requiredFloor:band.lower,result:search};
        if(!search.drags||!['threshold-proven','relaxed-shortcut'].includes(search.status)){report.status='UNKNOWN_UPPER';report.route={search};return report;}
      }else{search=boundedUpperSearch(runtime,level,upperOptions);if(!search.witnessFound){report.status='UNKNOWN_UPPER';report.route={search};return report;}}
      drags=search.drags;
    }
    report.drags=structuredClone(drags);report.routeSha256=routeSha256(drags);
    if(candidate.routeSha256!==undefined&&candidate.routeSha256!==report.routeSha256)throw Error('Declared route hash mismatch');
    if(candidate.levelSha256!==undefined&&candidate.levelSha256!==report.levelSha256)throw Error('Declared level hash mismatch');
    const canonical=candidate.timeSchedule?replayScheduledRoute(runtime,level,drags,candidate.timeSchedule):runtime.replayRevisedRoute(level,drags);
    const independent=independentReplay(runtime,level,drags,{timeSchedule:candidate.timeSchedule});
    report.route={search,inputLevelSha256:report.levelSha256,routeSha256:report.routeSha256,canonicalReplay:canonical,independentReplay:independent,
      witnessValidation:{searchPerformed:!!search,providedRoute:!search,fullBoardSearchStates:search?.discoveredStates??0,unitSteps:drags.reduce((n,d)=>n+d.path.length,0),drags:drags.length}};
    if(candidate.timeSchedule){report.timeSchedule=structuredClone(candidate.timeSchedule);report.timeScheduleSha256=levelSha256(candidate.timeSchedule);}
    if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||independent.failed
      ||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.effectiveDrags!==independent.effectiveDrags||canonical.clearEvents!==independent.clearEvents){report.status='REJECTED_ORIGINAL_ROUTE';return report;}
    report.U=independent.nonClearingDrags;
    if(report.U<band.lower){report.status='COUNTEREXAMPLE_BELOW_BAND';return report;}
    if(band.upper!==null&&report.U>band.upper){report.status='UNKNOWN_UPPER_WITHIN_BAND';return report;}
    report.lowerBound??=boundedLowerTask(runtime,level,candidate.difficulty,lowerOptions);
    const proof=report.lowerBound.result;
    if(proof.status!=='threshold-proven'||proof.thresholdProven!==true||proof.floor!==band.lower||proof.termination!=='below-threshold-exhausted'){
      report.status=proof.status==='unsupported'?'UNSUPPORTED_LOWER':'UNKNOWN_LOWER';return report;
    }
    report.L=band.lower;report.accepted=true;report.status='BOUNDED_SPATIAL_VERIFIED_AWAITING_V3_DESIGN_AND_POINTER';return report;
  }catch(error){report.status='INVALID_ATTEMPT';report.reasons.push(error.message);return report;}
  finally{
    if(levelSha256(level)!==report.levelSha256){report.accepted=false;report.status='REJECTED_INPUT_MUTATION';}
    report.redesignRequired=!!attempt&&!report.accepted;if(attempt)await ledger.finish(attempt,report);
  }
}
