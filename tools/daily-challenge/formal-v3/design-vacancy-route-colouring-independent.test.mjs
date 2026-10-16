import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {fullStockVacancyFixture} from './design-vacancy-route-colouring-fixture.mjs';
import {constructVacancyRouteColouring,constructionMeter,constructZeroParkingTail} from './design-vacancy-route-colouring.mjs';
const tool='tools/daily-challenge/formal-v3/design-vacancy-route-colouring.mjs',hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const loadedSha=hash(tool),runtime=await loadBoundedRuntime(),fixture=fullStockVacancyFixture(runtime),evidence=[];
const qualification={fixtureOnly:true,floor:2,palette:['red','yellow','blue','green']};
const out=process.env.VACANCY_JOINT_AUDIT_OUT??fs.mkdtempSync('deliverables/daily-formal-v3-20261008/proof/vacancy-joint-independent-');
if(process.env.VACANCY_JOINT_AUDIT_OUT)fs.mkdirSync(out);
const call=(geometry=structuredClone(fixture.geometry),options={})=>constructVacancyRouteColouring(runtime,fixture.source,geometry,{seed:1,qualification,...options});
const rejected=r=>{assert.notEqual(r.status,'QUALIFICATION_COMPLETE_U_ONLY');assert.notEqual(r.status,'COMPLETE_U_CONSTRUCTED_LOWER_PENDING');assert.equal(r.U,null);assert.equal(r.accepted,false);};

test('entire constructor returns a four-body actual completion, two parking moves and a two-clear zero-parking tail',()=>{
 const before=levelSha256(fixture),r=call();assert.equal(r.status,'QUALIFICATION_COMPLETE_U_ONLY',r.reason);
 assert.equal(r.U,2);assert.equal(r.drags.length,6);assert.equal(r.replay.clearEvents,4);assert.equal(r.independentReplay.clearEvents,4);
 assert.deepEqual(r.level.blocks.map(b=>b.id).sort(),fixture.originalBodyIds.toSorted());
 const fresh=independentReplay(runtime,r.level,r.drags);assert(fresh.valid&&fresh.complete);assert.equal(fresh.remainingBodies,0);
 assert(fresh.trace.slice(4).every(t=>t.clearDelta===1));assert.equal(fresh.effectiveDrags,6);
 assert.equal(r.accounting.rawFullBoardStates,16);assert.equal(r.accounting.kinds.priorGeometry,5);assert.equal(r.accepted,false);assert.equal(r.proofSearches,0);
 assert.equal(levelSha256(fixture),before);
 evidence.push({test:'full-stock-completion',passed:true,report:r,freshReplay:fresh});
});
test('the prior graph, all prefix worlds, both tail branches and full colour assignment use one cap',()=>{
 for(const cap of [5,6,12,14,15]){const r=call(undefined,{budget:{maxStates:cap}});rejected(r);assert.equal(r.accounting.rawFullBoardStates,cap);assert.match(r.reason,/board-budget/);
  if(cap===15)assert.equal(r.level,null,'The final concrete coloured board must not be formed after its guard fails');}
 for(const v of [NaN,Infinity,0,-1,10001,3.5])assert.throws(()=>call(undefined,{budget:{maxStates:v}}));
 evidence.push({test:'whole-construction-budget-caps',passed:true,caps:[5,6,12,14,15]});
});
test('an exhausted prior graph prevents cloning the first removed-body world',async()=>{
 const native=globalThis.structuredClone;let formed=0;
 globalThis.structuredClone=value=>{if(Array.isArray(value)&&value.length===3&&value.every(b=>b&&['a','b','c'].includes(b.id)))formed++;return native(value);};
 let instrumented;try{instrumented=await import(pathToFileURL(process.cwd()+'/'+tool).href+'?independent-precharge-fixture');}finally{globalThis.structuredClone=native;}
 const r=instrumented.constructVacancyRouteColouring(runtime,fixture.source,fixture.geometry,{seed:1,qualification,budget:{maxStates:5}});
 rejected(r);assert.equal(formed,0);assert.equal(r.accounting.rawFullBoardStates,5);
 evidence.push({test:'guard-before-first-removed-world',passed:true,observedNewRemovedWorldClones:formed});
});
test('exact-floor poses and incomplete early BFS frontier cannot become admissible exit colours',()=>{
 const off=structuredClone(fixture.geometry);off.result.earliest=off.result.earliest.map(ds=>ds.map(d=>d===3?2:d));
 const a=call(off);rejected(a);assert.match(a.reason,/late-target/);
 const partial=structuredClone(fixture.geometry);partial.result.expanded=2;
 const b=call(partial);rejected(b);assert.match(b.reason,/early geometry|frontier/i);
 const cap=structuredClone(fixture.geometry);cap.result.termination='construction-state-budget';
 const c=call(cap);rejected(c);assert.match(c.reason,/early geometry|frontier/i);
 evidence.push({test:'early-floor-and-frontier',passed:true,exactPoseFloor:2,rejectedPoseDepth:2,acceptedFixturePoseDepth:3});
});
test('invalid parent cycles, mismatched masks, mechanisms and absent production elapsed accounting reject before construction',()=>{
 const variants=[];
 const cycle=structuredClone(fixture.geometry);cycle.result.queue[4].parent=4;variants.push(cycle);
 const dimension=structuredClone(fixture.geometry);dimension.sourceBoard.width=5;variants.push(dimension);
 const ice=structuredClone(fixture.geometry);ice.built.blocks[1].frozen=1;variants.push(ice);
 for(const geometry of variants){let r,error;try{r=call(geometry);}catch(e){error=e;}
  assert(error||r.status==='CONSTRUCTION_UNKNOWN');
  if(r){rejected(r);assert.equal(r.accounting.rawFullBoardStates,5);}else assert.equal(error.code,'ERR_ASSERTION');
 }
 assert.throws(()=>constructVacancyRouteColouring(runtime,fixture.source,fixture.geometry),/wall-time/);
 evidence.push({test:'geometry-domain-and-accounting-guards',passed:true});
});
test('initial same-colour adjacency remains forbidden after a neighbor was removed',()=>{
 const bodies=fixture.geometry.built.blocks.slice(1),tailBodies=bodies.filter(b=>b.id==='b'),meter=constructionMeter();
 const r=constructZeroParkingTail(fixture.source,{bodies,tailBodies,
  gates:[{side:'right',offset:1,size:1,color:'blue'}],domains:[[0],[0],[0]],assigned:[0,-1,0],
  adjacency:[[1,2],[0,2],[0,1]],requiredColors:[0]},meter);
 assert.equal(r.solution,null);assert.equal(meter.counts.rawFullBoardStates,1);
 evidence.push({test:'removed-neighbor-colour-constraint',passed:true});
});
test('all selected gate intervals are disjoint and a gate-overlap-only domain is rejected',()=>{
 const good=call();assert.equal(good.status,'QUALIFICATION_COMPLETE_U_ONLY');
 for(let i=0;i<good.level.gates.length;i++)for(let j=i+1;j<good.level.gates.length;j++){
  const a=good.level.gates[i],b=good.level.gates[j];assert(a.side!==b.side||a.offset+a.size<=b.offset||b.offset+b.size<=a.offset);
 }
 const overlap=structuredClone(fixture.geometry);
 // Preserve the real target c at top[2,3) and its valid parent chain.
 // Every aperture reachable by either remaining H2 is top[1,4), which
 // overlaps that target. The rejection must reach the static gate guard,
 // rather than fail earlier while recovering a mismatched target pose.
 overlap.result.apertures=overlap.result.apertures.map(()=>({side:'top',offset:1,size:3}));
 overlap.result.apertures[0]={side:'top',offset:0,size:1};
 overlap.result.apertures[2]={side:'top',offset:2,size:1};
 overlap.result.earliest=overlap.result.earliest.map(ds=>ds.map(()=>null));
 overlap.result.earliest[2][2]=3;
 const r=call(overlap);rejected(r);assert.equal(r.reason,'no-fixed-static-gate-domain');
 assert(r.secondClearEarlyEligible.length>0);assert.equal(r.staticGateLayouts,200);
 evidence.push({test:'gate-overlap-negative',passed:true,reason:r.reason,
  target:r.fixedTarget,eligibleTailBodies:r.secondClearEarlyEligible.length,staticGateLayouts:r.staticGateLayouts});
});
test('q0 registration and real asset bytes are both required, not just a truthy path',()=>{
 const art=structuredClone(runtime.GAME_ART),badRuntime={...runtime,GAME_ART:art};
 for(const value of Object.values(art.gameplay.formalBlocks))for(const k of Object.keys(value.solid??{}))value.solid[k]='assets/nonexistent-joint-qualification.png';
 const bad=constructVacancyRouteColouring(badRuntime,fixture.source,fixture.geometry,{seed:1,qualification});rejected(bad);assert.match(bad.reason,/ENOENT|asset|file/i);
 const rotated={...runtime,matchFormalBlockShape:()=>({shapeId:'H2',quarterTurns:1})};
 const rejectedRotation=constructVacancyRouteColouring(rotated,fixture.source,fixture.geometry,{seed:1,qualification});rejected(rejectedRotation);
 const good=call();assert(Object.keys(good.actualArt.assetBindings).length>=4);
 for(const [p,sha]of Object.entries(good.actualArt.assetBindings))assert.equal(hash('public/'+p),sha);
 evidence.push({test:'actual-native-art-files',passed:true,assetBindings:good.actualArt.assetBindings});
});
test('a prefix or missing final clear is not a full-stock U witness',()=>{
 const r=call();assert.equal(r.status,'QUALIFICATION_COMPLETE_U_ONLY');
 for(const drags of [r.drags.slice(0,4),r.drags.slice(0,-1)]){
  const canonical=runtime.replayRevisedRoute(r.level,drags),independent=independentReplay(runtime,r.level,drags);
  assert.equal(canonical.complete,false);assert.equal(independent.complete,false);
 }
 evidence.push({test:'incomplete-route-negative',passed:true});
});
test.after(()=>{
 assert.equal(hash(tool),loadedSha,'Implementation changed during qualification; do not bind a different source file');
 const self='tools/daily-challenge/formal-v3/design-vacancy-route-colouring-independent.test.mjs';
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({status:evidence.length===9?'INDEPENDENT_CONSTRUCTOR_QUALIFICATION_COMPLETE':'INCOMPLETE',
  evidence,toolBindings:{[tool]:loadedSha,[self]:hash(self)},proofToolchainSha256:runtime.toolchainSha256,
  productionStockConstructed:0,publicLedgerWrites:0,originalLowerSolverCalls:0,formalReady:false,
  firstOriginalLowerAndFailureRedesignLedger:'Requires the separate new-stock runner; not certified by this constructor-only test.'},null,2)+'\n',{flag:'wx'});
});
