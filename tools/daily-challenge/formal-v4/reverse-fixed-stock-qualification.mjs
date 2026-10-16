import assert from 'node:assert/strict';
import {createReverseModelQualification} from './reverse-metered-qualification.mjs';
import {runReverseInterleavedGraph} from '../formal-v3/design-reverse-interleaved.mjs';
import {guardedPlainTask} from '../formal-v3/reserved-guard-budget.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

export const FIXED_REVERSE_VERSION='closed-fixed-reverse-stock-synthetic-qualification-v1';
const CORE='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const clone=structuredClone,key=p=>p.join(',');
const colours=['red','blue','green','yellow','purple','orange','pink','cyan'];
const limits={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
function gateContact(b,g,l){const vertical=g.side==='top'||g.side==='bottom',offset=vertical?b.x:b.y,span=vertical?width(b):height(b);
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+height(b)===l.height:g.side==='left'?b.x===0:b.x+width(b)===l.width);}
function fixture(id){
 assert.equal(id,'eight-colour-direct','Only this explicit synthetic inventory is callable; no real-source recipe entry');
 const inventory=colours.map(color=>({id:'q-'+color,color,x:0,y:0,shape:[[0,0]]}));
 return{fixtureId:id,board:{id:997660,name:'fixed reverse synthetic qualification only',width:4,height:2,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
  gates:colours.map((color,i)=>({id:'q-g-'+color,color,side:i<4?'top':'bottom',offset:i%4,size:1}))},inventory,insertionOrder:inventory.map(b=>b.id),parkingBodyIds:inventory.map(b=>b.id),
  maximumTargetsPerBody:1,maxParkingDrags:1,portalOrder:'row-major',targetOrder:'portal-then-row-major',parkingOrder:'declared-body-then-row-major',queuePolicy:'fill-first-diverse',layoutPriority:'none-toy-only'};
}

/** Pure, unexecuted coordinate declaration. It is NOT a recipe accepted by the
 * qualification factory, a complete LevelSpec, packing, route or difficulty proof. */
export const SOURCE52_COORDINATE_DECLARATION=freeze({sourceLevelId:52,mask:{width:6,height:8,area:48},inventoryCounts:{H3:4,V3:4,SQ2:4,H2:2,V2:2},bodyCount:16,
 colourInventory:{red:['H3','V2'],blue:['V3','H2'],green:['SQ2','H3'],yellow:['SQ2','V3'],purple:['H3','V2'],orange:['V3','H2'],pink:['SQ2','H3'],cyan:['SQ2','V3']},
 gates:[['blue','top',0,2],['yellow','top',4,2],['orange','bottom',0,2],['cyan','bottom',4,2],['red','left',1,2],['green','left',5,2],['purple','right',1,2],['pink','right',5,2]],
 proposedInsertionPriority:'alternating H/V from opposite gates; final SQ2',executed:false,productionQualified:false});

/** The fixed toy data is generated here, never supplied as an arbitrary builder.
 * A future real plan needs a separate reviewed production source/history bridge. */
export function makeFixedReverseQualificationPlan({qualificationOnly=false,fixtureId='eight-colour-direct',targetDifficulty=3,budget={},historyDecision='fresh'}={}){
 assert.equal(qualificationOnly,true,'Real seven-root/owner bridge is not implemented');assert([2,3].includes(targetDifficulty));
 assert(['fresh','blocked','near'].includes(historyDecision),'Only named synthetic history outcomes');
 assert(Object.keys(budget).every(k=>Object.hasOwn(limits,k)));const b={...limits,...budget};
 for(const[k,v]of Object.entries(b))assert(Number.isSafeInteger(v)&&v>0&&v<=limits[k]);
 const body={version:FIXED_REVERSE_VERSION,qualificationOnly:true,productionQualified:false,recipe:fixture(fixtureId),targetDifficulty,
  floor:targetDifficulty===3?31:21,upper:targetDifficulty===3?null:30,budget:b,historyDecision,maximumCompletePhysicalInputs:1,
  firstCompleteInputFailureIsTerminal:true,inventoryChangesAfterStartAllowed:false,rebandAllowed:false,fullWitnessReplayPairsMaximum:1,
  lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},proofToolchainSha256:CORE};
 return freeze({...body,planSha256:levelSha256(body)});
}
function checkPlan(plan){assert.equal(plan.qualificationOnly,true);assert.equal(plan.productionQualified,false);
 const expected=makeFixedReverseQualificationPlan({qualificationOnly:true,fixtureId:plan.recipe?.fixtureId,targetDifficulty:plan.targetDifficulty,budget:plan.budget,historyDecision:plan.historyDecision});
 assert.deepEqual(plan,expected,'Fixed plan/inventory/gates/order/budget changed');return expected;}

/** No materialize/forward/insertion/parking or arbitrary history callback escapes.
 * Every LevelSpec allocation below is inside the already-qualified internal
 * session's pre-reserved body. The original graph only sees its owned worlds.
 * Only qualification fixtures are callable; the real owner bridge fails closed. */
export function createFixedReverseQualification(runtime,plan,{qualificationOnly=false,now=Date.now}={}){
 assert.equal(qualificationOnly,true,'Production history/identity/owner connection is an explicit unimplemented stub');
 plan=checkPlan(plan);assert.equal(runtime.toolchainSha256,CORE);const recipe=plan.recipe;
 let started=false,closed=false,firstComplete=null,completePhysicalInputs=0,lowerConsumed=false,lowerInvocations=0,lastResult=null,upperBinding=null;
 const historyChecks=[],stats={},optionWork={portalScans:0},owned=new WeakSet();let session;
 // One scan of at most board area anchors per popped graph node. Each node
 // must be a separately prepaid endpoint (or the prepaid empty root), so node
 // count is bounded by the full-world reservation ceiling. Reserve this
 // conservative coordinate allowance once, BEFORE the first queue or world.
 const portalTransitionReservation=plan.budget.maxStates*recipe.board.width*recipe.board.height;
 assert(Number.isSafeInteger(portalTransitionReservation)&&portalTransitionReservation<plan.budget.maxTransitions,'No transition budget remains after fixed coordinate reservation');
 session=createReverseModelQualification(runtime,{qualificationOnly:true,limits:{...plan.budget,maxTransitions:plan.budget.maxTransitions-portalTransitionReservation},now,onFormedWorld(level,info){
  owned.add(level);
  historyChecks.push({...info,localAuditsBefore:session.report().counters.localAudits});
  if(!info.full)return true;
  if(!firstComplete){firstComplete={level,levelSha256:info.levelSha256,label:info.label};completePhysicalInputs++;
   assert.equal(completePhysicalInputs,1);if(plan.historyDecision!=='fresh')throw Error('first-complete-'+plan.historyDecision+'-terminal');
  }else assert.equal(info.levelSha256,firstComplete.levelSha256,'A different complete physical input cannot follow the first one');
  return true;
 }});
 function terminal(status,reason=null){closed=true;return{version:FIXED_REVERSE_VERSION,qualificationOnly:true,productionQualified:false,accepted:false,formalReady:false,
  status,reason,planSha256:plan.planSha256,targetDifficulty:plan.targetDifficulty,L:null,U:null,firstComplete: firstComplete?{levelSha256:firstComplete.levelSha256,label:firstComplete.label}:null};}
 function snapshot(){return{version:FIXED_REVERSE_VERSION,qualificationOnly:true,productionQualified:false,started,closed,completePhysicalInputs,
  historyChecks:[...historyChecks],lowerConsumed,lowerInvocations,upperBinding,optionWork:{...optionWork},stats:{...stats},session:session.report(),
  sharedBudget:plan.budget,portalTransitionReservation,totalReserved:{worlds:session.report().reserved.worlds,transitions:session.report().reserved.transitions+portalTransitionReservation,micro:session.report().reserved.micro},
  realHistoryApplied:false,realOwnerClaimed:false,publicLedgerClaimed:false,source52Executed:false};}
 // Pure portal coordinate scans create no LevelSpec or model. The fixed
 // allowance above is distinct from heldReach's per-call N/4N reservation.
 function scan(level,body){
  const occupied=new Set(level.blocks.flatMap(cells).map(key)),allowed=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).map(key));
  const gate=level.gates.find(g=>g.color===body.color),starts=[];
  for(let y=0;y<=level.height-height(body);y++)for(let x=0;x<=level.width-width(body);x++){
   assert(optionWork.portalScans<portalTransitionReservation,'Portal reservation exhausted before coordinate work');optionWork.portalScans++;if(gateContact({...body,x,y},gate,level)&&body.shape.every(([dx,dy])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy]))))starts.push([x,y]);
  }return{gate,starts};
 }
 function construct(){
  assert(!started,'The fixed recipe is one-shot, including blocked/near/cap/low-U results');started=true;
  try{
   // Initial clone is inside materialize; inventory atoms are metadata only.
   const initial=session.materialize('fixed-empty-mask',()=>({...clone(recipe.board),blocks:[]}));
   const operations=node=>{const out=[];for(let n=node;n?.operation;n=n.parent)out.push(n.operation);return out.reverse();};
   const insertionOptions=(level,body,node)=>{
    if(firstComplete)return[];const next=recipe.insertionOrder.find(id=>!level.blocks.some(b=>b.id===id));if(body.id!==next)return[];
    const {gate,starts}=scan(level,body),out=[];
    for(const start of starts){
     // This last portal may ALREADY be the first complete input. Its history
     // gate therefore runs before held work or the final inverse model call.
     const atPortal={...body,x:start[0],y:start[1]};session.materialize('fixed-insertion-portal',()=>({...level,blocks:[...level.blocks,atPortal]}));
     const reach=session.heldReach(level,body,start);
     for(const target of reach.positions.slice(0,recipe.maximumTargetsPerBody)){
      const reversePath=reach.pathTo(target),audit=session.insertion(level,atPortal,reversePath,gate.side);
      if(!audit.valid){if(firstComplete)throw Error('first-complete-local-audit-rejected');continue;}
      const choice={level:audit.reverseAfterLevel,operation:{kind:'insertion',body:atPortal,reversePath,exitSide:gate.side,forwardDrag:audit.forwardDrag}};
      if(firstComplete){assert.equal(levelSha256(choice.level),firstComplete.levelSha256);firstComplete.operations=[...operations(node),choice.operation];return[choice];}out.push(choice);
     }
    }return out;
   };
   const parkingOptions=level=>{
    if(firstComplete)return[];const out=[];
    for(const id of recipe.parkingBodyIds){const body=level.blocks.find(b=>b.id===id);if(!body)continue;
     const gate=level.gates.find(g=>g.color===body.color);if(gateContact(body,gate,level))continue;
     const reach=session.heldReach(level,body,[body.x,body.y]);
     for(const target of reach.positions.slice(1,recipe.maximumTargetsPerBody+1)){
      const reversePath=reach.pathTo(target),audit=session.parking(level,id,reversePath);if(audit.valid)out.push({level:audit.reverseAfterLevel,operation:{kind:'parking',blockId:id,reversePath,forwardDrag:audit.forwardDrag}});
     }
    }return out;
   };
   const found=runReverseInterleavedGraph({initialLevel:initial,initialOperations:[],inventory:recipe.inventory,charge(level){
    // Only session-owned levels are ever returned above. No graph allocation or
    // duplicate visit receives a fresh budget; each earlier allocation was paid.
    assert(owned.has(level),'Graph received an unowned world');return levelSha256(level);
   },insertionOptions,parkingOptions,goal(level,ops){assert(firstComplete);assert.equal(levelSha256(level),firstComplete.levelSha256);
    assert.deepEqual(ops,firstComplete.operations);return session.finish(level,ops.map(o=>o.forwardDrag).reverse(),recipe.inventory);
   },queuePolicy:recipe.queuePolicy,layoutScore:()=>0,maxParkingDrags:recipe.maxParkingDrags,stats});
   if(!found){lastResult=terminal('FIXED_REVERSE_FINITE_GRAPH_EXHAUSTED');return lastResult;}
   closed=true;lastResult=freeze({...found,version:FIXED_REVERSE_VERSION,qualificationOnly:true,productionQualified:false,status:'FIXED_REVERSE_BOUND_COMPLETE_U_ONLY',
    planSha256:plan.planSha256,targetDifficulty:plan.targetDifficulty,requiredFloor:plan.floor,upperLimit:plan.upper,constructionAccounting:snapshot()});
   upperBinding=freeze({receiptSha256:levelSha256(lastResult),levelSha256:lastResult.levelSha256,routeSha256:lastResult.routeSha256,planSha256:plan.planSha256,
    proofToolchainSha256:CORE,canonicalReplayCalls:1,independentReplayCalls:1});return lastResult;
  }catch(error){lastResult=terminal('FIXED_REVERSE_CONSTRUCTION_TERMINAL',error.message);return lastResult;}
 }
 function consumeOriginalLower(receipt){
  assert(started&&closed,'Finish the one-shot construction first');assert(!lowerConsumed,'Original lower stage is one-shot');lowerConsumed=true;
  assert(upperBinding,'No bound complete double-U evidence');assert.equal(levelSha256(receipt),upperBinding.receiptSha256,'Bound upper receipt bytes/fields changed');
  assert.equal(receipt.levelSha256,levelSha256(receipt.level));assert.equal(receipt.routeSha256,routeSha256(receipt.drags));
  const counters=session.report().counters;assert.equal(counters.canonicalReplays,1);assert.equal(counters.independentReplays,1);
  if(receipt.U<plan.floor||(plan.upper!==null&&receipt.U>plan.upper))return{status:receipt.U<plan.floor?'KNOWN_UPPER_BELOW_FIXED_FLOOR':'KNOWN_UPPER_ABOVE_FIXED_CEILING',accepted:false,L:null,U:receipt.U,upperBinding,lower:null,qualificationOnly:true,productionQualified:false};
  // No U search/replay here. This original primitive is the sole lower call.
  // Positive lower invocation is deliberately not claimed qualified by the
  // low-U toy; real history/public claim/terminal seals remain unimplemented.
  lowerInvocations++;const lower=guardedPlainTask(receipt.level,runtime,{floor:plan.floor,searchUpper:null,...plan.lowerBudget});
  const mathematicalThresholdProven=lower.status==='threshold-proven'&&lower.termination==='below-threshold-exhausted'&&lower.thresholdProven===true&&lower.floor===plan.floor&&lower.sourceLevelSha256===receipt.levelSha256&&lower.elapsedMilliseconds<=plan.lowerBudget.maxMilliseconds;
  return{status:'QUALIFICATION_ORIGINAL_LOWER_RECORDED',accepted:false,mathematicalThresholdProven,L:mathematicalThresholdProven?plan.floor:null,U:receipt.U,upperBinding,lower,qualificationOnly:true,productionQualified:false};
 }
 return Object.freeze({construct,consumeOriginalLower,report:snapshot});
}
