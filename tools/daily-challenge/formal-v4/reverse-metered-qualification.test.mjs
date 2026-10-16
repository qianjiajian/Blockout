import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {createReverseModelQualification,REVERSE_METERED_SCOPE} from './reverse-metered-qualification.mjs';
const runtime=await loadV4Runtime(),evidence=[];
const palette=['red','blue','green','yellow','purple','orange','pink','cyan'];
const base=()=>({id:997650,name:'explicit synthetic reverse qualification only',width:4,height:2,timeSeconds:180,difficulty:'super',reward:0,
 mechanismRules:'revised-2026-09-27-v1.5',gates:palette.map((color,i)=>({id:`q-g-${color}`,color,side:i<4?'top':'bottom',offset:i%4,size:1}))});
const inventory=()=>palette.map(color=>({id:`q-${color}`,color,x:0,y:0,shape:[[0,0]]}));
const full=()=>({...base(),blocks:inventory().map((b,i)=>({...b,x:i%4,y:Math.floor(i/4)}))});
const route=()=>palette.map((color,i)=>({blockId:`q-${color}`,path:[],exitSide:i<4?'top':'bottom'}));
const partial=()=>({id:997651,name:'synthetic held gesture',width:3,height:3,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',color:'red',x:0,y:1,shape:[[0,0]]},{id:'b',color:'blue',x:2,y:2,shape:[[0,0]]}],
 gates:[{id:'q-r',color:'red',side:'top',offset:2,size:1},{id:'q-b',color:'blue',side:'bottom',offset:2,size:1}]});
function tracked({limits,now,history=()=>true,afterCanonical}={}){
 let session;const events={models:0,snapshots:0,canonical:0,modelEvents:[],history:[]};
 const event=kind=>{
  assert(session.report().activeReservation,'Actual toy model action happened outside its prepaid call');
  assert.equal(session.report().originalMeter.active,true);events.modelEvents.push({kind,phase:session.report().activeReservation,reserved:session.report().reserved.worlds});
 };
 class ObservedModel extends runtime.PuzzleModel{
  constructor(...args){event('constructor');events.models++;super(...args);}
  snapshot(){event('snapshot');events.snapshots++;return super.snapshot();}
  moveBlockStep(...args){event('unit-step');return super.moveBlockStep(...args);}
  tryExit(...args){event('exit');return super.tryExit(...args);}
 }
 const rt={...runtime,PuzzleModel:ObservedModel,replayRevisedRoute(level,drags){event('canonical');events.canonical++;const result=runtime.replayRevisedRoute(level,drags);afterCanonical?.();return result;}};
 session=createReverseModelQualification(rt,{qualificationOnly:true,limits,now,onFormedWorld(level,info){
  assert(session.report().activeReservation);events.history.push({...info,modelsBefore:events.models});return history(level,info);
 }});
 return{session,events};
}
function save(name,t,extra={}){evidence.push({name,report:t.session.report(),events:t.events,...extra});}

test('unchanged graph constructs a synthetic eight-colour full inventory with one complete dual U',()=>{
 const t=tracked(),result=t.session.construct({board:base(),inventory:inventory(),insertionOrder:inventory().map(b=>b.id),parkingBodyIds:[],maximumTargetsPerBody:1,maxParkingDrags:0,targetDifficulty:3});
 assert(result.ok,JSON.stringify(result));assert.equal(result.U,0);assert.equal(result.L,null);assert.equal(result.accepted,false);
 assert.equal(result.requiredFloor,31);assert.equal(result.canonical.clearEvents,8);assert.equal(result.independent.remainingBodies,0);
 const q=t.session.report();assert.equal(q.reserved.worlds,341);assert.equal(q.counters.canonicalReplays,1);assert.equal(q.counters.independentReplays,1);
 assert.equal(q.counters.localAudits,8);assert.equal(q.counters.heldSearches,8);assert.equal(q.formed.length,17);
 assert(q.coordinateReservations.filter(x=>x.label==='held-anchor-box').every(x=>x.micro===8&&x.transitions===32));
 assert(q.coordinateReservations.filter(x=>x.label==='portal-anchor-scan').every(x=>x.micro===0&&x.transitions===8));
 assert(q.counters.heldPositions<=q.coordinateReservations.reduce((n,x)=>n+x.micro,0));
 assert(q.counters.heldDirections<=q.coordinateReservations.filter(x=>x.label==='held-anchor-box').reduce((n,x)=>n+x.transitions,0));
 assert(t.events.history.filter(x=>x.full).every(x=>x.modelsBefore===7),'Full identity must be checked before the last insertion model');
 assert.equal(t.events.canonical,1);assert.equal(t.events.models,9);assert(Object.isFrozen(result.level));
 assert.throws(()=>t.session.finish(result.level,result.drags,result.level.blocks),/closed|one-shot/);assert.equal(t.events.canonical,1);
 save('full-graph-eight-colour-q0',t,{result});
});

test('unreserved input and a denied full-world history hook never reach the next model',()=>{
 const unowned=tracked();assert.throws(()=>unowned.session.forward(full(),route()[0]),/unreserved/);assert.equal(unowned.events.models,0);
 const t=tracked({history:(_l,info)=>!info.full});
 const before=t.session.materialize('seven-body-partial',()=>{
  const l=full();l.blocks.pop();return l;
 });
 assert.equal(t.events.models,0);
 assert.throws(()=>t.session.insertion(before,{...inventory()[7],x:3,y:1},[],'bottom'),/History hook/);
 assert.equal(t.events.models,0);assert.equal(t.session.report().reserved.worlds,19);assert(t.events.history.at(-1).full);
 save('pre-model-history-denial',t,{unownedModels:unowned.events.models});
});

test('inverse turns, early contact and narrow apertures preserve the old actual-model semantics',()=>{
 const good=tracked(),l=good.session.materialize('held-partial',partial),before=levelSha256(l);
 const result=good.session.parking(l,'r',[[0,2],[1,2]]);assert(result.valid,JSON.stringify(result));assert.equal(result.nonClearingDrags,1);assert.equal(levelSha256(l),before);
 const bad=tracked(),b=bad.session.materialize('first-contact-partial',()=>{const q=partial();q.gates[0].offset=1;return q;});
 const early=bad.session.parking(b,'r',[[1,1],[1,0],[2,0]]);assert.equal(early.valid,false);assert.match(early.error,/First-contact/);assert(bad.session.report().reserved.worlds>1);
 const wide=tracked(),w=wide.session.materialize('wide-gate-partial',()=>({...partial(),blocks:[],gates:[{id:'q-sq',color:'red',side:'left',offset:1,size:2}]}));
 const square={id:'q-square',color:'red',x:0,y:1,shape:[[0,0],[1,0],[0,1],[1,1]]};
 const inserted=wide.session.insertion(w,square,[[1,1]],'left');assert(inserted.valid,JSON.stringify(inserted));
 const narrow=tracked(),n=narrow.session.materialize('narrow-gate-partial',()=>({...partial(),blocks:[],gates:[{id:'q-sq',color:'red',side:'left',offset:1,size:1}]}));
 const denied=narrow.session.insertion(n,square,[[1,1]],'left');assert.equal(denied.valid,false);
 save('actual-local-gesture-boundaries',good,{result,early,inserted,denied,otherReports:[bad.session.report(),wide.session.report(),narrow.session.report()]});
});

test('world/held budgets are admitted before the next creation or coordinate work and never refunded',()=>{
 let allocations=0;const tooSmall=tracked({limits:{maxStates:1}});
 const initial=tooSmall.session.materialize('empty-toy',()=>({...base(),blocks:[]}));
 assert.throws(()=>tooSmall.session.materialize('overflow-builder',()=>{allocations++;return{...base(),blocks:[]};}),/worlds-exhausted/);assert.equal(allocations,0);
 assert.equal(tooSmall.events.models,0);assert.equal(tooSmall.session.report().reserved.worlds,1);
 for(const limits of [{maxMicroStates:7},{maxTransitions:32}]){
  const t=tracked({limits}),l=t.session.materialize('coordinate-input',()=>({...base(),blocks:[]}));
  assert.throws(()=>t.session.heldReach(l,inventory()[0],[0,0]),/micro-exhausted|transitions-exhausted/);
  assert.equal(t.session.report().counters.heldSearches,0);assert.equal(t.events.models,0);
 }
 const combined=tracked({limits:{maxMicroStates:8}}),p=combined.session.materialize('coordinate-input',()=>({...base(),blocks:[]}));
 combined.session.heldReach(p,inventory()[0],[0,0]);assert.equal(combined.session.report().reserved.micro,8);
 assert.throws(()=>combined.session.insertion(p,inventory()[0],[],'top'),/micro-exhausted/);assert.equal(combined.events.models,0);
 save('preallocation-and-shared-coordinate-caps',tooSmall,{initialSha:levelSha256(initial),combined:combined.session.report()});
});

test('qualification-only plain rectangle scope rejects dynamic fields before any model',()=>{
 assert.throws(()=>createReverseModelQualification(runtime,{onFormedWorld:()=>true}),/production/);
 assert.throws(()=>createReverseModelQualification(runtime,{qualificationOnly:true}),/history/);
 const reasons=[];for(const change of [l=>l.blocks[0].frozen=2,l=>l.blocks[0].movementAxis='horizontal',l=>l.gates[0].star=true,
  l=>{l.blocks=[{id:'q-l',color:'red',x:0,y:0,shape:[[0,0],[0,1],[1,1]]}];},l=>l.blocks[0].color='not-a-native-colour']){
  const t=tracked();assert.throws(()=>t.session.materialize('invalid-domain-toy',()=>{const l=full();change(l);return l;}));assert.equal(t.events.models,0);reasons.push(t.session.report().terminal);
 }
 const held=tracked(),l=held.session.materialize('held-domain-toy',partial);
 assert.throws(()=>held.session.heldReach(l,{...l.blocks[0],movementAxis:'horizontal'},[0,1]),/Plain body metadata/);
 assert.throws(()=>held.session.heldReach(l,{...l.blocks[0],color:'blue'},[0,1]),/live identity/);
 assert.equal(held.session.report().counters.heldSearches,0);assert.equal(held.events.models,0);
 evidence.push({name:'plain-native-domain-only',reasons,newModelInvocations:0});
});

test('complete dual U is prepaid once; insufficient worlds and a late canonical stop before independent replay',()=>{
 const insufficient=tracked({limits:{maxStates:188}}),l=insufficient.session.materialize('provided-toy',full);
 assert.throws(()=>insufficient.session.finish(l,route(),l.blocks),/worlds-exhausted/);assert.equal(insufficient.events.canonical,0);assert.equal(insufficient.events.models,0);
 assert(insufficient.session.report().dualReplayStarted);
 let clock=0;const late=tracked({limits:{maxMilliseconds:30},now:()=>clock,afterCanonical:()=>{clock=30;}}),q=late.session.materialize('late-toy',full);
 assert.throws(()=>late.session.finish(q,route(),q.blocks),/deadline/);assert.equal(late.events.canonical,1);assert.equal(late.events.models,0);
 assert.equal(late.session.report().reserved.worlds,189);assert.equal(late.session.report().counters.independentReplays,0);
 assert.throws(()=>late.session.finish(q,route(),q.blocks),/deadline|one-shot/);assert.equal(late.events.canonical,1);
 save('one-final-dual-U-and-deadline',late,{insufficient:insufficient.session.report()});
});

test.after(async()=>{
 if(!process.env.REVERSE_MODEL_TEST_OUT)return;assert.equal(evidence.length,6);
 const files=['tools/daily-challenge/formal-v4/reverse-metered-qualification.mjs','tools/daily-challenge/formal-v4/reverse-metered-qualification.test.mjs',
  'tools/daily-challenge/formal-v4/reverse-construction-reservations.mjs','tools/daily-challenge/formal-v3/reverse-route-audit.mjs','tools/daily-challenge/formal-v3/design-reverse-interleaved.mjs',
  'tools/daily-challenge/formal-v2/proof-plain.mjs','tools/daily-challenge/formal-v2/proof-scheduled-route.mjs','tools/daily-challenge/formal-v2/contract.mjs','tools/daily-challenge/formal-v4/runtime.mjs','src/core/PuzzleModel.ts','src/core/revisedLevelSearch.ts'];
 const fileBindings={};for(const file of files)fileBindings[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
 const report={status:'REVERSE_METERED_SYNTHETIC_PLAIN_QUALIFICATION_PASS',scope:REVERSE_METERED_SCOPE,qualificationOnly:true,productionQualified:false,tests:6,errors:[],
  proofToolchainSha256:runtime.toolchainSha256,toolBindings:runtime.toolchainBindings,fileBindings,oldSourceFilesChanged:false,newRealCandidateConstructions:0,newRealCandidateSearches:0,newLedgerClaims:0,newLowerSearches:0,
  syntheticModelTestsPerformed:true,realHistoryIdentityHookImplemented:false,actualCampaignInterfaceImplemented:false,finalReplayStrategy:'one-canonical-and-one-independent-no-tail-search',
  reservationMeaning:'Conservative pre-creation reservations including repeated snapshots; never an exact distinct-world count. Coordinate subaccount shares every admission with the unchanged c9ea meter.',
  narrowChanges:['Three local reverse audit bodies keep original model/first-contact semantics; pre-reservation and formed-world hook added before new models.',
   'Pure held coordinate reach uses original rectangle occupancy/portal filter, reserving the anchor box N and 4N directions before creating queue/parents.',
   'Unchanged graph only consumes marked frozen worlds. Portal and proposed endpoints are formed only inside reservations.',
   'New one-shot complete-U gate calls unchanged canonical and independent replay sequentially with deadline checks; no fresh-L or production claim implemented.'],evidence};
 const out=process.env.REVERSE_MODEL_TEST_OUT;await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
