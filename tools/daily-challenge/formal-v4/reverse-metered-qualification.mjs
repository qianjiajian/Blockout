import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {independentReplay,levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath} from '../formal-v3/reverse-route-audit.mjs';
import {runReverseInterleavedGraph} from '../formal-v3/design-reverse-interleaved.mjs';
import {createReverseReservationMeter,quoteReverseWorldCreation,quoteReverseForwardDrag,quoteReverseInverseEdge,quoteReverseCompleteWitness} from './reverse-construction-reservations.mjs';

export const REVERSE_METERED_SCOPE='qualification-only-plain-static-native-rectangle-reverse';
const CORE='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],key=p=>p.join(','),copy=structuredClone;
const integer=(v,min=0)=>assert(Number.isSafeInteger(v)&&v>=min,'Invalid finite coordinate reservation');
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
const bodyKey=blocks=>levelSha256(blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color,layers:b.layers??[b.color]})).sort((a,b)=>a.id.localeCompare(b.id)));
const inventoryKey=blocks=>levelSha256(blocks.map(({x,y,...b})=>b).sort((a,b)=>a.id.localeCompare(b.id)));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}
function playable(level){const blocked=new Set((level.blocked??[]).map(key));return new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).map(key).filter(k=>!blocked.has(k)));}
function atGate(b,g,l){
 const horizontal=['top','bottom'].includes(g.side),offset=horizontal?b.x:b.y,span=horizontal?width(b):height(b);
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+height(b)===l.height:g.side==='left'?b.x===0:b.x+width(b)===l.width);
}

/** MODEL QUALIFICATION ONLY. This file has no ledger, actual source reader,
 * candidate admission, lower solver, recolouring search, or campaign entry.
 * All public world inputs must have been materialized by this same session.
 * The original c9ea meter stays unchanged; coordinate-only work is a disjoint
 * subaccount, added before EVERY common-budget admission, never reset/refunded.
 */
export function createReverseModelQualification(runtime,{qualificationOnly=false,limits={},now=Date.now,onFormedWorld}={}){
 assert.equal(qualificationOnly,true,'No production entry is qualified');assert.equal(runtime.toolchainSha256,CORE);
 assert.equal(typeof onFormedWorld,'function','An explicit synchronous history/formed-world hook is required');
 const base=createReverseReservationMeter({qualificationOnly:true,limits,now}),known=new WeakMap(),assets={},formed=[],coordinateReservations=[];
 const work={transitions:0,micro:0};let terminal=null,closed=false,dualReplayStarted=false,activeQuote=null;
 const counters={localAudits:0,canonicalReplays:0,independentReplays:0,heldSearches:0,heldPositions:0,heldDirections:0,graphVisits:0};
 const fail=reason=>{terminal??=reason;throw Error(terminal);};
 function guard(){if(terminal)throw Error(terminal);if(closed)throw Error('qualification-session-closed');try{base.guard();}catch(e){terminal=e.message;throw e;}}
 function room(q){
  guard();const r=base.report();
  if(r.reserved.worlds+(q.worlds??0)>r.budget.maxStates)fail('qualification-worlds-exhausted');
  if(r.reserved.transitions+work.transitions+(q.transitions??0)>r.budget.maxTransitions)fail('qualification-transitions-exhausted');
  if(r.reserved.micro+work.micro+(q.micro??0)>r.budget.maxMicroStates)fail('qualification-micro-exhausted');
 }
 function run(q,fn){room(q);activeQuote=q;try{return base.runSync(q,fn);}catch(e){terminal??=e.message;throw e;}finally{activeQuote=null;}}
 function coordinateWork(transitions,micro,label){
  integer(transitions);integer(micro);room({transitions,micro});work.transitions+=transitions;work.micro+=micro;
  coordinateReservations.push({label,transitions,micro});
 }
 function native(block){
  assert(block&&Object.keys(block).every(k=>['id','x','y','shape','color','frozen','layers'].includes(k)),'Plain body metadata required');
  assert(block.frozen===undefined||block.frozen===0,'Plain body ice is excluded');
  assert(!block.layers||(block.layers.length===1&&block.layers[0]===block.color),'Plain body layers are excluded');
  assert(Array.isArray(block.shape)&&block.shape.length&&block.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),'Finite body shape required');
  assert(Math.min(...block.shape.map(p=>p[0]))===0&&Math.min(...block.shape.map(p=>p[1]))===0,'Normalized q0 anchor required');
  assert(block.shape.length===width(block)*height(block),'Only solid native rectangles are qualified');
  const match=runtime.matchFormalBlockShape(block.shape,'native-only');assert(match?.quarterTurns===0,'q0 native shape required');
  const asset=runtime.GAME_ART.gameplay.formalBlocks[block.color]?.solid?.[match.shapeId];assert(asset,'Actual native colour artwork required');
  const file=path.resolve('public',asset);assets[file]??=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 }
 function inspect(level){
  assertPlainProofDomain(level);runtime.validateLevel(level);assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length,'One ordinary gate per colour');
  level.blocks.forEach(native);const allowed=playable(level),occupied=new Set();
  for(const b of level.blocks)for(const p of cells(b)){assert(allowed.has(key(p))&&!occupied.has(key(p)),'World overlap/outside mask');occupied.add(key(p));}
  return{full:occupied.size===allowed.size,area:allowed.size};
 }
 function record(level,label){
  assert(activeQuote,'World creation must occur inside an admitted reservation');const info=inspect(level),sha=levelSha256(level);
  // This callback sees the complete physical object BEFORE a fresh model or
  // forward replay. It must throw/return false for a blocked identity. The
  // qualification hook is not an implementation of real shared ledger I/O.
  const accepted=onFormedWorld(level,{label,levelSha256:sha,full:info.full,reservedWorlds:base.report().reserved.worlds});
  assert.equal(accepted,true,'History hook must explicitly accept every formed world');assert.equal(levelSha256(level),sha,'History hook mutated input');
  freeze(level);known.set(level,sha);formed.push({label,levelSha256:sha,full:info.full});guard();return level;
 }
 function owned(level){assert(known.has(level),'Graph/model received an unreserved world');assert.equal(levelSha256(level),known.get(level),'Reserved world changed');guard();}
 function materialize(label,builder){assert.equal(typeof builder,'function');return run(quoteReverseWorldCreation(label),()=>record(builder(),label));}

 // Narrow copy of auditPlainForwardDrag. Only local clock guards and the
 // external pre-reservation were added. Its model/first-contact semantics,
 // inventory comparison and one-commit checks remain the original ones.
 function forwardBody(level,drag,expectedBodies){
  const result={valid:false,searchPerformed:false,lowerBoundClaimed:false,naturalTimeValidated:false};counters.localAudits++;
  try{
   assertPlainProofDomain(level);runtime.validateLevel(level);guard();
   assert(drag&&Object.keys(drag).every(k=>['blockId','path','exitSide'].includes(k))&&Array.isArray(drag.path),'Invalid drag');
   const model=new runtime.PuzzleModel(copy(level));model.startCountdown();assert(model.getBlock(drag.blockId),'Missing selected body');
   const before=model.snapshot();model.beginAction();let automatic=canonicalExit(runtime,model,drag.blockId);
   assert(!automatic||drag.path.length===0,'Pointer-down exit prevents any parking/path');
   for(const[index,point]of drag.path.entries()){
    guard();const held=model.getBlock(drag.blockId),previous=[held.x,held.y];
    assert(Array.isArray(point)&&point.length===2&&point.every(Number.isSafeInteger)&&Math.abs(point[0]-held.x)+Math.abs(point[1]-held.y)===1,'Path must contain every unit step');
    assert(model.moveBlockStep(drag.blockId,...point),'Actual model rejected held step');automatic=canonicalExit(runtime,model,drag.blockId,previous);
    assert(!automatic||index===drag.path.length-1,'First-contact exit precedes end of held path');
   }
   guard();assert(automatic===drag.exitSide,'Canonical exit differs from declared clear/parking');
   if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok,'Actual model rejected exit');assert(model.commitAction(),'No effective gesture');
   const after=model.snapshot(),clears=after.cleared-before.cleared;
   assert(after.moves===before.moves+1&&clears===Number(!!drag.exitSide),'One held gesture must have one commit and its exact clear cost');
   if(expectedBodies)assert.equal(bodyKey(after.blocks),bodyKey(expectedBodies),'Inverse failed to restore all original body identities/shapes/colours/positions');
   return{...result,valid:true,clearEvents:clears,nonClearingDrags:Number(clears===0),effectiveDrags:1,beforeBodiesSha256:bodyKey(before.blocks),afterBodiesSha256:bodyKey(after.blocks),remainingBodies:after.blocks.length,complete:after.complete,drag:copy(drag)};
  }catch(error){if(terminal||base.report().terminal)throw error;return{...result,error:error.message};}
 }
 function forward(level,drag,{expectedBodies}={}){owned(level);return run(quoteReverseForwardDrag(drag),()=>forwardBody(level,drag,expectedBodies));}
 function parking(before,blockId,reversePath){
  owned(before);const body=before.blocks.find(b=>b.id===blockId);assert(body,'Unknown reverse moving body');assert(reversePath.length>0,'Reverse parking must move');
  const drag={blockId,path:inverseUnitPath([body.x,body.y],reversePath)};
  return run(quoteReverseInverseEdge('parking',drag),()=>{
   const after=copy(before);Object.assign(after.blocks.find(b=>b.id===blockId),{x:reversePath.at(-1)[0],y:reversePath.at(-1)[1]});record(after,'inverse-parking-endpoint');
   return{...forwardBody(after,drag,before.blocks),reverseAfterLevel:after,forwardDrag:drag};
  });
 }
 function insertion(before,body,reversePath,exitSide){
  owned(before);assert(!before.blocks.some(b=>b.id===body.id),'Insertion reused a live body ID');
  const drag={blockId:body.id,path:inverseUnitPath([body.x,body.y],reversePath),exitSide},end=reversePath.at(-1)??[body.x,body.y];
  return run(quoteReverseInverseEdge('insertion',drag),()=>{
   const after={...copy(before),blocks:[...copy(before.blocks),{...copy(body),x:end[0],y:end[1]}]};record(after,'inverse-insertion-endpoint');
   return{...forwardBody(after,drag,before.blocks),reverseAfterLevel:after,forwardDrag:drag};
  });
 }

 // Pure held-coordinate reach, narrowly extracted from the old factory.
 // The whole finite anchor box is reserved before any queue/parent creation.
 // No per-pose LevelSpec/PuzzleModel is created. Portal scans are separate.
 function heldReach(level,body,start){
  owned(level);native(body);const live=level.blocks.find(b=>b.id===body.id);
  if(live)assert.equal(bodyKey([live]),bodyKey([body]),'Held atom differs from its live identity');
  const n=(level.width-width(body)+1)*(level.height-height(body)+1);integer(n,1);
  coordinateWork(4*n,n,'held-anchor-box');counters.heldSearches++;
  const allowed=playable(level),occupied=new Set(level.blocks.filter(b=>b.id!==body.id).flatMap(cells).map(key));
  const gate=level.gates.find(g=>g.color===body.color);assert(gate,'No ordinary colour gate');
  const valid=(x,y)=>body.shape.every(([dx,dy])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy])));
  assert(valid(...start),'Held start is outside/occupied');const queue=[start],parents=new Map([[key(start),null]]);counters.heldPositions++;
  for(let at=0;at<queue.length;at++){
   guard();const p=queue[at];for(const[dx,dy]of dirs){counters.heldDirections++;const next=[p[0]+dx,p[1]+dy],k=key(next);
    if(parents.has(k)||!valid(...next)||atGate({...body,x:next[0],y:next[1]},gate,level))continue;
    assert(queue.length<n,'Coordinate reservation bound exceeded');parents.set(k,p);queue.push(next);counters.heldPositions++;
   }
  }
  const pathTo=p=>{assert(parents.has(key(p)));const out=[];while(parents.get(key(p))){out.push(p);p=parents.get(key(p));}return out.reverse();};
  guard();return{positions:queue,pathTo};
 }
 function finish(level,drags,inventory){
  owned(level);assert(!dualReplayStarted,'Complete dual replay is one-shot');assert(inspect(level).full,'Final board is not full');
  assert.equal(inventoryKey(level.blocks),inventoryKey(inventory),'Final full inventory changed');
  for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++)if(level.blocks[i].color===level.blocks[j].color)
   assert(!cells(level.blocks[i]).some(([x,y])=>cells(level.blocks[j]).some(([a,b])=>Math.abs(x-a)+Math.abs(y-b)===1)),'Adjacent same colour');
  dualReplayStarted=true;const q=quoteReverseCompleteWitness(drags);
  const result=run(q,()=>{
   counters.canonicalReplays++;const canonical=runtime.replayRevisedRoute(level,drags);guard();
   assert(canonical.valid&&canonical.complete,'Canonical complete U failed');
   counters.independentReplays++;const independent=independentReplay(runtime,level,drags);guard();
   assert(independent.valid&&independent.complete&&!independent.failed,'Independent complete U failed');
   assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,drags.length);assert.equal(independent.effectiveDrags,drags.length);
   assert.equal(canonical.clearEvents,inventory.length);assert.equal(independent.clearEvents,inventory.length);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
   return{ok:true,status:'QUALIFICATION_COMPLETE_REVERSE_WITNESS_ONLY',accepted:false,formalReady:false,level,drags,levelSha256:levelSha256(level),routeSha256:routeSha256(drags),U:independent.nonClearingDrags,L:null,canonical,independent};
  });closed=true;return result;
 }
 function construct(recipe){
  guard();assert([2,3].includes(recipe.targetDifficulty),'Only predeclared D2 or D3');const inventory=recipe.inventory;
  assert(Array.isArray(inventory)&&inventory.length>0);assert.equal(new Set(inventory.map(b=>b.id)).size,inventory.length);
  assert.deepEqual([...recipe.insertionOrder].sort(),inventory.map(b=>b.id).sort());integer(recipe.maximumTargetsPerBody,1);integer(recipe.maxParkingDrags);
  assert(recipe.maxParkingDrags<=256);assert(Array.isArray(recipe.parkingBodyIds)&&recipe.parkingBodyIds.every(id=>inventory.some(b=>b.id===id)));
  assert(!Object.hasOwn(recipe.board,'blocks'),'Board declaration must not hide an uncharged full template');
  const initial=materialize('empty-normal-mask',()=>({...copy(recipe.board),blocks:[]}));inventory.forEach(native);
  assert.equal(inventory.reduce((n,b)=>n+b.shape.length,0),playable(initial).size,'Declared full inventory must exactly cover the original mask');
  assert.equal(new Set(inventory.map(b=>b.color)).size,initial.gates.length);assert(inventory.every(b=>initial.gates.some(g=>g.color===b.color)));
  const byId=new Map(inventory.map(b=>[b.id,b])),stats={};
  const options={
   insertionOptions(level,body){
    owned(level);const next=recipe.insertionOrder.find(id=>!level.blocks.some(b=>b.id===id));if(body.id!==next)return[];
    const gate=level.gates.find(g=>g.color===body.color),n=(level.width-width(body)+1)*(level.height-height(body)+1);integer(n,1);coordinateWork(n,0,'portal-anchor-scan');
    const occupied=new Set(level.blocks.flatMap(cells).map(key)),allowed=playable(level),starts=[];
    for(let y=0;y<=level.height-height(body);y++)for(let x=0;x<=level.width-width(body);x++)
     if(atGate({...body,x,y},gate,level)&&body.shape.every(([dx,dy])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy]))))starts.push([x,y]);
    const out=[];for(const start of starts){guard();const atPortal={...body,x:start[0],y:start[1]};
     materialize('insertion-portal',()=>({...level,blocks:[...level.blocks,atPortal]}));
     const reach=heldReach(level,body,start);
     for(const target of reach.positions.slice(0,recipe.maximumTargetsPerBody)){
      const reversePath=reach.pathTo(target),audit=insertion(level,atPortal,reversePath,gate.side);if(!audit.valid)continue;
      out.push({level:audit.reverseAfterLevel,operation:{kind:'insertion',body:atPortal,reversePath,exitSide:gate.side,forwardDrag:audit.forwardDrag}});
     }
    }return out;
   },
   parkingOptions(level){const out=[];for(const id of recipe.parkingBodyIds){const body=level.blocks.find(b=>b.id===id);if(!body)continue;
    const gate=level.gates.find(g=>g.color===body.color);if(atGate(body,gate,level))continue;
    const reach=heldReach(level,body,[body.x,body.y]);for(const target of reach.positions.slice(1,recipe.maximumTargetsPerBody+1)){
     const reversePath=reach.pathTo(target),audit=parking(level,id,reversePath);if(audit.valid)out.push({level:audit.reverseAfterLevel,operation:{kind:'parking',blockId:id,reversePath,forwardDrag:audit.forwardDrag}});
    }
   }return out;},
  };
  const result=runReverseInterleavedGraph({initialLevel:initial,initialOperations:[],inventory:[...byId.values()],worldKey:levelSha256,
   charge(level){owned(level);counters.graphVisits++;return known.get(level);},...options,maxParkingDrags:recipe.maxParkingDrags,stats,
   goal(level,ops){const drags=ops.map(o=>o.forwardDrag).reverse();return finish(level,drags,inventory);}});
  if(!result){closed=true;return{ok:false,status:'QUALIFICATION_FINITE_REVERSE_GRAPH_EXHAUSTED',accepted:false,L:null,U:null,stats};}
  return{...result,targetDifficulty:recipe.targetDifficulty,requiredFloor:recipe.targetDifficulty===3?31:21,upperLimit:recipe.targetDifficulty===3?null:30,stats};
 }
 function report(){const r=base.report();return{scope:REVERSE_METERED_SCOPE,qualificationOnly:true,productionQualified:false,
  originalMeter:r,reserved:{worlds:r.reserved.worlds,transitions:r.reserved.transitions+work.transitions,micro:r.reserved.micro+work.micro},
  activeReservation:activeQuote?.kind??null,terminal:terminal??r.terminal,closed,dualReplayStarted,coordinateReservations:[...coordinateReservations],formed:[...formed],counters:{...counters},assetBindings:{...assets}};}
 return Object.freeze({materialize,forward,parking,insertion,heldReach,finish,construct,report});
}
