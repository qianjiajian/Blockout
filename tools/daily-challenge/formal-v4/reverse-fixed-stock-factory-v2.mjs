import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {independentReplay,levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath} from '../formal-v3/reverse-route-audit.mjs';
import {runReverseInterleavedGraph} from '../formal-v3/design-reverse-interleaved.mjs';
import {quoteReverseWorldCreation,quoteReverseForwardDrag,quoteReverseInverseEdge,quoteReverseCompleteWitness} from './reverse-construction-reservations.mjs';

const REVERSE_METERED_SCOPE='closed-reverse-stock-plain-static-native-rectangle-v1';
import {takeReverseConstructionAuthority,takeReverseClaimAuthority} from './reverse-fixed-stock-task-v2.mjs';
import {assertFreshPlanHistoryInput} from './plan-history-adapter-v5.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
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

/** Private production-scope copy of the reviewed local bodies. The old 8e855
 * and c9ea entry flags remain untouched; this module has its OWN closed scope,
 * authority check, metering wrapper and qualification. Only their unchanged
 * mathematical quote formulae and graph/forward semantics are reused. */
function createPrivateModelSession(runtime,{limits={},now=Date.now,onFormedWorld}={}){
 assert.equal(runtime.toolchainSha256,CORE);
 assert.equal(typeof onFormedWorld,'function','An explicit synchronous history/formed-world hook is required');
 const base=createClosedReservationMeter({limits,now}),known=new WeakMap(),assets={},formed=[],coordinateReservations=[];
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
  const accepted=onFormedWorld(level,{label,levelSha256:sha,full:info.full,reservedWorlds:base.report().reserved.worlds,ordinal:formed.length,quote:copy(activeQuote)});
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
   return{ok:true,status:'COMPLETE_REVERSE_WITNESS_AWAITING_ORIGINAL_LOWER',accepted:false,formalReady:false,level,drags,levelSha256:levelSha256(level),routeSha256:routeSha256(drags),U:independent.nonClearingDrags,L:null,canonical,independent};
  });closed=true;return result;
 }
 function report(){const r=base.report();return{scope:REVERSE_METERED_SCOPE,originalMeter:r,reserved:{worlds:r.reserved.worlds,transitions:r.reserved.transitions+work.transitions,micro:r.reserved.micro+work.micro},activeReservation:activeQuote?.kind??null,terminal:terminal??r.terminal,closed,dualReplayStarted,coordinateReservations:[...coordinateReservations],formed:[...formed],counters:{...counters},assetBindings:{...assets}};}
 return{materialize,forward,parking,insertion,heldReach,finish,report};
}

// Private reservation executor. Quotes cannot be passed by a task caller.
// Same pre-add/guard/no-refund arithmetic as c9ea; no qualification flag is
// reused to authorize production. Authority is checked at the only entry below.
function createClosedReservationMeter({limits,now}){
 const budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,...limits},reserved={worlds:0,transitions:0,micro:0},reservations=[];
 let terminal=null,active=false,latest=now();const started=latest;
 const fail=m=>{terminal??=m;throw Error(terminal);};
 const guard=()=>{if(terminal)throw Error(terminal);const t=now();if(!Number.isSafeInteger(t)||t<latest)fail('reservation-clock-invalid');latest=t;if(t-started>=budget.maxMilliseconds)fail('reservation-deadline');};
 return{guard,runSync(q,fn){guard();assert(!active);for(const [field,cap]of [['worlds','maxStates'],['transitions','maxTransitions'],['micro','maxMicroStates']]){assert(Number.isSafeInteger(q[field])&&q[field]>=0);if(reserved[field]+q[field]>budget[cap])fail('reservation-'+field+'-exhausted');}
  for(const k of Object.keys(reserved))reserved[k]+=q[k];reservations.push(q);active=true;try{const value=fn();assert(!value?.then,'Synchronous creation only');guard();return value;}catch(e){terminal??=e.message;throw e;}finally{active=false;}},
 report(){return{budget,reserved:{...reserved},reservations:[...reservations],elapsedMilliseconds:latest-started,active,terminal};}};
}

export const REVERSE_STOCK_FACTORY_VERSION='closed-fixed-inventory-first-full-reverse-v1';
const MAXIMUM={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
const STRATEGY={name:'finite-cross-colour-access-v1',missingWindow:2,maximumTargetsPerBody:4,parkingBodiesMaximum:2,parkingTargetsPerBody:2,maxParkingDrags:48,queuePolicy:'fill-first-diverse'};
const sessions=new WeakMap();
function pureNative(rt,b,bindings){
 assert(Object.keys(b).every(k=>['id','color','shape'].includes(k)));assert(typeof b.id==='string'&&b.id.length);const atom={...b,x:0,y:0};
 assert(Array.isArray(b.shape)&&b.shape.length&&b.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));
 assert.equal(new Set(b.shape.map(key)).size,width(atom)*height(atom));assert(Math.min(...b.shape.map(p=>p[0]))===0&&Math.min(...b.shape.map(p=>p[1]))===0);assert(b.shape.length<=6);
 const match=rt.matchFormalBlockShape(b.shape,'native-only');assert(match?.quarterTurns===0);const file=rt.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(file,'Missing actual q0 colour artwork');
 const full=path.resolve('public',file);bindings[full]=createHash('sha256').update(fs.readFileSync(full)).digest('hex');return atom;
}
/** No full candidate or model is constructed. All input choices are data, and
 * the only production strategy is the finite internal coordinate policy. */
export function makeReverseStockRecipe(runtime,source,declaration,{qualificationOnly=false}={}){
 assert.equal(runtime.toolchainSha256,CORE);assert.equal(source.id,declaration.sourceLevelId);assert([2,3].includes(declaration.targetDifficulty));
 assert(!Object.hasOwn(declaration,'level')&&!Object.hasOwn(declaration,'builder'));assert.deepEqual(declaration.strategy,STRATEGY);
 const bindings={},inventory=declaration.inventory.map(b=>pureNative(runtime,b,bindings));assert.equal(new Set(inventory.map(b=>b.id)).size,inventory.length);
 assert.deepEqual([...declaration.insertionOrder].sort(),inventory.map(b=>b.id).sort());assert.deepEqual([...declaration.parkingBodyIds].sort(),inventory.map(b=>b.id).sort());
 const board={id:source.id,name:'Daily reverse stock '+declaration.recipeId,width:source.width,height:source.height,timeSeconds:source.timeSeconds??180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',gates:copy(declaration.gates)};
 for(const k of ['playable','blocked','seams'])if(source[k]!==undefined)board[k]=copy(source[k]);
 assert.equal(inventory.reduce((n,b)=>n+b.shape.length,0),playable(board).size,'Full fixed stock area must equal actual normal mask');
 assert.equal(new Set(board.gates.map(g=>g.id)).size,board.gates.length);assert.equal(new Set(board.gates.map(g=>g.color)).size,board.gates.length);
 assert.equal(board.gates.length,8,'This fixed production domain declares all eight ordinary colours');assert.equal(new Set(inventory.map(b=>b.color)).size,8);
 for(const g of board.gates){assert(Object.keys(g).every(k=>['id','side','offset','size','color'].includes(k)));assert(['top','right','bottom','left'].includes(g.side));assert(Number.isSafeInteger(g.offset)&&g.offset>=0&&Number.isSafeInteger(g.size)&&g.size>0);assert(g.offset+g.size<=((g.side==='top'||g.side==='bottom')?board.width:board.height));}
 for(const b of inventory){const g=board.gates.find(g=>g.color===b.color);assert(g);assert((g.side==='top'||g.side==='bottom'?width(b):height(b))<=g.size,'Fixed body does not fit its own ordinary gate');}
 const budget={...MAXIMUM,...declaration.upperBudget};for(const [k,v]of Object.entries(budget))assert(Object.hasOwn(MAXIMUM,k)&&Number.isSafeInteger(v)&&v>0&&v<=MAXIMUM[k]);
 const toy=declaration.qualificationFixture??null;assert(toy===null||qualificationOnly&&toy==='eight-colour-cycle-one-parking','No authored operation schedule in production');
 const recipe={version:REVERSE_STOCK_FACTORY_VERSION,qualificationOnly,recipeId:declaration.recipeId,sourceLevelId:source.id,sourceMaskSha256:levelSha256({width:board.width,height:board.height,playable:source.playable??null,blocked:source.blocked??null,seams:source.seams??null}),board,inventory,insertionOrder:copy(declaration.insertionOrder),parkingBodyIds:copy(declaration.parkingBodyIds),strategy:copy(STRATEGY),targetDifficulty:declaration.targetDifficulty,floor:declaration.targetDifficulty===2?21:31,upper:declaration.targetDifficulty===2?30:null,budget,maximumFootprintSimilarity:0.65,qualificationFixture:toy,assetBindings:bindings,maximumCompletePhysicalInputs:1};
 return freeze({...recipe,recipeSha256:levelSha256(recipe)});
}
const ownDistance=(b,g,p,l)=>g.side==='top'?p[1]:g.side==='bottom'?l.height-height(b)-p[1]:g.side==='left'?p[0]:l.width-width(b)-p[0];
function coordinatePortals(level,body){const g=level.gates.find(g=>g.color===body.color),points=[];for(let y=0;y<=level.height-height(body);y++)for(let x=0;x<=level.width-width(body);x++)if(atGate({...body,x,y},g,level))points.push([x,y]);return points;}
const overlaps=(a,b)=>a.some(p=>b.some(q=>key(p)===key(q)));
const toySteps=[['insertion','q-red',[0,1]],['insertion','q-blue',[0,0]],['insertion','q-orange',[1,0]],['parking','q-red',[1,1]],['insertion','q-purple',[0,1]],['insertion','q-green',[2,0]],['insertion','q-yellow',[3,0]],['insertion','q-pink',[2,1]],['insertion','q-cyan',[3,1]]];

/** Only the task module can issue the opaque authority. No approval callback,
 * arbitrary LevelSpec builder, coordinate schedule or mutable plan is exposed. */
export function beginReverseStockConstruction(runtime,recipe,authority){
 const auth=takeReverseConstructionAuthority(authority,runtime,recipe);recipe=auth.recipe;
 const formed=[],owned=new WeakSet(),stats={},rawTrace={portalScans:0,coordinateScoreEvaluations:0};let firstFull=null,session,phase='constructing';
 // Portal/ranking metadata has an a priori bound: at most maxStates graph nodes,
 // fixed missing/parking windows, finite anchor boxes and fixed inventory scans.
 const area=recipe.board.width*recipe.board.height,n=recipe.inventory.length;
 const maxPortals=Math.max(...recipe.inventory.map(b=>{const g=recipe.board.gates.find(g=>g.color===b.color);return g.size-(['top','bottom'].includes(g.side)?width(b):height(b))+1;}));
 // Each option scan/ranking pose is one logical coordinate proposal. Scalar
 // overlap comparisons score that already-proposed pose, not extra worlds,
 // moves or held states. Reserve all portal anchors plus every ranking pose.
 const coordinateReservation=n*area+recipe.budget.maxStates*(recipe.strategy.missingWindow*maxPortals*(area+1)+recipe.strategy.parkingBodiesMaximum*area);
 assert(coordinateReservation<recipe.budget.maxTransitions,'Finite coordinate allowance leaves no transition room');
 const historyState={...auth.state,fullWorlds:auth.comparisonView?.fullWorlds??auth.state.fullWorlds};
 const pool=auth.comparisonView?.nearPools??auth.state.nearPools;
 const onFormedWorld=(level,info)=>{
  auth.persistFormedWorld(level,info);owned.add(level);formed.push({level,info:{...info},ordinal:formed.length});
  if(!info.full)return true;assert(!firstFull,'Only the FIRST complete physical input is allowed');firstFull={level,levelSha256:info.levelSha256};
  assertFreshPlanHistoryInput(historyState,level,{sourceLevelId:recipe.sourceLevelId,reference:auth.reference??null,failedParent:auth.failedParent??null});
  const maxima={};for(const [kind,rows]of Object.entries(pool)){maxima[kind]=0;for(const w of rows)maxima[kind]=Math.max(maxima[kind],compareLayouts(level,w.level).footprintSimilarity);}
  maxima.source=auth.source.blocks?.length?compareLayouts(level,auth.source).footprintSimilarity:0;
  if(auth.referenceLevel)maxima.reference=compareLayouts(level,auth.referenceLevel).footprintSimilarity;
  firstFull.similarity=maxima;assert(Object.values(maxima).every(v=>v<=recipe.maximumFootprintSimilarity),'First complete stock near-rejected; recipe terminates');return true;
 };
 session=createPrivateModelSession(runtime,{limits:{...recipe.budget,maxTransitions:recipe.budget.maxTransitions-coordinateReservation},now:auth.now,onFormedWorld});
 const report=()=>({phase,formed,stats:{...stats},session:session.report(),coordinateReservation,coordinateWork:{...rawTrace},totalReserved:{...session.report().reserved,transitions:session.report().reserved.transitions+coordinateReservation},firstComplete:firstFull?{levelSha256:firstFull.levelSha256,similarity:firstFull.similarity??null}:null,completePhysicalInputs:Number(!!firstFull),exactWorldVisitCountClaimed:false});
 const cap=()=>{assert(++rawTrace.portalScans<=coordinateReservation,'Coordinate allowance exhausted');};
 const portalsById=new Map(recipe.inventory.map(body=>[body.id,coordinatePortals(recipe.board,body)]));
 const ops=node=>{const out=[];for(let n=node;n?.operation;n=n.parent)out.push(n.operation);return out.reverse();};
 const step=node=>recipe.qualificationFixture?toySteps[ops(node).length]:null;
 function targetOrder(level,body,positions){const own=level.gates.find(g=>g.color===body.color);return positions.map(p=>{cap();rawTrace.coordinateScoreEvaluations++;
   const footprint=body.shape.map(([x,y])=>[p[0]+x,p[1]+y]);let cross=0;for(const other of recipe.inventory)if(other.color!==body.color)for(const portal of portalsById.get(other.id))if(overlaps(footprint,other.shape.map(([x,y])=>[portal[0]+x,portal[1]+y])))cross++;
   return{p,key:[Number(atGate({...body,x:p[0],y:p[1]},own,level)),-cross,-ownDistance(body,own,p,level),p[1],p[0]]};}).sort((a,b)=>{for(let i=0;i<a.key.length;i++)if(a.key[i]!==b.key[i])return a.key[i]-b.key[i];return 0;}).map(x=>x.p);}
 try{
  const initial=session.materialize('empty-normal-mask',()=>({...copy(recipe.board),blocks:[]}));
  const result=runReverseInterleavedGraph({initialLevel:initial,initialOperations:[],inventory:recipe.inventory,queuePolicy:recipe.strategy.queuePolicy,layoutScore:()=>0,maxParkingDrags:recipe.strategy.maxParkingDrags,stats,
   charge(level){assert(owned.has(level),'Unreserved graph world');return levelSha256(level);},
   insertionOptions(level,body,node){if(firstFull)return[];const expected=step(node);if(expected&&(expected[0]!=='insertion'||expected[1]!==body.id))return[];
    const missing=recipe.insertionOrder.filter(id=>!level.blocks.some(b=>b.id===id));if(!expected&&!missing.slice(0,recipe.strategy.missingWindow).includes(body.id))return[];
    const occupied=new Set(level.blocks.flatMap(cells).map(key)),out=[];
    for(const start of portalsById.get(body.id)){cap();if(!body.shape.every(([x,y])=>playable(level).has(key([start[0]+x,start[1]+y]))&&!occupied.has(key([start[0]+x,start[1]+y]))))continue;
     const atom={...body,x:start[0],y:start[1]},portal=session.materialize('insertion-portal',()=>({...level,blocks:[...level.blocks,atom]})),gate=level.gates.find(g=>g.color===body.color);
     if(firstFull){assert.equal(firstFull.level,portal);const operation={kind:'insertion',body:atom,reversePath:[],exitSide:gate.side,forwardDrag:{blockId:body.id,path:[],exitSide:gate.side}};
      firstFull.pendingLast={before:level,operation};return[{level:portal,operation}];}
     const reach=session.heldReach(level,body,start),targets=expected?reach.positions.filter(p=>key(p)===key(expected[2])):targetOrder(level,body,reach.positions).slice(0,recipe.strategy.maximumTargetsPerBody);
     for(const target of targets){const reversePath=reach.pathTo(target),audit=session.insertion(level,atom,reversePath,gate.side);if(audit.valid)out.push({level:audit.reverseAfterLevel,operation:{kind:'insertion',body:atom,reversePath,exitSide:gate.side,forwardDrag:audit.forwardDrag}});}
    }return out;
   },
   parkingOptions(level,node){if(firstFull)return[];const expected=step(node);if(expected&&expected[0]!=='parking')return[];const out=[];
    const next=recipe.inventory.find(b=>!level.blocks.some(x=>x.id===b.id)),portals=next?portalsById.get(next.id).map(p=>next.shape.map(([x,y])=>[x+p[0],y+p[1]])):[];
    const ids=expected?[expected[1]]:recipe.parkingBodyIds.filter(id=>level.blocks.some(b=>b.id===id)).sort((a,b)=>{const score=id=>portals.filter(p=>overlaps(cells(level.blocks.find(x=>x.id===id)),p)).length;return score(b)-score(a)||a.localeCompare(b);}).slice(0,recipe.strategy.parkingBodiesMaximum);
    for(const id of ids){const body=level.blocks.find(b=>b.id===id),gate=level.gates.find(g=>g.color===body.color);if(atGate(body,gate,level))continue;
     const reach=session.heldReach(level,body,[body.x,body.y]),positions=reach.positions.slice(1);
     const targets=expected?positions.filter(p=>key(p)===key(expected[2])):positions.map(p=>{cap();return{p,blocks:portals.filter(q=>overlaps(body.shape.map(([x,y])=>[p[0]+x,p[1]+y]),q)).length,steps:reach.pathTo(p).length};}).sort((a,b)=>a.blocks-b.blocks||a.steps-b.steps||a.p[1]-b.p[1]||a.p[0]-b.p[0]).slice(0,recipe.strategy.parkingTargetsPerBody).map(x=>x.p);
     for(const target of targets){const reversePath=reach.pathTo(target),audit=session.parking(level,id,reversePath);if(audit.valid)out.push({level:audit.reverseAfterLevel,operation:{kind:'parking',blockId:id,reversePath,forwardDrag:audit.forwardDrag}});}
    }return out;
   },goal(level,operations){assert(firstFull&&firstFull.level===level);return{level,operations};}});
  if(!result){phase='terminal';return{status:'REVERSE_CONSTRUCTION_FINITE_EXHAUSTED',pending:false,report:report()};}
  phase='awaiting-claim';const token=Object.freeze({});sessions.set(token,{runtime,recipe,authority,auth,session,firstFull,operations:result.operations,report,setPhase:p=>phase=p,phase:()=>phase});
  return{status:'FIRST_FULL_PENDING_PUBLIC_CLAIM',pending:true,token,level:firstFull.level,levelSha256:firstFull.levelSha256,report:report()};
 }catch(e){phase='terminal';return{status:'REVERSE_CONSTRUCTION_TERMINAL',pending:false,reason:e.message,report:report()};}
}
export function abandonReverseStockConstruction(token,reason){const s=sessions.get(token);assert(s&&s.phase()==='awaiting-claim');s.setPhase('terminal');return{status:'REVERSE_FIRST_FULL_TERMINAL',reason,report:s.report()};}
export function finishReverseStockUpper(token,claimAuthority){
 const s=sessions.get(token);assert(s&&s.phase()==='awaiting-claim','One continuation, no graph restart');takeReverseClaimAuthority(claimAuthority,s.authority,s.firstFull.levelSha256);s.setPhase('finishing');
 try{const last=s.firstFull.pendingLast,a=s.session.forward(s.firstFull.level,last.operation.forwardDrag,{expectedBodies:last.before.blocks});assert(a.valid,'Last claimed insertion did not restore predecessor');
  const upper=s.session.finish(s.firstFull.level,s.operations.map(o=>o.forwardDrag).reverse(),s.recipe.inventory);s.setPhase('complete');return{...upper,status:'BOUND_REVERSE_COMPLETE_UPPER',recipeSha256:s.recipe.recipeSha256,accounting:s.report()};
 }catch(e){s.setPhase('terminal');return{status:'REVERSE_CLAIMED_UPPER_TERMINAL',accepted:false,U:null,reason:e.message,accounting:s.report()};}
}
