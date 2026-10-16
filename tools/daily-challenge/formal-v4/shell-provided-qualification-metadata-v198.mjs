import assert from 'node:assert/strict';
import {levelSha256,routeSha256,mechanismsUsedByDailyCandidate} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {assertSealedShellProvidedRouteV198,assertShellProvidedSearchPlanV198,accountShellProvidedSearchReceiptV198} from './shell-provided-search-budget-v198.mjs';

// Reads existing evidence only. No level construction, model, replay or search.
const TOOLCHAIN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const layers=b=>b.layers??[b.color];
export function assertShellLayerTraceV198(blocks,drags,trace){
 const inventory=new Map();
 for(const b of blocks){assert(typeof b.id==='string'&&b.id&&!inventory.has(b.id));const colors=layers(b);assert(Array.isArray(colors)&&colors.length>0);assert.equal(colors[0],b.color);assert(colors.every(c=>typeof c==='string'&&c));inventory.set(b.id,{colors,remaining:colors.length,clears:[],nonclears:[]});}
 assert.equal(trace.length,drags.length);let nonClearing=0,clearEvents=0;
 const actions=[];
 for(const[i,t]of trace.entries()){
  assert.equal(t.index,i);assert.equal(t.moves,i+1);assert.equal(t.blockId,drags[i].blockId);const b=inventory.get(t.blockId);assert(b&&b.remaining>0,'A body can move after peeling, but not after its final layer clears');
  assert(t.clearDelta===0||t.clearDelta===1);assert.equal(!!drags[i].exitSide,t.clearDelta===1);assert.equal(t.complete,i===drags.length-1);assert(isHash(t.stateSha256));
  if(t.clearDelta){const layer=b.colors.length-b.remaining;const otherBodiesRemaining=[...inventory].filter(([id,x])=>id!==t.blockId&&x.remaining>0).length;
   b.clears.push({drag:i+1,layer,color:b.colors[layer],exitSide:drags[i].exitSide,otherBodiesRemaining});b.remaining--;clearEvents++;
  }else{b.nonclears.push(i+1);nonClearing++;}
  actions.push({drag:i+1,blockId:t.blockId,clearDelta:t.clearDelta});
 }
 assert([...inventory.values()].every(b=>b.remaining===0),'Every original layer must clear');
 const shells=[...inventory].filter(([,b])=>b.colors.length>1).map(([blockId,b])=>({blockId,colors:b.colors,clears:b.clears,
  nonClearingDragsAfterFirstPeel:b.nonclears.filter(i=>i>b.clears[0].drag),
  otherBodyActionsBetweenFirstPeelAndRemoval:actions.filter(t=>t.blockId!==blockId&&t.drag>b.clears[0].drag&&t.drag<b.clears.at(-1).drag)}));
 return{bodies:inventory.size,layerClearEvents:clearEvents,nonClearingDrags:nonClearing,totalDrags:drags.length,shells};
}
export function assertShellOriginalRouteMetadataV198(q){
 const a=q.route.canonicalReplay,b=q.route.independentReplay;
 assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
 assert(!a.failed);assert.equal(b.failed,false);
 for(const r of [a,b]){assert.equal(r.valid,true);assert.equal(r.complete,true);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);}
 const inventory=assertShellLayerTraceV198(q.level.blocks,q.drags,b.trace);assert(inventory.shells.length>0);
 assert.equal(inventory.nonClearingDrags,q.U);assert.equal(a.clearEvents,inventory.layerClearEvents);assert.equal(b.clearEvents,inventory.layerClearEvents);
 assert.equal(b.remainingBodies,0);assert.equal(b.remainingQueued,0);assert.equal(b.trace.at(-1).stateSha256,b.finalStateSha256);
 const final=JSON.parse(a.finalStateKey);assert.equal(final.complete,true);assert(!final.failed);assert.deepEqual(final.blocks,[]);assert.deepEqual(final.queuedBlocks,[]);assert.equal(final.cleared,inventory.layerClearEvents);
 const w=q.route.witnessValidation;assert.equal(w.providedRoute,true);assert.equal(w.searchPerformed,false);assert.equal(w.fullBoardSearchStates,0);assert.equal(w.drags,q.drags.length);assert.equal(w.unitSteps,q.drags.reduce((n,d)=>n+d.path.length,0));
 return{canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,...inventory};
}
export function assertShellSavedProjectionV198(q){
 const p=q.lowerBound.projection,l=q.level,v=p.projectedLevel;
 assert.equal(q.lowerBound.method,'v3-opening-outer-bodies-inventory-erasure-v1');assert.equal(p.method,'opening-outer-bodies-inventory-erasure-v1');assert.equal(p.sourceLevelSha256,q.levelSha256);assert.equal(q.lowerBound.inputLevelSha256,q.levelSha256);
 assert.equal(p.upperBoundTransfer,false);assert.equal(levelSha256(v),p.projectedLevelSha256);assert.equal(p.projectedLevelSha256,q.lowerBound.projectedLevelSha256);assert.equal(q.lowerBound.result.sourceLevelSha256,p.projectedLevelSha256);assertPlainProofDomain(v);
 // This qualifier deliberately covers opening shell inventory only. New
 // hidden/queued/facility domains need a separately reviewed implementation.
 for(const k of ['shutters','generators','elevators','conveyors','seams','flipDoors','coloredGrids'])assert(!l[k]?.length,'Unsupported shell qualification inventory '+k);
 assert(!Object.hasOwn(l,'pulseRescue')&&!Object.hasOwn(v,'pulseRescue'));
 assert.deepEqual(p.droppedBodyIds,[]);assert.deepEqual(p.erasedFacilities,{shutters:[],generators:[]});assert.equal(v.blocks.length,l.blocks.length);assert.equal(v.gates.length,l.gates.length);
 assert.deepEqual(p.retainedOuterBodies,l.blocks.map(b=>({id:b.id,color:layers(b)[0],initialLayers:layers(b).length})));
 for(const[i,b]of l.blocks.entries()){const r=v.blocks[i];assert.deepEqual(Object.keys(r).sort(),['color','id','shape','x','y']);assert.equal(r.id,b.id);assert.equal(r.color,layers(b)[0]);assert.equal(r.x,b.x);assert.equal(r.y,b.y);assert.deepEqual(r.shape,b.shape);}
 for(const[i,g]of l.gates.entries()){const r=v.gates[i];assert.deepEqual(Object.keys(r).sort(),['color','id','offset','side','size',...(g.portals?['portals']:[])].sort());for(const k of Object.keys(r))assert.deepEqual(r[k],g[k]);}
 const erasedTop=new Set(['blocks','gates','shutters','generators','flipDoors','coloredGrids','bombFailurePolicy']);
 for(const k of new Set([...Object.keys(l),...Object.keys(v)]))if(!erasedTop.has(k))assert.deepEqual(v[k],l[k],'Projection changed retained level field '+k);
 return{method:p.method,sourceLevelSha256:p.sourceLevelSha256,projectedLevelSha256:p.projectedLevelSha256,retainedBodies:v.blocks.length,originalLayers:l.blocks.reduce((n,b)=>n+layers(b).length,0),upperBoundTransfer:false};
}
export function assertNewShellProvidedReceiptV198(q){
 assert.equal(q.schemaVersion,4);assert.equal(q.contractVersion,'daily-300-frozen-math-first-attempt-tolerance-v198');assert.equal(q.difficultyPolicyVersion,'1.198.0');
 assert.equal(q.accepted,true);assert.equal(q.formalReady,false);assert.equal(q.qualificationOnly,false);assert.equal(q.catalogEligible,true);assert.equal(q.redesignRequired,false);
 assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert.deepEqual(q.reasons,[]);assert(!Object.hasOwn(q,'timeSchedule')&&!Object.hasOwn(q,'timeScheduleSha256'));
 assert.equal(q.stageKey,'mechanisms-multilayer-shell-15');assert.equal(q.newestMechanism,'multilayer-shell');assert([1,2,3].includes(q.difficulty));assert(Number.isSafeInteger(q.slot)&&q.slot>=1&&q.slot<=10);
 assert.equal(q.formalId,`daily-mechanisms-multilayer-shell-15-d${q.difficulty}-${String(q.slot).padStart(2,'0')}`);assert(Number.isSafeInteger(q.sourceLevelId)&&q.sourceLevelId>=1&&q.sourceLevelId<=200);
 assert.equal(q.level.id,q.sourceLevelId);assert.equal(levelSha256(q.level),q.levelSha256);assertSealedShellProvidedRouteV198(q);
 const used=mechanismsUsedByDailyCandidate(q.level);assert(used.includes('multilayer-shell'));assert(used.every(k=>['color-exit','multilayer-shell','irregular-block','irregular-board'].includes(k)),'This qualifier is limited to ordinary gates and opening shell inventory');
 assert.equal(q.toolchainSha256,TOOLCHAIN);assert.equal(levelSha256(q.toolchainBindings),TOOLCHAIN);assert.equal(Object.keys(q.toolchainBindings).length,36);assert.equal(q.policyToolchainSha256,levelSha256(q.policyBindings));
 assert(isHash(q.attempt?.id)&&isHash(q.attempt.retryIdentitySha256));assert.equal(q.attempt.identityOrigin,q.attempt.id);assert(!q.attempt.revalidates&&!q.attempt.lockFile);assert(isHash(q.attemptPlan.redesignOf));
 assert.equal(q.attemptPlanSha256,levelSha256(q.attemptPlan));assert.equal(q.attemptPlan.inputLevelSha256,q.levelSha256);assert.deepEqual(q.attemptPlan.band,q.band);
 assertShellProvidedSearchPlanV198(q.attemptPlan,q.attemptPlan.redesignOf,q.routeSha256);
 const accounting=accountShellProvidedSearchReceiptV198(q,{entered:true,returned:true,failedParentId:q.attemptPlan.redesignOf,providedRouteSha256:q.routeSha256});
 assert.equal(accounting.totalSearchCalls,1);assert.equal(accounting.upper.calls,0);assert.equal(accounting.lower.calls,1);assert.deepEqual(accounting.replayCalls,{canonical:1,independent:1});
 return{accounting,projection:assertShellSavedProjectionV198(q)};
}
export function assertRootShellMechanismReviewV198(review,candidate,q,replay){
 assert.equal(review.status,'ROOT_SHELL_ROUTE_MECHANISM_REVIEW_PASS');assert.deepEqual(review.errors,[]);assert.deepEqual(review.candidate,candidate);assert.equal(review.formalId,q.formalId);assert.equal(review.levelSha256,q.levelSha256);assert.equal(review.routeSha256,q.routeSha256);
 assert.equal(review.meaningfulMechanismParticipation,true);assert.equal(review.sourceAndIndependentLayoutReviewed,true);assert.deepEqual(review.routeInventory,replay);
}
