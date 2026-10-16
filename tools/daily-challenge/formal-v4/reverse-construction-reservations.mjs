import assert from 'node:assert/strict';

export const REVERSE_RESERVATION_VERSION='reverse-precreation-reservation-metadata-prototype-v1';
export const REVERSE_RESERVATION_SCOPE='synthetic-metadata-only-not-production-qualified';
const LIMITS=Object.freeze({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const quotes=new WeakSet();
const integer=(n,label,min=0)=>{assert(Number.isSafeInteger(n)&&n>=min,`Invalid ${label}`);return n;};
const sum=(...values)=>integer(values.reduce((n,v)=>n+v,0),'reservation sum');
function quote(kind,worlds,transitions,micro,metadata={}){
 const q=Object.freeze({version:REVERSE_RESERVATION_VERSION,kind,worlds:integer(worlds,'worlds'),transitions:integer(transitions,'transitions'),micro:integer(micro,'micro'),...metadata});
 quotes.add(q);return q;
}
function gesture(drag){
 assert(drag&&typeof drag.blockId==='string'&&drag.blockId.length>0&&Array.isArray(drag.path),'Finite drag metadata required');
 assert(Object.keys(drag).every(k=>['blockId','path','exitSide'].includes(k)),'Unknown drag metadata');
 assert(drag.path.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),'Unit coordinate metadata required');
 if(drag.exitSide!==undefined)assert(['top','right','bottom','left'].includes(drag.exitSide),'Invalid exit side');
 return{p:drag.path.length,e:Number(drag.exitSide!==undefined)};
}

/** No LevelSpec is accepted or created here. A completed colour assignment,
 * portal world or endpoint has to reserve BEFORE its allocating expression.
 * Rejected branches and repeated copies are deliberately not refunded. */
export function quoteReverseWorldCreation(label,count=1){
 assert(typeof label==='string'&&label.length>0);integer(count,'world count',1);
 return quote('world-creation',count,count,0,{label});
}

/** Bound for the PLAIN, unclocked auditPlainForwardDrag body only.
 * Observed source-call upper bound: 8+2p+2e materialized/mutated worlds,
 * including input clone, fresh model, start, before/after snapshots,
 * beginAction's snapshot, up to p+1 canonicalExit snapshots, p moves,
 * exit and commit. We reserve the strictly larger 12+3p+4e envelope.
 * Transitions here are conservative logical API/coordinate operations;
 * held poses remain separately charged, never represented as raw Set visits.
 * No runtime invocation or source-pin qualification is performed by this file.
 */
export function quoteReverseForwardDrag(drag){
 const {p,e}=gesture(drag),n=sum(12,3*p,4*e);
 return quote('plain-forward-drag',n,n,sum(p,1),{unitSteps:p,exits:e});
}

/** The proposed NEW inverse wrapper reserves once, then calls its private
 * copied forward-audit body without a second reservation. Old graph and old
 * core are unchanged. A separately constructed portal is NOT included here.
 * Two extra worlds cover the input clone and proposed inverse endpoint. */
export function quoteReverseInverseEdge(kind,drag){
 assert(['insertion','parking'].includes(kind));const q=quoteReverseForwardDrag(drag);
 assert.equal(Boolean(drag.exitSide),kind==='insertion','Inverse edge and forward exit must agree');
 if(kind==='parking')assert(drag.path.length>0,'Parking requires movement');
 return quote(`inverse-${kind}`,sum(q.worlds,2),sum(q.transitions,1),q.micro,{unitSteps:q.unitSteps,exits:q.exits});
}

/** Exactly ONE canonical + ONE independent complete replay, ordinary static
 * plain domain, no timeSchedule/autonomous mechanism. Source-call bound is
 * <=7+10D+3P+4E; the larger 12+16D+4P+6E also reserves repeated snapshots.
 * A wrapper must reserve before calling either unchanged replay function.
 * Extra static model creation, final object copies, and local audits are NOT
 * hidden in this quote; callers reserve those separately. No fresh L included.
 */
export function quoteReverseCompleteWitness(drags){
 assert(Array.isArray(drags)&&drags.length>0,'Nonempty complete route metadata required');
 let p=0,e=0;for(const d of drags){const q=gesture(d);p=sum(p,q.p);e=sum(e,q.e);}
 const n=sum(12,16*drags.length,4*p,6*e);
 return quote('single-complete-dual-replay',n,n,sum(2,2*p,2*drags.length),{drags:drags.length,unitSteps:p,exits:e});
}

/** Pure prototype: explicit qualificationOnly is mandatory. Callback callers
 * will eventually be narrow pinned helper bodies, NOT arbitrary production
 * functions. This module cannot certify that a callback obeys its quote.
 * No ledger/identity/packing/model/search API is imported or provided. */
export function createReverseReservationMeter({limits={},now=Date.now,qualificationOnly=false}={}){
 assert.equal(qualificationOnly,true,'This is a synthetic-only reservation prototype');assert.equal(typeof now,'function');
 assert(Object.keys(limits).every(k=>Object.hasOwn(LIMITS,k)),'Unknown budget dimension');
 const budget=Object.fromEntries(Object.entries(LIMITS).map(([k,max])=>{
  const value=limits[k]??max;integer(value,k,1);assert(value<=max,`${k} exceeds existing hard bound`);return[k,value];
 }));
 const started=now();integer(started,'clock');let latest=started,terminal=null,active=false;
 const used={worlds:0,transitions:0,micro:0},reservations=[];
 const stop=reason=>{terminal??=reason;throw Error(terminal);};
 function guard(){
  if(terminal)throw Error(terminal);const t=now();
  if(!Number.isSafeInteger(t)||t<latest)return stop('reservation-clock-invalid');latest=t;
  if(t-started>=budget.maxMilliseconds)return stop('reservation-deadline');
 }
 function reserve(q){
  guard();assert(quotes.has(q),'Use an intact quote issued by this module');
  const next={worlds:sum(used.worlds,q.worlds),transitions:sum(used.transitions,q.transitions),micro:sum(used.micro,q.micro)};
  for(const [field,key]of [['worlds','maxStates'],['transitions','maxTransitions'],['micro','maxMicroStates']])
   if(next[field]>budget[key])return stop(`reservation-${field}-exhausted`);
  Object.assign(used,next);reservations.push(q);return q;
 }
 const report=()=>({version:REVERSE_RESERVATION_VERSION,scope:REVERSE_RESERVATION_SCOPE,qualificationOnly:true,
  budget:{...budget},reserved:{...used},elapsedMilliseconds:latest-started,terminal,active,reservations:[...reservations],
  exactDistinctWorldCountClaimed:false,actualRuntimeReservationCoverageQualified:false,refunds:0});
 async function run(q,callback){
  assert.equal(typeof callback,'function');guard();assert(!active,'Concurrent/nested reservation callbacks are not supported');
  reserve(q);active=true;
  try{const result=await callback();guard();return result;}
  catch(error){terminal??='reservation-callback-threw';throw error;}
  finally{active=false;}
 }
 // Existing runReverseInterleavedGraph and inverse helpers are synchronous.
 // This is the intended entry for their future pinned wrappers; no promise
 // may outlive the budget/deadline check or be returned as a graph edge.
 function runSync(q,callback){
  assert.equal(typeof callback,'function');guard();assert(!active,'Concurrent/nested reservation callbacks are not supported');
  reserve(q);active=true;
  try{const result=callback();assert(!result||typeof result.then!=='function','Synchronous helper returned a promise');guard();return result;}
  catch(error){terminal??='reservation-callback-threw';throw error;}
  finally{active=false;}
 }
 return Object.freeze({reserve,run,runSync,guard,report});
}
