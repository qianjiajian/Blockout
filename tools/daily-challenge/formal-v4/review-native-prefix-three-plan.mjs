import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertNativeRecipePlan} from './construct-native-prefix-recipes.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
const planDescriptor={path:'deliverables/daily-formal-v4-20261008/design/native-prefix-three-plan-01/plan.json',sha256:'e4b6b71836e9c2daee2d7efba4b0601638ac55d3e3e6d4cf74018fca24dcc727'};
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={};
async function read(d){const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);fileBindings[d.path]=d.sha256;return JSON.parse(bytes);}
const plan=await read(planDescriptor);assertNativeRecipePlan(plan);assert.equal(plan.scope,300);
for(const [p,h]of Object.entries(plan.bindings)){assert.equal(sha(await fs.readFile(p)),h,p);fileBindings[p]=h;}
const selected=await read(plan.selectedIndex);assert.equal(selected.files.length,147);assert.deepEqual(plan.selected.map(d=>d.path),selected.files);
const qualification=await read(plan.nativeQualification);assert.equal(qualification.status,'INDEPENDENT_NATIVE_PREFIX_TAIL_V4_PASS');assert.deepEqual(qualification.errors,[]);
for(const [p,h]of Object.entries(qualification.toolBindings)){assert.equal(sha(await fs.readFile(p)),h,p);fileBindings[p]=h;}
const inventory=await read(plan.ledgerInventory);assert.equal(inventory.newWrites,0);
assert.equal(plan.reservedLowBandInputs.length,16);for(const d of plan.reservedLowBandInputs)await read(d);
const completion=await read(plan.lowBandCompletion);assert.equal(completion.results.length,16);
for(const f of plan.failedParents){const request=await read({path:f.requestFile,sha256:f.requestSha256}),result=await read({path:f.resultFile,sha256:f.resultSha256});assert.equal(request.id,f.id);assert.equal(result.accepted,false);}
const runtime=await loadV4Runtime(),recipes=[];
for(const b of plan.blueprints){
 const ref=await read(b.reference);assert.equal(ref.accepted,true);assert.deepEqual(ref.level,b.level);
 assert.equal(levelSha256(ref.level),b.referenceLevelSha256);assert.equal(routeSha256(ref.drags),b.referenceRouteSha256);
 const source=runtime.LEVELS.find(l=>l.id===b.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(source),boardBaselineSha256(ref.level));
 runtime.assertPlainProofDomain(ref.level);runtime.validateLevel(ref.level);
 const a=replayDecorated(runtime,ref.level,ref.drags),r=independentReplay(runtime,ref.level,ref.drags);
 assert(a.valid&&a.complete&&!a.failed&&r.valid&&r.complete&&!r.failed);assert.equal(a.nonClearingDrags,r.nonClearingDrags);
 const ids=new Set(b.region.bodyIds);assert.deepEqual(b.changedBodies,ref.level.blocks.filter(x=>ids.has(x.id)));assert.deepEqual(b.fixedBlocks,ref.level.blocks.filter(x=>!ids.has(x.id)));
 const cells=b.changedBodies.flatMap(absoluteCells),sort=ps=>ps.map(p=>p.join(',')).sort();assert.deepEqual(sort(cells),sort(b.region.cells));
 const legal=new Set(sort(cells)),seen=new Set([cells[0].join(',')]),todo=[cells[0]];
 for(const[x,y]of todo)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(legal.has(p.join(','))&&!seen.has(p.join(','))){seen.add(p.join(','));todo.push(p);}
 assert.equal(seen.size,cells.length);assert(cells.length/boardCells(ref.level).length>=.35);
 for(const body of b.fixedBlocks){const w=1+Math.max(...body.shape.map(p=>p[0])),h=1+Math.max(...body.shape.map(p=>p[1]));assert.equal(body.shape.length,w*h);assert.equal(runtime.matchFormalBlockShape(body.shape,'native-only').quarterTurns,0);}
 assert.deepEqual(b.prefixDrags,ref.drags.slice(0,b.prefixFacts.drags));assert.equal(routeSha256(b.prefixDrags),b.prefixSha256);
 assert(b.prefixDrags.every(d=>!ids.has(d.blockId)));assert.equal(ref.drags.findIndex(d=>ids.has(d.blockId)),b.prefixDrags.length);
 let current=structuredClone(ref.level),parking=0,clears=0;
 for(const d of b.prefixDrags){const next=structuredClone(current),body=next.blocks.find(x=>x.id===d.blockId);assert(body);
  if(d.path.length)Object.assign(body,{x:d.path.at(-1)[0],y:d.path.at(-1)[1]});if(d.exitSide){next.blocks=next.blocks.filter(x=>x.id!==d.blockId);clears++;}else parking++;
  const audited=auditPlainForwardDrag(runtime,current,d,{expectedBodies:next.blocks});assert(audited.valid,audited.error);current=next;
  for(const old of b.changedBodies)assert.deepEqual(current.blocks.find(x=>x.id===old.id),old);
 }
 assert.equal(parking,b.prefixFacts.parking);assert.equal(clears,b.prefixFacts.clears);assert.equal(current.blocks.length,b.prefixFacts.remainingBodies);
 recipes.push({recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,reference:b.reference,referenceU:a.nonClearingDrags,referenceBothModelsComplete:true,
  cut:b.prefixDrags.length,parking,clears,regionArea:cells.length,boardCells:boardCells(source).length,untouchedRegion:true,connectedRegion:true,retainedRectangles:true,newStockClaimed:false});
}
const own='tools/daily-challenge/formal-v4/review-native-prefix-three-plan.mjs';fileBindings[own]=sha(await fs.readFile(own));
const report={status:'NATIVE_PREFIX_ENTRY_PLAN_PRECHECK_PASS',errors:[],plan:planDescriptor,recipeCount:3,recipes,fileBindings,
 metadataTests:{file:'tools/daily-challenge/formal-v4/native-prefix-plan-contract.test.mjs',passed:5,failed:0},
 sharedLedgerInventory:{...plan.ledgerInventory,directories:inventory.entries.length,files:inventory.entries.reduce((n,x)=>n+x.files.length,0),allHistoricalBytesReaudited:false},
 newSearches:0,newConstructions:0,publicLedgerWrites:0,currentRuntimeValidationClaimed:false,formalReady:false,
 reviewerRole:'Driver author precheck; root independent review is still mandatory before construct.'};
const out='deliverables/daily-formal-v4-20261008/proof/native-three-entry-precheck-01/report.json';await fs.mkdir(out.slice(0,out.lastIndexOf('/')),{recursive:true});
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,file:out,sha256:sha(await fs.readFile(out)),recipes,fileBindings:Object.keys(fileBindings).length}));
