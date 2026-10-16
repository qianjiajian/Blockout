import assert from 'node:assert/strict';
import {assertStaticStarStockIds} from './static-star-stock-ids-v1.mjs';
import {prepareMissingPortalPenalty,compareMissingPortalTargetKeys} from './reverse-missing-portal-penalty-v1.mjs';
import {compileStoredStarSuffixBlueprint,restoreStoredStarSuffixSeed,assertSource200StarStock,assertStaticStarDomain} from './reverse-star-suffix-blueprint-v2.mjs';
export {compileStoredStarSuffixBlueprint,assertSource200StarStock,assertStaticStarDomain} from './reverse-star-suffix-blueprint-v2.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {independentReplay,levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath} from '../formal-v3/reverse-route-audit.mjs';
import {runReverseInterleavedGraph} from '../formal-v3/design-reverse-interleaved.mjs';
import {quoteReverseWorldCreation,quoteReverseForwardDrag,quoteReverseInverseEdge,quoteReverseCompleteWitness} from './reverse-construction-reservations.mjs';

const REVERSE_METERED_SCOPE='closed-reverse-star-stock-static-native-rectangle-v6';
// The new task alone issues authenticated, one-use production capabilities.
import {takeReverseConstructionAuthority,takeReverseClaimAuthority,assertReverseStarProductionReady} from './reverse-star-suffix-task-v5.mjs';
import {assertFreshPlanHistoryInput} from './plan-history-adapter-v12.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
const CORE='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],key=p=>p.join(','),copy=structuredClone;
const integer=(v,min=0)=>assert(Number.isSafeInteger(v)&&v>=min,'Invalid finite coordinate reservation');
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
const bodyKey=blocks=>levelSha256(blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.color,star:b.star??false,layers:b.layers??[b.color]})).sort((a,b)=>a.id.localeCompare(b.id)));
const inventoryKey=blocks=>levelSha256(blocks.map(({x,y,...b})=>b).sort((a,b)=>a.id.localeCompare(b.id)));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freeze(v);}return value;}
function playable(level){const blocked=new Set((level.blocked??[]).map(key));return new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).map(key).filter(k=>!blocked.has(k)));}
function atGate(b,g,l){
 const horizontal=['top','bottom'].includes(g.side),offset=horizontal?b.x:b.y,span=horizontal?width(b):height(b);
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+height(b)===l.height:g.side==='left'?b.x===0:b.x+width(b)===l.width);
}

// Coordinate fragments only: no clone, LevelSpec, model, held search or raw
// admission. Production calls this only after the private owned(level) check.
// Every occupancy/portal/edge read and comparison is paid BEFORE use.
function rankStaticParkingCandidates(level,ids,portals,maximum,charge){
 assert.equal(maximum,2,'The existing two-body strategy remains fixed');
 const occ=new Map(),bodies=new Map(),ranked=[],excluded=[];let comparisons=0;
 for(const body of level.blocks){
  charge(1,0,'parking-body-index');assert(!bodies.has(body.id));let w=0,h=0;
  for(const [dx,dy]of body.shape){charge(1,0,'parking-occupancy-cell');const k=key([body.x+dx,body.y+dy]);assert(!occ.has(k));occ.set(k,body.id);w=Math.max(w,dx+1);h=Math.max(h,dy+1);}
  bodies.set(body.id,{body,w,h});
 }
 for(const id of ids){
  charge(1,0,'parking-candidate-id');const atom=bodies.get(id);if(!atom)continue;const {body,w,h}=atom;let ownGate=false;
  for(const gate of level.gates){
   charge(1,0,'parking-eligible-gate');if(gate.color!==body.color||body.star&&gate.star!==true)continue;
   const horizontal=gate.side==='top'||gate.side==='bottom',offset=horizontal?body.x:body.y,span=horizontal?w:h;
   if(offset>=gate.offset&&offset+span<=gate.offset+gate.size&&(gate.side==='top'?body.y===0:gate.side==='bottom'?body.y+h===level.height:gate.side==='left'?body.x===0:body.x+w===level.width)){ownGate=true;break;}
  }
  if(ownGate){excluded.push({id,reason:'already-at-eligible-exit'});continue;}
  let openDirections=0;
  for(const [dx,dy]of dirs){
   charge(1,1,'parking-first-step-direction');const x=body.x+dx,y=body.y+dy;if(x<0||y<0||x+w>level.width||y+h>level.height)continue;
   let open=true;const span=dx===0?w:h;
   for(let i=0;i<span;i++){
    charge(1,0,'parking-first-step-exposed-cell');const px=dx===0?x+i:dx>0?x+w-1:x,py=dy===0?y+i:dy>0?y+h-1:y;
    if(occ.has(key([px,py]))){open=false;break;}
   }
   if(open)openDirections++;
  }
  if(openDirections===0){excluded.push({id,reason:'no-geometric-first-step'});continue;}
  let portalBlockCount=0;
  for(const portal of portals){
   charge(1,0,'parking-blocked-portal');let hit=false;
   for(const p of portal){charge(1,0,'parking-blocked-portal-cell');if(occ.get(key(p))===id){hit=true;break;}}
   if(hit)portalBlockCount++;
  }
  const row={id,portalBlockCount,openDirections};let at=ranked.length;
  // Stable insertion sort has <= B*(B-1)/2 comparisons, below the B^2 cap.
  while(at>0){charge(1,0,'parking-rank-comparison');comparisons++;assert(comparisons<=level.blocks.length**2);const other=ranked[at-1],order=row.portalBlockCount-other.portalBlockCount||row.openDirections-other.openDirections||other.id.localeCompare(row.id);if(order<=0)break;ranked[at]=other;at--;}
  ranked[at]=row;
 }
 return{selectedIds:ranked.slice(0,maximum).map(x=>x.id),ranked,excluded,comparisons};
}

/** Read-only geometry diagnostics only. This cannot create or authorize a
 * world, access a model, or return a production session/capability. */
export function inspectStarParkingCandidatesForMetadata(level,ids,portals,{maxTransitions=10000000,maxMicroStates=3000000}={}){
 assertStaticStarDomain(level);assert(level.width*level.height<=63&&level.blocks.length<=23);assert.equal(new Set(ids).size,ids.length);assert(ids.length<=23);
 // This diagnostic shares only the already-established production shape
 // domain, not arbitrary polyomino semantics. These are schema checks.
 for(const body of level.blocks){assert(body.shape.length<=6&&body.shape.length>0);assert(body.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));assert(Math.min(...body.shape.map(p=>p[0]))===0&&Math.min(...body.shape.map(p=>p[1]))===0);assert.equal(new Set(body.shape.map(key)).size,width(body)*height(body));assert.equal(body.shape.length,width(body)*height(body));assert(Number.isSafeInteger(body.x)&&Number.isSafeInteger(body.y)&&body.x>=0&&body.y>=0&&body.x+width(body)<=level.width&&body.y+height(body)<=level.height);}
 for(const n of [maxTransitions,maxMicroStates])assert(Number.isSafeInteger(n)&&n>=0);assert(maxTransitions<=10000000&&maxMicroStates<=3000000);
 let transitions=0,micro=0,terminal=null;const operations=[];
 const charge=(t,m,label)=>{if(terminal)throw Error(terminal);if(transitions+t>maxTransitions||micro+m>maxMicroStates){terminal='metadata-coordinate-budget-exhausted';throw Error(terminal);}transitions+=t;micro+=m;operations.push({label,transitions:t,micro:m});};
 let result=null;try{result=rankStaticParkingCandidates(level,ids,portals,2,charge);}catch(e){terminal??=e.message;}
 return{result,terminal,accounting:{transitions,micro,operations},newWorlds:0,newModels:0,newRawAdmissions:0};
}

const instrumentedPrototypes=new WeakSet();
const DYNAMIC=['cleared','started','autonomousStarted','complete','failed','remainingSeconds','timeFreezeSeconds'];
const OBSERVED_METHODS=['settleRevisedSpace','updateComplete','startCountdown','start','beginAction','commitAction','moveBlockStep','tryExit','snapshot'];
const FORBIDDEN_METHODS=['tick','clone','restore','cancelAction','undo','moveBlock','removeBlockWithBooster','completeExitAnimation'];
/** Fixed static star/ordinary stock only. Every ID remains in the key as pose or ABSENT.
 * All changing snapshot scalars except move score are included. Other snapshot
 * fields are fixed, single-layer, empty, or bound to board/inventory below.
 * No colour/shape quotient and no removal closure is used.
 *
 * The original synchronous model methods execute unchanged. Local property
 * setters register the NEXT value before assigning it, including intermediate
 * x/y, start flags, removal, cleared and complete transitions inside tryExit.
 * Constructor hydration is the pre-registered initial board; its first settle
 * call installs setters before updateComplete. No clock/queue/hidden mechanics
 * are permitted. All descriptors are restored even on budget failure.
 */
function createRawBoardObserver(runtime,board,inventory,{limit,guard,fail,charge}){
 assert.equal(runtime.toolchainSha256,CORE);integer(limit,1);assert(limit<=10000);
 const ids=inventory.map(b=>b.id),stock=new Map(inventory.map(b=>[b.id,b]));assert.equal(stock.size,ids.length);
 const proto=runtime.PuzzleModel.prototype,original=Object.getOwnPropertyDescriptors(proto);
 for(const name of OBSERVED_METHODS)assert.equal(typeof original[name]?.value,'function',name);
 const raw=new Set(),expanded=new Set(),events=[],operations={},models=new WeakSet(),recordCredits=new Map();let label='creation',active=false,admissions=0,duplicateAdmissions=0,visits=0,modelCount=0,setterWrites=0,recordTicketsIssued=0,recordTicketsConsumed=0;
 const initial=()=>({cleared:0,started:false,autonomousStarted:false,complete:false,failed:false,remainingSeconds:board.timeSeconds,timeFreezeSeconds:0});
 const fixed=l=>levelSha256({id:l.id,width:l.width,height:l.height,mechanismRules:l.mechanismRules,timeSeconds:l.timeSeconds,playable:l.playable??null,blocked:l.blocked??null,seams:l.seams??null,gates:l.gates});
 const staticHash=fixed(board),inventoryHash=levelSha256(inventory.map(({id,color,shape,star})=>({id,color,shape,star:star??false})));
 function operation(name){const k=label+':'+name;operations[k]=(operations[k]??0)+1;}
 const keyScanCost=n=>2*ids.length+2*n+1;
 function stateKey(blocks,scalars,change=null,prepaid=false){
  // Array/coordinate fragments, not a LevelSpec or a hypothetical PuzzleModel.
  if(!prepaid)charge(keyScanCost(blocks.length));const poses=new Map();
  for(const b of blocks){const atom=stock.get(b.id);assert(atom&&!poses.has(b.id),'Unknown/duplicate raw body identity');
   assert.equal(b.color,atom.color);assert.deepEqual(b.shape,atom.shape);assert.equal(b.star??false,atom.star??false);assert((b.frozen??0)===0&&(!b.layers||b.layers.length===1&&b.layers[0]===b.color));
   assert(Object.keys(b).every(k=>['id','x','y','shape','color','star','frozen','layers'].includes(k)),'Unexpected live body metadata');
   let x=b.x,y=b.y;if(change?.id===b.id){x=change.x??x;y=change.y??y;}assert(Number.isSafeInteger(x)&&Number.isSafeInteger(y));poses.set(b.id,[x,y]);
  }
  if(change?.add){const b=change.add,atom=stock.get(b.id);assert(atom&&!poses.has(b.id));assert.equal(b.color,atom.color);assert.deepEqual(b.shape,atom.shape);assert.equal(b.star??false,atom.star??false);poses.set(b.id,[change.x??b.x,change.y??b.y]);}
  for(const k of ['cleared','remainingSeconds','timeFreezeSeconds'])assert(Number.isFinite(scalars[k])&&scalars[k]>=0);for(const k of ['started','autonomousStarted','complete','failed'])assert.equal(typeof scalars[k],'boolean');
  return JSON.stringify([ids.map(id=>poses.get(id)??null),DYNAMIC.map(k=>scalars[k])]);
 }
 function admit(blocks,scalars,change,reason){guard();const k=stateKey(blocks,scalars,change);admissions++;
  if(raw.has(k)){duplicateAdmissions++;return k;}if(raw.size>=limit)fail('qualification-distinct-worlds-exhausted');
  raw.add(k);events.push({ordinal:raw.size,reason,phase:label,keySha256:createHash('sha256').update(k).digest('hex')});return k;
 }
 function assertKnown(blocks,scalars){const k=stateKey(blocks,scalars);assert(raw.has(k),'Unregistered world observed; no post-use registration');return k;}
 function modelScalars(m,change={}){return Object.fromEntries(DYNAMIC.map(k=>[k,Object.hasOwn(change,k)?change[k]:m[k]]));}
 function assertStatic(m){assertStaticStarDomain(m.level);assert.equal(fixed(m.level),staticHash,'Model static board changed');
  for(const k of ['queuedBlocks','shutters','generators','elevators','conveyors','flipDoors','coloredGrids','seams'])assert.equal(m[k].length,0,'Unexpected model mechanism '+k);
  assert.equal(m.pendingExitAnimations.size,0);assert.equal(m.pendingExitFlipDoorIds.size,0);assert.equal(m.timeFreezeSeconds,0);assert.equal(m.remainingSeconds,board.timeSeconds);
  assert.deepEqual(m.gates,m.level.gates.map(g=>({...g,portals:undefined,frozen:g.frozen??0})));
 }
 function scope(fn){
  guard();assert(!active&&!instrumentedPrototypes.has(proto),'Nested/concurrent model instrumentation forbidden');
  assert.deepEqual(Object.getOwnPropertyDescriptors(proto),original,'Original model prototype changed');
  active=true;instrumentedPrototypes.add(proto);const installed=[],restores=[],attached=new WeakSet(),attachedBodies=new WeakSet();
  const hookProperty=(object,name,set)=>{const d=Object.getOwnPropertyDescriptor(object,name);assert(d&&Object.hasOwn(d,'value')&&d.writable&&d.configurable,'Plain writable property required: '+name);let value=d.value;
   Object.defineProperty(object,name,{configurable:d.configurable,enumerable:d.enumerable,get:()=>value,set(next){set(next);value=next;}});
   restores.push(()=>Object.defineProperty(object,name,{...d,value}));
  };
  function attachBody(m,b){if(attachedBodies.has(b))return;attachedBodies.add(b);
   for(const k of ['x','y'])hookProperty(b,k,next=>{guard();operation('set-'+k);admit(m.blocks,modelScalars(m),{id:b.id,[k]:next},'model-'+k);setterWrites++;});
  }
  function attach(m){if(attached.has(m))return;assertStatic(m);assertKnown(m.blocks,modelScalars(m));attached.add(m);if(!models.has(m)){models.add(m);modelCount++;}
   for(const b of m.blocks)attachBody(m,b);
   hookProperty(m,'blocks',next=>{guard();assert(Array.isArray(next));operation('set-blocks');admit(next,modelScalars(m),null,'model-block-removal');for(const b of next)attachBody(m,b);setterWrites++;});
   for(const k of DYNAMIC)hookProperty(m,k,next=>{guard();operation('set-'+k);admit(m.blocks,modelScalars(m,{[k]:next}),null,'model-'+k);setterWrites++;});
  }
  try{
   for(const name of [...OBSERVED_METHODS,...FORBIDDEN_METHODS]){const d=original[name];if(!d)continue;
    const wrapped=function(...args){guard();if(FORBIDDEN_METHODS.includes(name))fail('Unqualified model operation '+name);attach(this);operation(name);assertKnown(this.blocks,modelScalars(this));
     try{return d.value.apply(this,args);}finally{assertStatic(this);assertKnown(this.blocks,modelScalars(this));}
    };Object.defineProperty(proto,name,{...d,value:wrapped});installed.push(name);
   }
   const value=fn();assert(!value?.then,'Synchronous instrumentation only');guard();return value;
  }finally{
   for(const restore of restores.reverse())restore();for(const name of installed.reverse())Object.defineProperty(proto,name,original[name]);
   instrumentedPrototypes.delete(proto);active=false;assert.deepEqual(Object.getOwnPropertyDescriptors(proto),original,'Model prototype restoration failed');
  }
 }
 return{scope,setLabel(next){label=next;},admitInitial(blocks,change=null,reason='creation'){return admit(blocks,initial(),change,reason);},assertInitial(blocks){return assertKnown(blocks,initial());},
  admitInitialForRecord(blocks,change,reason){
   // Pay the matching record inspection before allocating the complete object.
   // A post-allocation budget check must never discard a first full world.
   charge(keyScanCost(blocks.length+Number(!!change?.add)));const k=admit(blocks,initial(),change,reason);recordCredits.set(k,(recordCredits.get(k)??0)+1);recordTicketsIssued++;
  },
  assertPrepaidRecord(blocks){const k=stateKey(blocks,initial(),null,true);assert(raw.has(k)&&(recordCredits.get(k)??0)>0,'Record differs from pre-admitted coordinate fragment');recordCredits.set(k,recordCredits.get(k)-1);recordTicketsConsumed++;},
  visit(blocks,expand){guard();const k=assertKnown(blocks,initial());visits++;if(expand)expanded.add(k);},
  report(){return{version:'labelled-snapshot-before-mutation-v4',definition:'Fixed inventory IDs with explicit ABSENT plus every dynamic snapshot scalar except moves; static board and original body shapes/colours/star predicates strictly bound; intermediate setter states included',maxStates:limit,distinctStates:raw.size,rawFullBoardStates:raw.size,discoveredStates:raw.size,visitedStates:raw.size,exploredStates:expanded.size,graphVisits:visits,admissionCalls:admissions,duplicateAdmissions,modelInstances:modelCount,setterWrites,recordTicketsIssued,recordTicketsConsumed,operations:{...operations},events:[...events],staticBoardSha256:staticHash,inventorySha256:inventoryHash,rawSetSharedAcrossAllModelsAndReplays:true,postUseAdmissions:0,refunds:0,active};}};
}

/** Only synthetic counting fixtures; cannot issue a task/claim authority. */
export function createReverseRawCountingFixture(runtime,level,{limit=10000}={}){
 assert(level.id>=990000&&level.width*level.height<=16&&level.blocks.length<=8,'Tiny synthetic fixture only');assertStaticStarDomain(level);runtime.validateLevel(level);
 let terminal=null,transitions=0;const fail=m=>{terminal??=m;throw Error(terminal);},guard=()=>{if(terminal)throw Error(terminal);};
 const raw=createRawBoardObserver(runtime,level,level.blocks,{limit,guard,fail,charge:n=>{guard();if(transitions+n>10000000)fail('tiny-transitions');transitions+=n;}});
 return{...raw,report(){return{...raw.report(),transitions,terminal};}};
}

/** Private production-scope copy of the reviewed local bodies. The old 8e855
 * and c9ea entry flags remain untouched; this module has its OWN closed scope,
 * authority check, metering wrapper and qualification. Only their unchanged
 * mathematical quote formulae and graph/forward semantics are reused. */
/** Synchronous archival sequencing only; cannot issue construction/model authority.
 * The original object is captured before static/native/geometry validation.
 * The saved creation packet stays PENDING; the terminal validation is separate. */
export function captureValidateStarWorld(level,creation,validation,{capture,inspect,validated,grant}){
 assert.equal(validation.staticValidation,'NOT_RUN');assert.equal(validation.archiveCaptured,false);
 try{
  const saved=capture(level,creation);assert(!saved?.then,'Synchronous archival capture required');validation.archiveCaptured=true;
  assert.equal(levelSha256(level),creation.levelSha256,'Capture hook mutated input');validation.staticValidation='RUNNING';
  const info=inspect(level);assert(!info?.then&&typeof info?.full==='boolean','Synchronous static classification required');
  validation.staticValidation='PASSED';validation.validatedFull=info.full;
  assert.equal(validated(level,{...creation,full:info.full}),true,'History hook must explicitly accept every validated world');
  assert.equal(levelSha256(level),creation.levelSha256,'History hook mutated input');
  const accepted=grant(level);assert(!accepted?.then,'Synchronous authority grant required');validation.authorityGranted=true;return level;
 }catch(error){if(validation.staticValidation==='RUNNING')validation.staticValidation='FAILED';validation.error=error.message;throw error;}
}
function createPrivateModelSession(runtime,{limits={},now=Date.now,onFormedWorld,onValidatedWorld=()=>true,board,inventory}={}){
 assert.equal(runtime.toolchainSha256,CORE);
 assert.equal(typeof onFormedWorld,'function','An explicit synchronous history/formed-world hook is required');
 const base=createClosedReservationMeter({limits,now}),known=new WeakMap(),assets={},formed=[],coordinateReservations=[];
 const work={transitions:0,micro:0};let terminal=null,closed=false,dualReplayStarted=false,activeQuote=null;
 const counters={localAudits:0,canonicalReplays:0,independentReplays:0,heldSearches:0,heldPositions:0,heldDirections:0,graphVisits:0};
 const fail=reason=>{terminal??=reason;throw Error(terminal);};
 function guard(){if(terminal)throw Error(terminal);if(closed)throw Error('qualification-session-closed');try{base.guard();}catch(e){terminal=e.message;throw e;}}
 function room(q){
  guard();const r=base.report();
  // q.worlds is the unchanged copy/API envelope, not a count of distinct boards.
  if(r.reserved.transitions+work.transitions+(q.transitions??0)>r.budget.maxTransitions)fail('qualification-transitions-exhausted');
  if(r.reserved.micro+work.micro+(q.micro??0)>r.budget.maxMicroStates)fail('qualification-micro-exhausted');
 }
 const raw=createRawBoardObserver(runtime,board,inventory,{guard,fail,limit:base.report().budget.maxStates,charge:n=>coordinateWork(n,0,'raw-key-read')});
 function run(q,fn){room(q);activeQuote=q;raw.setLabel(q.kind);try{return base.runSync(q,()=>raw.scope(fn));}catch(e){terminal??=e.message;throw e;}finally{activeQuote=null;}}
 function coordinateWork(transitions,micro,label){
  integer(transitions);integer(micro);room({transitions,micro});work.transitions+=transitions;work.micro+=micro;
  coordinateReservations.push({label,transitions,micro});
 }
 function native(block){
  assert(block&&Object.keys(block).every(k=>['id','x','y','shape','color','star','frozen','layers'].includes(k)),'Static star body metadata required');
  assert(block.star===undefined||typeof block.star==='boolean','Static Boolean star predicate required');
  assert(block.frozen===undefined||block.frozen===0,'Plain body ice is excluded');
  assert(!block.layers||(block.layers.length===1&&block.layers[0]===block.color),'Plain body layers are excluded');
  assert(Array.isArray(block.shape)&&block.shape.length&&block.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),'Finite body shape required');
  assert(Math.min(...block.shape.map(p=>p[0]))===0&&Math.min(...block.shape.map(p=>p[1]))===0,'Normalized q0 anchor required');
  assert(block.shape.length===width(block)*height(block),'Only solid native rectangles are qualified');
  const match=runtime.matchFormalBlockShape(block.shape,'native-only');assert(match?.quarterTurns===0,'q0 native shape required');
  const asset=runtime.GAME_ART.gameplay.formalBlocks[block.color]?.solid?.[match.shapeId];assert(asset,'Actual native colour artwork required');
  const file=path.resolve('public',asset);assets[file]??=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(block.star){const overlay=runtime.GAME_ART.gameplay.starBlocks?.[match.shapeId];assert(overlay,'Actual q0 star overlay required');const f=path.resolve('public',overlay);assets[f]??=createHash('sha256').update(fs.readFileSync(f)).digest('hex');}
 }
 function inspect(level){
  assertStaticStarDomain(level);runtime.validateLevel(level);assert(level.gates.length<=10,'Finite static portal bound');
  level.blocks.forEach(native);const allowed=playable(level),occupied=new Set();
  for(const b of level.blocks)for(const p of cells(b)){assert(allowed.has(key(p))&&!occupied.has(key(p)),'World overlap/outside mask');occupied.add(key(p));}
  return{full:occupied.size===allowed.size,area:allowed.size};
 }
 function record(level,label){
  assert(activeQuote,'World creation must occur inside an admitted reservation');raw.assertPrepaidRecord(level.blocks);const sha=levelSha256(level);
  const creation={label,levelSha256:sha,full:level.blocks.length===0?false:null,staticValidation:'PENDING',reservedWorlds:raw.report().distinctStates,ordinal:formed.length,quote:copy(activeQuote)};
  const validation={staticValidation:'NOT_RUN',archiveCaptured:false,validatedFull:null,authorityGranted:false,error:null};
  formed.push({label,levelSha256:sha,full:creation.full,validation});
  return captureValidateStarWorld(level,creation,validation,{capture:onFormedWorld,inspect,validated:onValidatedWorld,grant(l){guard();freeze(l);known.set(l,sha);}});
 }
 function owned(level){assert(known.has(level),'Graph/model received an unreserved world');assert.equal(levelSha256(level),known.get(level),'Reserved world changed');guard();}
 function materialize(label,blocks,builder,change=null){assert.equal(typeof builder,'function');return run(quoteReverseWorldCreation(label),()=>{raw.admitInitialForRecord(blocks,change,label);return record(builder(),label);});}

 // Narrow copy of auditPlainForwardDrag. Only local clock guards and the
 // external pre-reservation were added. Its model/first-contact semantics,
 // inventory comparison and one-commit checks remain the original ones.
 function forwardBody(level,drag,expectedBodies){
  const result={valid:false,searchPerformed:false,lowerBoundClaimed:false,naturalTimeValidated:false};counters.localAudits++;
  try{
   assertStaticStarDomain(level);runtime.validateLevel(level);guard();
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
   raw.admitInitialForRecord(before.blocks,{id:blockId,x:reversePath.at(-1)[0],y:reversePath.at(-1)[1]},'inverse-parking-endpoint');
   const after=copy(before);Object.assign(after.blocks.find(b=>b.id===blockId),{x:reversePath.at(-1)[0],y:reversePath.at(-1)[1]});record(after,'inverse-parking-endpoint');
   return{...forwardBody(after,drag,before.blocks),reverseAfterLevel:after,forwardDrag:drag};
  });
 }
 function insertion(before,body,reversePath,exitSide){
  owned(before);assert(!before.blocks.some(b=>b.id===body.id),'Insertion reused a live body ID');
  const drag={blockId:body.id,path:inverseUnitPath([body.x,body.y],reversePath),exitSide},end=reversePath.at(-1)??[body.x,body.y];
  return run(quoteReverseInverseEdge('insertion',drag),()=>{
   raw.admitInitialForRecord(before.blocks,{add:body,x:end[0],y:end[1]},'inverse-insertion-endpoint');
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
  coordinateWork(4*n*Math.max(1,eligibleStarGates(level,body).length),n,'held-anchor-box-all-eligible-gates');counters.heldSearches++;
  const allowed=playable(level),occupied=new Set(level.blocks.filter(b=>b.id!==body.id).flatMap(cells).map(key));
  const gates=eligibleStarGates(level,body);assert(gates.length,'No eligible static gate');
  const valid=(x,y)=>body.shape.every(([dx,dy])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy])));
  assert(valid(...start),'Held start is outside/occupied');const queue=[start],parents=new Map([[key(start),null]]);counters.heldPositions++;
  for(let at=0;at<queue.length;at++){
   guard();const p=queue[at];for(const[dx,dy]of dirs){counters.heldDirections++;const next=[p[0]+dx,p[1]+dy],k=key(next);
    if(parents.has(k)||!valid(...next)||gates.some(g=>atGate({...body,x:next[0],y:next[1]},g,level)))continue;
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
   raw.setLabel('canonical-complete-replay');
   counters.canonicalReplays++;const canonical=runtime.replayRevisedRoute(level,drags);guard();
   assert(canonical.valid&&canonical.complete,'Canonical complete U failed');
   raw.setLabel('independent-complete-replay');
   counters.independentReplays++;const independent=independentReplay(runtime,level,drags);guard();
   assert(independent.valid&&independent.complete&&!independent.failed,'Independent complete U failed');
   assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,drags.length);assert.equal(independent.effectiveDrags,drags.length);
   assert.equal(canonical.clearEvents,inventory.length);assert.equal(independent.clearEvents,inventory.length);assert.equal(independent.remainingBodies,0);assert.equal(independent.remainingQueued,0);
   return{ok:true,status:'COMPLETE_REVERSE_WITNESS_AWAITING_ORIGINAL_LOWER',accepted:false,formalReady:false,level,drags,levelSha256:levelSha256(level),routeSha256:routeSha256(drags),U:independent.nonClearingDrags,L:null,canonical,independent};
  });closed=true;return result;
 }
 function report(){const r=base.report(),a=raw.report();return{scope:REVERSE_METERED_SCOPE,budgetAccountingVersion:'labelled-snapshot-before-mutation-v4',rawAccounting:a,originalMeter:r,reserved:{worlds:a.distinctStates,transitions:r.reserved.transitions+work.transitions,micro:r.reserved.micro+work.micro},activeReservation:activeQuote?.kind??null,terminal:terminal??r.terminal,closed,dualReplayStarted,coordinateReservations:[...coordinateReservations],formed:[...formed],counters:{...counters},assetBindings:{...assets}};}
 function parkingCandidates(level,ids,portals,maximum){owned(level);return rankStaticParkingCandidates(level,ids,portals,maximum,coordinateWork).selectedIds;}
 return{materialize,forward,parking,insertion,heldReach,parkingCandidates,finish,report,chargeCoordinateWork:coordinateWork,visit(level,expanded){owned(level);raw.visit(level.blocks,expanded);counters.graphVisits++;}};
}

// Private reservation executor. Quotes cannot be passed by a task caller.
// Same pre-add/guard/no-refund arithmetic as c9ea; no qualification flag is
// reused to authorize production. Authority is checked at the only entry below.
function createClosedReservationMeter({limits,now}){
 const budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,...limits},reserved={worlds:0,transitions:0,micro:0},reservations=[];
 let terminal=null,active=false,latest=now();const started=latest;
 const fail=m=>{terminal??=m;throw Error(terminal);};
 const guard=()=>{if(terminal)throw Error(terminal);const t=now();if(!Number.isSafeInteger(t)||t<latest)fail('reservation-clock-invalid');latest=t;if(t-started>=budget.maxMilliseconds)fail('reservation-deadline');};
 return{guard,runSync(q,fn){guard();assert(!active);for(const [field,cap]of [['worlds','maxTransitions'],['transitions','maxTransitions'],['micro','maxMicroStates']]){assert(Number.isSafeInteger(q[field])&&q[field]>=0);if(reserved[field]+q[field]>budget[cap])fail('reservation-'+field+'-exhausted');}
  for(const k of Object.keys(reserved))reserved[k]+=q[k];reservations.push(q);active=true;try{const value=fn();assert(!value?.then,'Synchronous creation only');guard();return value;}catch(e){terminal??=e.message;throw e;}finally{active=false;}},
 report(){return{budget,reserved:{...reserved},worldsMeaning:'unchanged conservative verification-copy/API envelope; separate from raw distinct-state cap',verificationOperationsMaximum:budget.maxTransitions,reservations:[...reservations],elapsedMilliseconds:latest-started,active,terminal};}};
}

export const REVERSE_STOCK_FACTORY_VERSION='star-double-exit-known-suffix-new-prefix-first-full-reverse-v6';
const MAXIMUM={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
const STRATEGY={name:'finite-cross-colour-access-v1',missingWindow:2,maximumTargetsPerBody:4,parkingBodiesMaximum:2,parkingTargetsPerBody:2,maxParkingDrags:48,queuePolicy:'fill-first-diverse'};
const sessions=new WeakMap();
function pureNative(rt,b,bindings){
 assert(Object.keys(b).every(k=>['id','color','shape','star'].includes(k)));assert(b.star===undefined||typeof b.star==='boolean');assert(typeof b.id==='string'&&b.id.length);const atom={...b,x:0,y:0};
 assert(Array.isArray(b.shape)&&b.shape.length&&b.shape.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));
 assert.equal(new Set(b.shape.map(key)).size,width(atom)*height(atom));assert(Math.min(...b.shape.map(p=>p[0]))===0&&Math.min(...b.shape.map(p=>p[1]))===0);assert(b.shape.length<=6);
 const match=rt.matchFormalBlockShape(b.shape,'native-only');assert(match?.quarterTurns===0);const file=rt.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[match.shapeId];assert(file,'Missing actual q0 colour artwork');
 const full=path.resolve('public',file);bindings[full]=createHash('sha256').update(fs.readFileSync(full)).digest('hex');
 if(b.star){const overlay=rt.GAME_ART.gameplay.starBlocks?.[match.shapeId];assert(overlay,'Actual q0 star overlay required');const f=path.resolve('public',overlay);bindings[f]=createHash('sha256').update(fs.readFileSync(f)).digest('hex');}return atom;
}
/** No full candidate or model is constructed. All input choices are data, and
 * the only production strategy is the finite internal coordinate policy. */
export function makeReverseStockRecipe(runtime,source,declaration,{qualificationOnly=false}={}){
 if(!qualificationOnly)assertReverseStarProductionReady();
 assertStaticStarStockIds(declaration);
 assert.equal(runtime.toolchainSha256,CORE);assert.equal(source.id,declaration.sourceLevelId);assert([1,2,3].includes(declaration.targetDifficulty));
 assert(!Object.hasOwn(declaration,'level')&&!Object.hasOwn(declaration,'builder'));assert.deepEqual(declaration.strategy,STRATEGY);
 const bindings={},inventory=declaration.inventory.map(b=>pureNative(runtime,b,bindings));assert.equal(new Set(inventory.map(b=>b.id)).size,inventory.length);
 assert.deepEqual([...declaration.insertionOrder].sort(),inventory.map(b=>b.id).sort());assert.deepEqual([...declaration.parkingBodyIds].sort(),inventory.map(b=>b.id).sort());
 const board={id:source.id,name:'Daily reverse stock '+declaration.recipeId,width:source.width,height:source.height,timeSeconds:source.timeSeconds??180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',gates:copy(declaration.gates)};
 assert(!(source.seams??[]).length);for(const k of ['playable','blocked'])if(source[k]!==undefined)board[k]=copy(source[k]);
 assert.equal(inventory.reduce((n,b)=>n+b.shape.length,0),playable(board).size,'Full fixed stock area must equal actual normal mask');
 assert.equal(new Set(board.gates.map(g=>g.id)).size,board.gates.length);
 if(!qualificationOnly){assert.equal(source.id,200);assert.equal(source.width,6);assert.equal(source.height,8);assert.equal(declaration.targetDifficulty,1);assertSource200StarStock(inventory,board.gates);}else assert(source.id>=990000&&source.width*source.height<=16&&inventory.length<=8,'Synthetic small stock only');
 for(const g of board.gates){assert(Object.keys(g).every(k=>['id','side','offset','size','color','star'].includes(k)));assert(['top','right','bottom','left'].includes(g.side));assert(Number.isSafeInteger(g.offset)&&g.offset>=0&&Number.isSafeInteger(g.size)&&g.size>0);assert(g.offset+g.size<=((g.side==='top'||g.side==='bottom')?board.width:board.height));}
 for(const g of board.gates.filter(g=>g.star)){const file=runtime.GAME_ART.gameplay.starGates?.[['top','bottom'].includes(g.side)?'horizontal':'vertical']?.[g.size];assert(file,'Actual star gate art required');const f=path.resolve('public',file);bindings[f]=createHash('sha256').update(fs.readFileSync(f)).digest('hex');}
 for(const b of inventory)assert(eligibleStarGates(board,b).some(g=>(['top','bottom'].includes(g.side)?width(b):height(b))<=g.size),'Fixed body needs eligible fitting portal');
 const budget={...MAXIMUM,...declaration.upperBudget};for(const [k,v]of Object.entries(budget))assert(Object.hasOwn(MAXIMUM,k)&&Number.isSafeInteger(v)&&v>0&&v<=MAXIMUM[k]);
 const toy=declaration.qualificationFixture??null;assert(toy===null||qualificationOnly&&toy==='eight-colour-cycle-one-parking','No authored operation schedule in production');
 assert(declaration.suffixBlueprint?.version==='stored-star-final-clear-suffix-blueprint-v1');
 if(!qualificationOnly)assert(declaration.starDesignDeclaration&&typeof declaration.starDesignDeclaration.path==='string'&&/^[a-f0-9]{64}$/.test(declaration.starDesignDeclaration.sha256),'Bound design descriptor required');
 const recipe={version:REVERSE_STOCK_FACTORY_VERSION,starDesignDeclaration:copy(declaration.starDesignDeclaration??null),suffixBlueprint:copy(declaration.suffixBlueprint),qualificationOnly,recipeId:declaration.recipeId,sourceLevelId:source.id,sourceMaskSha256:levelSha256({width:board.width,height:board.height,playable:source.playable??null,blocked:source.blocked??null,seams:source.seams??null}),board,inventory,insertionOrder:copy(declaration.insertionOrder),parkingBodyIds:copy(declaration.parkingBodyIds),strategy:copy(STRATEGY),targetDifficulty:declaration.targetDifficulty,floor:declaration.targetDifficulty===1?16:declaration.targetDifficulty===2?21:31,upper:declaration.targetDifficulty===1?20:declaration.targetDifficulty===2?30:null,budget,maximumFootprintSimilarity:0.65,qualificationFixture:toy,assetBindings:bindings,maximumCompletePhysicalInputs:1};
 return freeze({...recipe,recipeSha256:levelSha256(recipe)});
}
const ownDistance=(b,g,p,l)=>g.side==='top'?p[1]:g.side==='bottom'?l.height-height(b)-p[1]:g.side==='left'?p[0]:l.width-width(b)-p[0];
export function eligibleStarGates(level,body){return level.gates.filter(g=>g.color===body.color&&(!body.star||g.star===true));}
export function coordinateStarPortals(level,body){const points=[];for(const g of eligibleStarGates(level,body))for(let y=0;y<=level.height-height(body);y++)for(let x=0;x<=level.width-width(body);x++)if(atGate({...body,x,y},g,level))points.push({position:[x,y],gateId:g.id,side:g.side});return points;}
const overlaps=(a,b)=>a.some(p=>b.some(q=>key(p)===key(q)));
const toySteps=[['insertion','q-red',[0,1]],['insertion','q-blue',[0,0]],['insertion','q-orange',[1,0]],['parking','q-red',[1,1]],['insertion','q-purple',[0,1]],['insertion','q-green',[2,0]],['insertion','q-yellow',[3,0]],['insertion','q-pink',[2,1]],['insertion','q-cyan',[3,1]]];

/** Only the task module can issue the opaque authority. No approval callback,
 * arbitrary LevelSpec builder, coordinate schedule or mutable plan is exposed. */
export function beginReverseStockConstruction(runtime,recipe,authority){
 assertReverseStarProductionReady();
 const auth=takeReverseConstructionAuthority(authority,runtime,recipe);recipe=auth.recipe;
 const formed=[],owned=new WeakSet(),stats={},rawTrace={portalScans:0,coordinateScoreEvaluations:0};let firstFull=null,session,phase='constructing';
 // Portal/ranking metadata has an a priori bound: at most maxStates graph nodes,
 // fixed missing/parking windows, finite anchor boxes and fixed inventory scans.
 const area=recipe.board.width*recipe.board.height,n=recipe.inventory.length;
 const maxPortals=Math.max(...recipe.inventory.map(b=>eligibleStarGates(recipe.board,b).reduce((n,g)=>n+Math.max(0,g.size-(['top','bottom'].includes(g.side)?width(b):height(b))+1),0)));
 // Each option scan/ranking pose is one logical coordinate proposal. Scalar
 // overlap comparisons score that already-proposed pose, not extra worlds,
 // moves or held states. Reserve all portal anchors plus every ranking pose.
 const coordinateReservation=n*area*recipe.board.gates.length+recipe.budget.maxStates*(recipe.strategy.missingWindow*maxPortals*(area+1)+recipe.strategy.parkingBodiesMaximum*area);
 assert(coordinateReservation<recipe.budget.maxTransitions,'Finite coordinate allowance leaves no transition room');
 const historyState={...auth.state,fullWorlds:auth.comparisonView?.fullWorlds??auth.state.fullWorlds};
 const pool=auth.comparisonView?.nearPools??auth.state.nearPools;
 const onFormedWorld=(level,info)=>{
  formed.push({level,info:{...info},ordinal:formed.length});auth.persistFormedWorld(level,info);return true;
 };
 const onValidatedWorld=(level,info)=>{
  assert.equal(formed.at(-1).level,level);assert.equal(formed.at(-1).info.ordinal,info.ordinal);
  if(!info.full){owned.add(level);return true;}assert(!firstFull,'Only the FIRST complete physical input is allowed');firstFull={level,levelSha256:info.levelSha256};
  assertFreshPlanHistoryInput(historyState,level,{sourceLevelId:recipe.sourceLevelId,reference:auth.reference??null,failedParent:auth.failedParent??null});
  const maxima={};for(const [kind,rows]of Object.entries(pool)){maxima[kind]=0;for(const w of rows)maxima[kind]=Math.max(maxima[kind],compareLayouts(level,w.level).footprintSimilarity);}
  maxima.source=auth.source.blocks?.length?compareLayouts(level,auth.source).footprintSimilarity:0;
  if(auth.referenceLevel)maxima.reference=compareLayouts(level,auth.referenceLevel).footprintSimilarity;
  firstFull.similarity=maxima;assert(Object.values(maxima).every(v=>v<=recipe.maximumFootprintSimilarity),'First complete stock near-rejected; recipe terminates');owned.add(level);return true;
 };
 session=createPrivateModelSession(runtime,{board:recipe.board,inventory:recipe.inventory,limits:{...recipe.budget,maxTransitions:recipe.budget.maxTransitions-coordinateReservation},now:auth.now,onFormedWorld,onValidatedWorld});
 const report=()=>({phase,formed,stats:{...stats},session:session.report(),coordinateReservation,coordinateWork:{...rawTrace},totalReserved:{...session.report().reserved,transitions:session.report().reserved.transitions+coordinateReservation},firstComplete:firstFull?{levelSha256:firstFull.levelSha256,similarity:firstFull.similarity??null}:null,completePhysicalInputs:Number(!!firstFull),completePhysicalInputsFullyClassified:session.report().formed.every(x=>x.validation.staticValidation==='PASSED'),unvalidatedWorlds:session.report().formed.filter(x=>x.validation.staticValidation!=='PASSED').length,exactWorldVisitCountClaimed:true});
 const cap=()=>{assert(++rawTrace.portalScans<=coordinateReservation,'Coordinate allowance exhausted');};
 const portalsById=new Map(recipe.inventory.map(body=>[body.id,coordinateStarPortals(recipe.board,body)]));
 const ops=node=>{const out=[];for(let n=node;n?.operation;n=n.parent)out.push(n.operation);return out.reverse();};
 const step=node=>recipe.qualificationFixture?toySteps[ops(node).length]:null;
 function targetOrder(level,body,positions){const own=eligibleStarGates(level,body),charge=(t,m,label)=>session.chargeCoordinateWork(t,m,label),penalty=prepareMissingPortalPenalty({level,inventory:recipe.inventory,insertingBody:body,charge});return positions.map(p=>{cap();rawTrace.coordinateScoreEvaluations++;
   const footprint=body.shape.map(([x,y])=>[p[0]+x,p[1]+y]);let cross=0;for(const other of recipe.inventory)if(other.color!==body.color)for(const portal of portalsById.get(other.id))if(overlaps(footprint,other.shape.map(([x,y])=>[portal.position[0]+x,portal.position[1]+y])))cross++;
   return{p,key:[Number(own.some(g=>atGate({...body,x:p[0],y:p[1]},g,level))),penalty.scoreAt(p),-cross,-Math.min(...own.map(g=>ownDistance(body,g,p,level))),p[1],p[0]]};}).sort((a,b)=>compareMissingPortalTargetKeys(a.key,b.key,charge)).map(x=>x.p);}
 try{
  const initial=session.materialize('empty-normal-mask',[],()=>({...copy(recipe.board),blocks:[]}));
  const seed=restoreStoredStarSuffixSeed(session,initial,recipe.suffixBlueprint);assert(!firstFull,'Suffix seed cannot be a full candidate');stats.knownSuffixInverseInsertions=seed.operations.length;stats.knownSuffixSeedArea=recipe.suffixBlueprint.retainedArea;
  const result=runReverseInterleavedGraph({initialLevel:seed.level,initialOperations:seed.operations,inventory:recipe.inventory,queuePolicy:recipe.strategy.queuePolicy,layoutScore:()=>0,maxParkingDrags:recipe.strategy.maxParkingDrags,stats,
   charge(level,expanded=false){assert(owned.has(level),'Unreserved graph world');session.visit(level,expanded);return levelSha256(level);},
   insertionOptions(level,body,node){if(firstFull)return[];const expected=step(node);if(expected&&(expected[0]!=='insertion'||expected[1]!==body.id))return[];
    const missing=recipe.insertionOrder.filter(id=>!level.blocks.some(b=>b.id===id));if(!expected&&!missing.slice(0,recipe.strategy.missingWindow).includes(body.id))return[];
    const occupied=new Set(level.blocks.flatMap(cells).map(key)),out=[];
    for(const choice of portalsById.get(body.id)){const start=choice.position;cap();if(!body.shape.every(([x,y])=>playable(level).has(key([start[0]+x,start[1]+y]))&&!occupied.has(key([start[0]+x,start[1]+y]))))continue;
     const atom={...body,x:start[0],y:start[1]},portal=session.materialize('insertion-portal',level.blocks,()=>({...level,blocks:[...level.blocks,atom]}),{add:atom}),gate=level.gates.find(g=>g.id===choice.gateId);assert(gate&&gate.side===choice.side);
     if(firstFull){assert.equal(firstFull.level,portal);const operation={kind:'insertion',body:atom,reversePath:[],exitSide:gate.side,forwardDrag:{blockId:body.id,path:[],exitSide:gate.side}};
      firstFull.pendingLast={before:level,operation};return[{level:portal,operation}];}
     const reach=session.heldReach(level,body,start),targets=expected?reach.positions.filter(p=>key(p)===key(expected[2])):targetOrder(level,body,reach.positions).slice(0,recipe.strategy.maximumTargetsPerBody);
     for(const target of targets){const reversePath=reach.pathTo(target),audit=session.insertion(level,atom,reversePath,gate.side);if(audit.valid)out.push({level:audit.reverseAfterLevel,operation:{kind:'insertion',body:atom,reversePath,exitSide:gate.side,forwardDrag:audit.forwardDrag}});}
    }return out;
   },
   parkingOptions(level,node){if(firstFull)return[];const expected=step(node);if(expected&&expected[0]!=='parking')return[];const out=[];
    const next=recipe.inventory.find(b=>!level.blocks.some(x=>x.id===b.id)),portals=next?portalsById.get(next.id).map(p=>next.shape.map(([x,y])=>[x+p.position[0],y+p.position[1]])):[];
    const ids=expected?[expected[1]]:session.parkingCandidates(level,recipe.parkingBodyIds,portals,recipe.strategy.parkingBodiesMaximum);
    for(const id of ids){const body=level.blocks.find(b=>b.id===id);if(eligibleStarGates(level,body).some(g=>atGate(body,g,level)))continue;
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

/** One saved tiny-route seed qualification; no production authority. */
export function runStoredSuffixTinyQualification(runtime,reference,{cutAfterDrag,maxStates=10000}={}){
 assert(reference.level.id>=990000&&reference.level.width*reference.level.height<=16&&reference.level.blocks.length<=8);
 const original=reference.level,retained=new Set(reference.drags.slice(cutAfterDrag).map(d=>d.blockId));
 const inventory=original.blocks.map(({id,color,shape,star})=>({id:retained.has(id)?id:'new-'+id,color,shape:copy(shape),star:star??false}));
 const blueprint=compileStoredStarSuffixBlueprint(reference,{cutAfterDrag,gates:original.gates,inventory,qualificationOnly:true});
 const {blocks,...board}=original,formed=[];const session=createPrivateModelSession(runtime,{board,inventory,limits:{maxStates},onFormedWorld:(l,i)=>{formed.push({level:l,info:i});return true;}});
 let terminal=null,seed=null,rawBeforeGraph=null,graphStats={};
 try{const empty=session.materialize('empty-normal-mask',[],()=>({...copy(board),blocks:[]}));seed=restoreStoredStarSuffixSeed(session,empty,blueprint);rawBeforeGraph=session.report().rawAccounting.distinctStates;
  // Exercise the original scheduler entry only: no alternatives, domains or
  // complete candidate. Its charges share the seed's unchanged session.
  const done=runReverseInterleavedGraph({initialLevel:seed.level,initialOperations:seed.operations,inventory,stats:graphStats,
   charge(level,expanded=false){session.visit(level,expanded);return levelSha256(level);},insertionOptions:()=>[],parkingOptions:()=>[],goal:()=>{throw Error('Tiny seed cannot be full');}});assert.equal(done,null);
 }
 catch(e){terminal=e.message;}
 return{terminal,blueprint,seed:seed?{level:seed.level,operations:seed.operations}:null,rawBeforeGraph,graphStats,formed,accounting:session.report(),newSearches:0,fullWorlds:formed.filter(x=>x.info.full).length};
}

/** Local synthetic API exercises the SAME metered forward/held/dual bodies.
 * It cannot mint a production capability, access history or accept source200.
 * Tests are deliberately not run at module import. */
export function runStarSuffixGestureQualification(runtime,level,{kind='forward',drags=[],heldBodyId,start,limits={}}={}){
 assert(level.id>=990000&&level.width*level.height<=16&&level.blocks.length<=8,'Synthetic <=16-cell fixture only');
 assert(['forward','dual','held'].includes(kind));assertStaticStarDomain(level);runtime.validateLevel(level);
 const {blocks,...board}=level,inventory=blocks.map(({x,y,...b})=>copy(b)),formed=[];
 const session=createPrivateModelSession(runtime,{board,inventory,limits,onFormedWorld:(l,info)=>{formed.push({level:l,info});return true;}});
 let outcome=null,terminal=null;
 try{
  const initial=session.materialize('synthetic-star-original',blocks,()=>copy(level),null);
  // Initial fixture allocation must pre-admit its entire fixed labelled state.
  if(kind==='held'){const body=initial.blocks.find(b=>b.id===heldBodyId);assert(body);const reach=session.heldReach(initial,body,start??[body.x,body.y]);outcome={positions:reach.positions};}
  else if(kind==='dual')outcome=session.finish(initial,drags,inventory);
  else{assert.equal(drags.length,1);outcome=session.forward(initial,drags[0]);}
 }catch(e){terminal=e.message;}
 return{kind,outcome,terminal,formed,accounting:session.report(),productionQualified:false};
}
