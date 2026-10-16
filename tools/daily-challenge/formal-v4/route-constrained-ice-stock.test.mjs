import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha,PUBLIC_LEDGER} from './low-twenty-io.mjs';
import {SELF,inspectRouteCoordinateTracks,nativeRouteShapeCatalogue,createRouteConstrainedGeometry} from './route-constrained-ice-stock.mjs';

const out=process.env.ROUTE_CONSTRAINED_STOCK_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),checks=[],fileBindings={};let modelCalls=0;
const noModels={...rt,PuzzleModel:class{constructor(){modelCalls++;throw Error('No model authorized');}},replayRevisedRoute(){modelCalls++;throw Error('No replay authorized');}};
const catalogue=nativeRouteShapeCatalogue(noModels);Object.assign(fileBindings,catalogue.assetBindings);
const requestNames=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(x=>x.endsWith('.request.json')).sort(),before=await requestNames();
const fixture=()=>({level:{id:9000001,name:'Coordinate-only synthetic two-body fixture',difficulty:'hard',reward:0,timeSeconds:120,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'a',x:0,y:0,shape:[[0,0],[0,1]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'}],
 gates:[{id:'left',side:'left',offset:0,size:2,color:'red'},{id:'right',side:'right',offset:0,size:2,color:'blue',frozen:1}]},
 drags:[{blockId:'a',path:[],exitSide:'left'},{blockId:'b',path:[],exitSide:'right'}]});
const recipe=()=>({palettePermutation:{red:'blue',blue:'red'},minimumChangedBodies:2,minimumChangedArea:4,maximumCompleteInputs:1,candidateOrder:'changed-first-y-x-shape'});
const save=async(name,value)=>{const f=path.join(out,name);await fs.writeFile(f,JSON.stringify(value,null,2)+'\n',{flag:'wx'});fileBindings[f]=sha(await fs.readFile(f));};

test('synthetic complete retile changes both shapes and preserves all coordinate-route constraints once',async()=>{
 const reference=fixture(),original=levelSha256(reference),session=createRouteConstrainedGeometry(reference,recipe(),catalogue),r=session.solve();
 assert(r.found);assert.equal(r.assignment.changedBodies,2);assert.equal(r.assignment.changedOriginalArea,4);assert(r.assignment.shapeInventoryChanged);
 assert.equal(r.accounting.completeWorldReservations,1);assert.equal(r.accounting.fullAssignments,1);assert.equal(r.referenceParkingCost,0);assert.equal(r.accounting.fullRouteValidated,false);
 assert.deepEqual(r.assignment.gates.map(g=>g.frozen),reference.level.gates.map(g=>g.frozen));assert.deepEqual(r.assignment.blocks.map(b=>b.shape),[[[0,0],[1,0]],[[0,0],[1,0]]]);
 assert.equal(r.assignment.colourInventoryChanged,false,'Two colours each once: permutation does not pass the later colour-multiset gate');assert.equal(r.shapeAndColourInventoryPassed,false);
 assert.throws(()=>session.solve(),/One fixed recipe/);assert.equal(levelSha256(reference),original);assert.equal(modelCalls,0);
 await save('synthetic-first-full.json',r);checks.push({name:'one-full-geometry-with-gate-ice',passed:true,completeWorlds:1,UValidated:false,notProductionCandidate:true});
});

test('closed gate, premature exit, missing cover and unsupported reference domains reject without model',()=>{
 const frozen=fixture();frozen.level.gates[0].frozen=1;const a=createRouteConstrainedGeometry(frozen,recipe(),catalogue).solve();assert.equal(a.found,false);assert.equal(a.accounting.completeWorldReservations,0);
 const early=fixture();early.drags=[{blockId:'a',path:[[1,0]]},{blockId:'a',path:[[0,0]],exitSide:'left'},early.drags[1]];assert.equal(createRouteConstrainedGeometry(early,recipe(),catalogue).solve().found,false);
 for(const mutate of [x=>x.level.blocks.pop(),x=>x.drags[0].path=[[2,0]],x=>x.drags.pop(),x=>x.level.blocks[0].frozen=1,x=>x.level.gates[0].portals=[{side:'left',origin:[0,0],size:2}]]){const f=fixture();mutate(f);assert.throws(()=>inspectRouteCoordinateTracks(f));}
 assert.throws(()=>createRouteConstrainedGeometry(fixture(),recipe(),structuredClone(catalogue)),/actual q0 catalogue/);
 checks.push({name:'gate-contact-and-original-domain-negatives',passed:true,newModelCalls:0});
});

test('one shared finite coordinate meter, no caller aliases, first terminal cannot continue',async()=>{
 const capped=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{budget:{maxTransitions:1}}),a=capped.solve();assert.equal(a.found,false);assert.equal(a.accounting.completeWorldReservations,0);assert(a.accounting.coordinateTransitions<=1);assert.throws(()=>capped.solve());
 let time=0;const deadline=createRouteConstrainedGeometry(fixture(),recipe(),catalogue,{budget:{maxMilliseconds:5},now:()=>time});time=5;const d=deadline.solve();assert.match(d.reason,/deadline/);assert.equal(d.accounting.completeWorldReservations,0);
 const r=recipe(),p=fixture(),stable=createRouteConstrainedGeometry(p,r,catalogue);r.minimumChangedBodies=0;r.palettePermutation.red='red';const s=stable.solve();assert(s.found);assert.equal(s.assignment.blocks[0].color,'blue');
 const changed=fixture(),guard=createRouteConstrainedGeometry(changed,recipe(),catalogue);guard.inspectDomains();changed.drags[0].exitSide='right';assert.match(guard.solve().reason,/route mutated/);
 await save('synthetic-meter.json',{capped:a,deadline:d});checks.push({name:'caps-deadline-terminal-and-aliases',passed:true,newModelCalls:0});
});

test('exact source29 original route metadata reports only three truly moving compatible axes; no real CSP',async()=>{
 const file='deliverables/daily-formal-v4-20261008/selection/merged-116-v2/daily-basic-combined-d3-03.json',bytes=await fs.readFile(file);assert.equal(sha(bytes),'c868e91ad41544b254458274034449b1eb73b3bdbcf04f604c2791acbcd54b59');fileBindings[file]=sha(bytes);
 const reference=JSON.parse(bytes),t=inspectRouteCoordinateTracks(reference),axes=t.tracks.filter(x=>x.axisCompatible).map(x=>({id:x.id.split('-').at(-1),axis:x.axisCompatible,steps:x.unitSteps}));
 assert.deepEqual(axes,[{id:'b7',axis:'vertical',steps:1},{id:'b18',axis:'vertical',steps:8},{id:'b22',axis:'horizontal',steps:8}]);assert.equal(t.parking,38);assert.equal(t.clears,23);assert.equal(t.fullRouteValidated,false);
 await save('source29-existing-route-axis-metadata.json',{reference:{path:file,sha256:sha(bytes)},axes,parking:t.parking,clears:t.clears,newDomainEnumerations:0,newCspCalls:0,newWorlds:0,newReplayCalls:0});
 checks.push({name:'archived-axis-metadata-only',passed:true,newRealCoordinateSearches:0,newModelCalls:0});
});

test.after(async()=>{
 assert.equal(modelCalls,0);assert.deepEqual(await requestNames(),before);const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={...rt.toolchainBindings};
 for(const file of Object.keys(compiled.metafile.inputs))toolBindings[file.replaceAll('\\','/')]=sha(await fs.readFile(file));Object.assign(fileBindings,toolBindings);
 const own='tools/daily-challenge/formal-v4/route-constrained-ice-stock.test.mjs';fileBindings[own]=sha(await fs.readFile(own));
 await save('report.json',{status:checks.length===4?'ROUTE_CONSTRAINED_GEOMETRY_PRIVATE_PASS':'ROUTE_CONSTRAINED_GEOMETRY_PRIVATE_INCOMPLETE',errors:checks.length===4?[]:['Incomplete tests'],checks,toolBindings,fileBindings:{...fileBindings},qualificationOnly:true,productionEntryQualified:false,
  newRealCandidates:0,newRealConstructions:0,newSearches:0,newRealCspCalls:0,newReplayCalls:0,newModelCalls:0,publicClaimsStarted:0,publicRequestCountBefore:before.length,publicRequestCountAfter:before.length,
  limitations:['Synthetic coordinate stocks only; no original-reference replay or actual candidate validation performed.','No authenticated history/owner/public claim is connected.','First full stock is terminal even when shape/colour inventory, history, near, actual U or future fresh L rejects it.','Axis metadata is not an axis-aware lower proof.','No claim that reference trajectory domains permit sufficient new shape freedom on source29.']});
});
