import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {nativeRouteShapeCatalogue,createRouteConstrainedGeometry,createInitialCoverageSupport,
 materializeReservedRouteWorld,SOURCE18_REFERENCE,SOURCE18_AXES,SOURCE18_GATE_ICE,SOURCE18_BOMBS,
 INHERITED_DOMAIN_COST,SELF} from './route-constrained-source18-bomb-stock-v1.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {parkingIceReplayQuote} from './parking-ice-region-stock.mjs';

const out=process.env.SOURCE18_BOMB_FACTORY_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'),checks=[],fileBindings={};
const save=async(name,value)=>{const p=path.join(out,name);await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});fileBindings[p]=hash(await fs.readFile(p));};
// Import only immutable artwork/shape data. No PuzzleModel constructor, source
// level compilation, solver, route replay, ledger or production history read.
const artBundle=await build({stdin:{contents:"export {GAME_ART} from './src/game/artManifest.ts'; export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const art=await import('data:text/javascript;base64,'+Buffer.from(artBundle.outputFiles[0].text).toString('base64'));
const catalogue=nativeRouteShapeCatalogue(art);Object.assign(fileBindings,catalogue.assetBindings);
for(const f of Object.keys(artBundle.metafile.inputs).filter(f=>f!=='<stdin>'))fileBindings[f]=hash(await fs.readFile(f));
const fixture=()=>({level:{id:997991,name:'Two-body synthetic coordinate fixture',difficulty:'hard',reward:0,timeSeconds:120,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'a',x:0,y:0,shape:[[0,0],[0,1]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'}],
 gates:[{id:'ga',side:'left',offset:0,size:2,color:'red'},{id:'gb',side:'right',offset:0,size:2,color:'blue',frozen:1}]},
 drags:[{blockId:'a',path:[],exitSide:'left'},{blockId:'b',path:[],exitSide:'right'}]});
const recipe=()=>({palettePermutation:{red:'blue',blue:'red'},minimumChangedBodies:2,minimumChangedArea:4,maximumCompleteInputs:1,candidateOrder:'changed-first-y-x-shape',axes:{},gateIce:{},bombs:{a:15,b:25}});
const fourFixture=()=>({level:{id:997992,name:'Four-body synthetic coordinate fixture',difficulty:'hard',reward:0,timeSeconds:120,mechanismRules:'revised-2026-09-27-v1.5',width:4,height:2,
 blocks:['red','blue','green','yellow'].map((color,x)=>({id:['a','b','c','d'][x],x,y:0,shape:[[0,0],[0,1]],color})),
 gates:[{id:'ga',side:'left',offset:0,size:2,color:'red'},{id:'gb',side:'top',offset:1,size:3,color:'blue'},{id:'gc',side:'bottom',offset:0,size:3,color:'green'},{id:'gd',side:'right',offset:0,size:2,color:'yellow'}]},
 drags:[{blockId:'a',path:[],exitSide:'left'},{blockId:'d',path:[],exitSide:'right'},{blockId:'b',path:[],exitSide:'top'},{blockId:'c',path:[],exitSide:'bottom'}]});
const fourRecipe=()=>({palettePermutation:{red:'blue',blue:'green',green:'yellow',yellow:'red'},minimumChangedBodies:2,minimumChangedArea:4,maximumCompleteInputs:1,candidateOrder:'changed-first-y-x-shape',axes:{},gateIce:{gb:1,gc:2},bombs:{b:15,c:25}});
const qualifiedOptions={qualificationOnly:true};
const coverageDebits=r=>r.calls+r.selectedMaskReads+r.optionMaskReads+r.cellChecks;
const assertAccounting=q=>{const a=q.accounting,c=a.coverageSupport,k=a.compatibilityCache;assert.equal(a.partialAssignmentCount,q.partialAssignments.length);assert(q.partialAssignments.every(t=>t.length<(q.assignment?.blocks.length??4)));assert(a.coordinateTransitions>=coverageDebits(c)+k.calls+k.maskFrameChecks);assert.equal(c.fullWorlds,0);assert.equal(a.newModelCalls,0);assert.equal(a.publicClaimsStarted,0);assert(a.fullAssignments<=1);assert.equal(a.completeWorldReservations,a.fullAssignments);};

test('necessary initial-cover pruning is conservative for every tiny mask fixture and accurately debited',async()=>{
 let paid=0;const support=createInitialCoverageSupport(()=>{paid++;});
 const option=mask=>({masks:[BigInt(mask)]});
 const impossible=support.check([option(1)],[{i:1,viable:[option(2)]}],3);assert.equal(impossible,false);assert.equal(support.report().pruned,1);
 const sets=[];
 // All domains of two distinct one-cell options on four cells, for two
 // labelled remaining bodies and either no occupied cell or one fixed cell.
 // These are mask-only tuples, never Level objects or game-model states.
 for(const occupied of [0,1,2,4,8])for(let a=1;a<16;a++)for(let b=1;b<16;b++){
  const domains=[a,b].map(bits=>[1,2,4,8].filter(m=>bits&m).map(option));
  const feasible=[];for(const x of domains[0])for(const y of domains[1])if(!(BigInt(occupied)&(x.masks[0]|y.masks[0]))&&!(x.masks[0]&y.masks[0])&&(BigInt(occupied)|x.masks[0]|y.masks[0])===15n)feasible.push([String(x.masks[0]),String(y.masks[0])]);
  const selected=occupied?[option(occupied)]:[],remaining=domains.map((viable,i)=>({i,viable}));const allowed=support.check(selected,remaining,4);
  if(!allowed)assert.equal(feasible.length,0,'Necessary coverage prune must not remove any complete tiling');
  sets.push({occupied,a,b,feasible:feasible.length,allowed});
 }
 // Nontrivial exact-cover completion sets on three cells: pruning and the
 // naive enumerator must enumerate the same labelled tuples from every prefix.
 let comparisons=0;for(let a=1;a<8;a++)for(let b=1;b<8;b++)for(let c=1;c<8;c++){
  const domains=[a,b,c].map(bits=>[1,2,4].filter(m=>bits&m).map(option));
  const enumerate=prune=>{const result=[];function walk(selected){const i=selected.length;if(i===3){if(selected.reduce((m,o)=>m|o.masks[0],0n)===7n)result.push(selected.map(o=>String(o.masks[0])).join(','));return;}
   const mask=selected.reduce((m,o)=>m|o.masks[0],0n);const remaining=domains.slice(i).map((d,j)=>({i:i+j,viable:d.filter(o=>!(o.masks[0]&mask))}));if(remaining.some(r=>!r.viable.length))return;if(prune&&!support.check(selected,remaining,3))return;for(const o of remaining[0].viable)walk([...selected,o]);}
   walk([]);return result;};assert.deepEqual(enumerate(true),enumerate(false));comparisons++;
 }
 assert.equal(paid,coverageDebits(support.report()));let capPaid=0;const capped=createInitialCoverageSupport(()=>{assert(capPaid<3,'synthetic-cap');capPaid++;});assert.throws(()=>capped.check([], [{viable:[option(1),option(2),option(4)]}],3),/synthetic-cap/);assert.equal(capPaid,3);assert.equal(coverageDebits(capped.report()),3);
 await save('coverage-necessary-condition.json',{cases:sets.length,completeSetComparisons:comparisons,accounting:support.report(),paid,capAccounting:capped.report(),impossiblePruned:true,modelCalls:0});checks.push({name:'coverage-necessary-condition-and-naive-complete-set-equivalence',passed:true,cases:sets.length,completeSetComparisons:comparisons});
});

test('full tiny coordinate CSP with/without coverage retains the same first full and puts bombs/ice in that first object',async()=>{
 const rows=[];for(const [make,makeRecipe]of [[fixture,recipe],[fourFixture,fourRecipe]]){
  const enabled=createRouteConstrainedGeometry(make(),makeRecipe(),catalogue,qualifiedOptions),plain=createRouteConstrainedGeometry(make(),makeRecipe(),catalogue,{...qualifiedOptions,qualificationOptimizations:{coverageSupport:false}});
  const q=enabled.solve(),p=plain.solve();assert(q.found,JSON.stringify({status:q.status,reason:q.reason,accounting:q.accounting}));assert(p.found);assert.deepEqual(q.assignment,p.assignment);assert.equal(q.accounting.fullAssignments,1);assert(q.shapeAndColourInventoryPassed);assert.equal(q.assignment.levelSha256,levelSha256(q.assignment.level));assertAccounting(q);assertAccounting(p);assert.equal(q.assignment.level.blocks,q.assignment.blocks);assert.throws(()=>enabled.solve(),/One fixed recipe/);assert.throws(()=>plain.solve(),/One fixed recipe/);
  assert.deepEqual(Object.fromEntries(q.assignment.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>[b.id,b.timedBombSeconds])),makeRecipe().bombs);
  for(const[id,n]of Object.entries(makeRecipe().gateIce))assert.equal(q.assignment.gates.find(g=>g.id===id).frozen,n);
  rows.push({q,p});
 }
 assert.equal(rows[1].q.assignment.blocks.filter(b=>b.timedBombSeconds).length,2);assert.equal(rows[1].q.assignment.gates.filter(g=>g.frozen).length,2);
 await save('first-full-pruning-equivalence.json',{rows,syntheticOnly:true,realSource18Constructions:0,modelCalls:0});checks.push({name:'first-full-equivalence-with-preexisting-bombs-and-ice',passed:true,syntheticCspCalls:4});
});

test('no-full node/transition/micro/deadline terminals reserve no world and reject a second solve',async()=>{
 const cases=[];for(const budget of [{maxNodes:1},{maxTransitions:1},{maxMicroStates:1}]){const s=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,budget});const q=s.solve();assert.equal(q.found,false);assert.equal(q.assignment,null);assert.equal(q.accounting.fullAssignments,0);assert.equal(q.accounting.completeWorldReservations,0);assert.throws(()=>s.solve());cases.push(q);}
 let clock=0;const s=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,budget:{maxMilliseconds:10},now:()=>clock});clock=10;const q=s.solve();assert.equal(q.found,false);assert.equal(q.reason,'coordinate-deadline');assert.equal(q.accounting.fullAssignments,0);assert.throws(()=>s.solve());cases.push(q);
 await save('no-full-terminals.json',{cases});checks.push({name:'bounded-no-full-terminal-no-reentry',passed:true,syntheticCspCalls:cases.length});
});

test('post-full clock failure keeps complete identity and cannot start another recipe leaf',async()=>{
 let calls=0;const good=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,now:()=>{calls++;return 0;},budget:{maxMilliseconds:10}});const baseline=good.solve();assert(baseline.found);const finalCall=calls;let n=0;
 const late=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,now:()=>++n>=finalCall?10:0,budget:{maxMilliseconds:10}}),q=late.solve();assert.equal(q.status,'COORDINATE_CONSTRUCTION_TERMINAL');assert.equal(q.reason,'coordinate-deadline');assert(q.found&&q.assignment);assert.deepEqual(q.assignment,baseline.assignment);assert.equal(q.accounting.fullAssignments,1);assert.equal(q.accounting.completeWorldReservations,1);assert.throws(()=>late.solve());assert.throws(()=>late.reserveStaticAudit());
 await save('post-full-deadline.json',{baseline,q,finalCall});checks.push({name:'post-full-terminal-preserves-paid-object',passed:true,syntheticCspCalls:2});
});

test('the first complete assembler cannot create a pre-bomb intermediate object or debit twice',async()=>{
 const tracks=['a','b','c'].map(id=>({id})),selected=new Map(tracks.map((t,i)=>[i,{x:i,y:0,shape:[[0,0]],color:['red','blue','green'][i],offset:[0,0]}]));const gates=[{id:'gb',color:'blue',side:'right',offset:0,size:1,frozen:1},{id:'gc',color:'green',side:'bottom',offset:0,size:1,frozen:2}],bombs={a:15,c:25},l={id:997993,width:3,height:1,blocks:[],gates:[]};
 assert.throws(()=>materializeReservedRouteWorld(l,tracks,selected,{},gates,[],{fullAssignments:0,completeWorldReservations:0},bombs));
 const q=materializeReservedRouteWorld(l,tracks,selected,{},gates,[],{fullAssignments:1,completeWorldReservations:1},bombs);assert.equal(q.blocks.filter(b=>b.timedBombSeconds).length,2);assert.deepEqual(q.level.gates.map(g=>g.frozen),[1,2]);bombs.a=99;gates[0].frozen=99;assert.equal(q.blocks[0].timedBombSeconds,15);assert.equal(q.level.gates[0].frozen,1);
 assert.throws(()=>materializeReservedRouteWorld(l,tracks,selected,{},gates,[],{fullAssignments:2,completeWorldReservations:2},bombs));await save('precharged-assembly.json',{q,syntheticOnly:true,solvabilityClaim:false});checks.push({name:'precharged-combined-object-assembly',passed:true});
});

test('reservation requires explicit timed quote, charges once, rejects overflow and expired external wait',async()=>{
 const s=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,qualifiedOptions),q=s.solve();assert(q.found);assert.throws(()=>s.reserveDualReplay(),/Explicit timed/);const base=parkingIceReplayQuote(q.assignment.drags),quote={worlds:base.worlds+100,transitions:base.transitions+100,micro:base.micro,version:'source18-bomb-controlled-dual-envelope-v1',exactCountClaimed:false,syntheticChargeOnly:true};
 s.reserveStaticAudit();assert.deepEqual(s.reserveDualReplay(quote),quote);assert.equal(s.report().completeWorldReservations,1+16+quote.worlds);assert.deepEqual(s.report().replayReservations,quote);assert.throws(()=>s.reserveDualReplay(quote));
 for(const alter of [x=>x.version='unclocked',x=>x.worlds=0,x=>x.transitions=NaN,x=>x.micro=-1,x=>x.exactCountClaimed=true]){const x=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,qualifiedOptions);assert(x.solve().found);const bad=structuredClone(quote);alter(bad);assert.throws(()=>x.reserveDualReplay(bad));assert.equal(x.report().replayReservations.worlds,0);}
 const limited=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,budget:{maxStates:1}});assert(limited.solve().found);assert.throws(()=>limited.reserveDualReplay(quote),/world-cap/);assert.equal(limited.report().completeWorldReservations,1);
 let clock=0;const late=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{...qualifiedOptions,now:()=>clock,budget:{maxMilliseconds:10}});assert(late.solve().found);clock=10;assert.throws(()=>late.reserveDualReplay(quote),/deadline/);assert.equal(late.report().replayReservations.worlds,0);
 await save('timed-quote-reservations.json',{accounting:s.report(),limited:limited.report(),expired:late.report(),quote,syntheticOnly:true,replayCalls:0});checks.push({name:'timed-quote-prepayment-and-terminal-caps',passed:true,syntheticCspCalls:8,newReplays:0});
});

test('production parameters are pinned but no production domains are enumerated',async()=>{
 const raw=await fs.readFile(SOURCE18_REFERENCE.path);assert.equal(hash(raw),SOURCE18_REFERENCE.sha256);fileBindings[SOURCE18_REFERENCE.path]=hash(raw);const ref=JSON.parse(raw),cs=ref.level.gates.map(g=>g.color).sort(),r={palettePermutation:Object.fromEntries(cs.map((c,i)=>[c,cs[(i+2)%cs.length]])),minimumChangedBodies:7,minimumChangedArea:20,maximumCompleteInputs:1,candidateOrder:'changed-first-y-x-shape',axes:SOURCE18_AXES,gateIce:SOURCE18_GATE_ICE,bombs:SOURCE18_BOMBS,targetSlot:'daily-mechanisms-bomb-120-d1-06'};
 const s=createRouteConstrainedGeometry(ref,r,catalogue);assert.deepEqual(s.report().inheritedDomainCost,INHERITED_DOMAIN_COST);assert.equal(s.report().coordinateTransitions,0);assert.equal(s.report().singleBodyPoses,0);assert.equal(s.report().cspNodes,0);assert.equal(s.report().fullAssignments,0);assert.equal(s.report().coverageSupport.calls,0);
 assert.throws(()=>createRouteConstrainedGeometry(ref,r,catalogue,qualifiedOptions),/tiny synthetic/);assert.throws(()=>createRouteConstrainedGeometry(ref,r,catalogue,{qualificationOptimizations:{coverageSupport:false}}));assert.throws(()=>createRouteConstrainedGeometry(ref,r,catalogue,{now:()=>0}));
 for(const alter of [x=>x.bombs['v3-18-6867074-b2']=16,x=>delete x.gateIce['v3-g-green'],x=>x.minimumChangedBodies=8,x=>x.minimumChangedArea=21,x=>x.targetSlot='other']){const bad=structuredClone(r);alter(bad);assert.throws(()=>createRouteConstrainedGeometry(ref,bad,catalogue));}
 const invalid=recipe();invalid.bombs={missing:15};assert.throws(()=>createRouteConstrainedGeometry(fixture(),invalid,catalogue,qualifiedOptions));
 await save('production-metadata-only.json',{recipe:r,accounting:s.report(),realDomainEnumerations:0,newModels:0,newSearches:0});checks.push({name:'production-pins-and-no-real-qualification-bypass',passed:true,realDomainEnumerations:0});
});

test.after(async()=>{
 const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(closure.metafile.inputs))toolBindings[f]=hash(await fs.readFile(f));Object.assign(fileBindings,toolBindings);
 const testFile='tools/daily-challenge/formal-v4/route-constrained-source18-bomb-stock-v1.test.mjs';fileBindings[testFile]=hash(await fs.readFile(testFile));
 await save('report.json',{status:checks.length===7?'SOURCE18_BOMB_FACTORY_TINY_PASS':'SOURCE18_BOMB_FACTORY_TINY_INCOMPLETE',checks,toolBindings,fileBindings:{...fileBindings},newRealConstructions:0,realDomainEnumerations:0,newRealCspCalls:0,newModels:0,newReplays:0,newLowerSearches:0,publicClaimsStarted:0,syntheticOnly:true,productionQualified:false});
});
