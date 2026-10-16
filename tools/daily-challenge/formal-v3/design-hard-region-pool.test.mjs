import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {bodyFootprint,absoluteCells,digest} from './diversity-layout-factory.mjs';
import {buildHardRegionCandidate,chooseConnectedRegion,runHardRegionPool,DEFAULT_HARD_REFERENCES,inspectHardRegionStatic,inheritedVisualExclusions,deriveEarlyChainProtection} from './design-hard-region-pool.mjs';

test('batch limits and duplicate source references reject before creating evidence or solver work',async()=>{
 for(const args of [{label:'../bad'},{maxSearchesPerSource:6},{maxConstructionsPerSource:31},{references:Array(9).fill('x')},
  {newInputQuotaPerSource:11},{newInputQuotaPerSource:10,references:Array(17).fill('x')}])
  await assert.rejects(runHardRegionPool(args),/Invalid finite hard-region batch request/);
 await assert.rejects(runHardRegionPool({label:'hard-region-negative-test',references:[DEFAULT_HARD_REFERENCES[0],DEFAULT_HARD_REFERENCES[0]]}),/one reference per source/);
 assert.equal(fs.existsSync('deliverables/daily-formal-v3-20261008/design/hard-region-negative-test'),false);
});

test('latest prior-index chain retains all five actual visual exclusions',()=>{
 const visual=inheritedVisualExclusions('deliverables/daily-formal-v3-20261008/selection/region-nearband14-selected/index.json');
 assert.equal(visual.excluded.length,5);assert.equal(new Set(visual.excluded.map(e=>e.designSha256)).size,5);
 assert.ok(visual.indices.some(i=>i.path.endsWith('visual-curated-74/index.json')));
 assert.ok(visual.excluded.every(e=>fs.existsSync(e.baseInputFile)&&fs.existsSync(e.reviewFile)));
});

test('large regions are connected unions of whole bodies and preserve 50–65% untouched',async()=>{
 const runtime=await loadBoundedRuntime();
 for(const file of DEFAULT_HARD_REFERENCES){
  const packet=JSON.parse(fs.readFileSync(file)),reference=packet.level,source=runtime.LEVELS.find(l=>l.id===packet.sourceLevelId),before=digest(reference);
  const built=buildHardRegionCandidate(source,reference,runtime,{seed:1});assert.equal(built.ok,true,file);
  const region=chooseConnectedRegion(reference,{seed:1}),cells=new Set(region.cells.map(p=>p.join(','))),seen=new Set([region.cells[0].join(',')]),queue=[region.cells[0]];
  for(const[x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=p.join(',');if(cells.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}}
  assert.equal(seen.size,cells.size);assert.ok(region.ratio>=.35&&region.ratio<=.5);
  const changed=new Set(region.indices),oldForbidden=new Set(reference.blocks.filter((b,i)=>changed.has(i)).map(bodyFootprint));
  for(const[bIndex,b]of reference.blocks.entries())if(!changed.has(bIndex))assert.deepEqual(built.level.blocks.find(q=>q.id===b.id),b);
  assert.ok(built.level.blocks.every(b=>!oldForbidden.has(bodyFootprint(b))));
  assert.equal(built.construction.sourceShapeInventoryChanged,true);assert.equal(built.construction.sourceCellColoursChanged,true);
  assert.ok(built.construction.referenceOrbitFootprintSimilarity<=.65);
  assert.equal(built.staticAudit.valid,true);assert.deepEqual(built.level.gates,reference.gates);assert.equal(digest(reference),before);
 }
});

test('static audit rejects lost coverage, duplicate footprint and rotated unsupported art',async()=>{
 const runtime=await loadBoundedRuntime(),packet=JSON.parse(fs.readFileSync(DEFAULT_HARD_REFERENCES[0])),source=runtime.LEVELS.find(l=>l.id===packet.sourceLevelId);
 const missing=structuredClone(packet.level);missing.blocks.pop();assert.ok(inspectHardRegionStatic(missing,source,runtime).reasons.includes('opening-not-full'));
 const duplicate=structuredClone(packet.level);duplicate.blocks.push({...structuredClone(duplicate.blocks[0]),id:'duplicate'});
 assert.ok(inspectHardRegionStatic(duplicate,source,runtime).reasons.includes('body-overlap'));
 const unsupported=structuredClone(packet.level);unsupported.blocks[0].shape=[[0,0],[0,1],[0,2],[0,3]];
 assert.ok(inspectHardRegionStatic(unsupported,source,runtime).reasons.includes('native-art-missing'));
});

test('legal fixed H4 is retained despite the factory four-colour new-shape filter',async()=>{
 const runtime=await loadBoundedRuntime(),packet=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0180.json')),
  source=runtime.LEVELS.find(l=>l.id===3),results=Array.from({length:8},(_,i)=>buildHardRegionCandidate(source,packet.level,runtime,{seed:i+1})),good=results.find(r=>r.ok);
 assert.ok(good,JSON.stringify(results.map(r=>r.reason)));assert.ok(good.construction.partitionAdapter);assert.equal(good.staticAudit.valid,true);
 const fixedH4=packet.level.blocks.filter(b=>b.shape.length===4&&Math.max(...b.shape.map(p=>p[1]))===0&&good.construction.retainedBodyIds.includes(b.id));
 assert.ok(fixedH4.length);for(const b of fixedH4)assert.deepEqual(good.level.blocks.find(q=>q.id===b.id),b);
 assert.ok(good.construction.retainedAreaRatio>=.5&&good.construction.retainedAreaRatio<=.65);
});

test('early-chain protection is capped, excludes protected bodies, and never reduces required retile area',async()=>{
 const runtime=await loadBoundedRuntime(),packet=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/nearband15-shared/candidate-0198.json')),
  source=runtime.LEVELS.find(l=>l.id===packet.sourceLevelId),plan=deriveEarlyChainProtection(packet.level,packet.drags);
 assert.equal(plan.fullBoardSearchInvocations,0);assert.ok(plan.chain.nonClearingDrags>=3);assert.ok(plan.protectedAreaRatio<=.25);
 const built=Array.from({length:16},(_,i)=>buildHardRegionCandidate(source,packet.level,runtime,{seed:i+1,protectedBodyIds:plan.protectedBodyIds})).find(x=>x.ok);
 assert.ok(built);assert.ok(built.construction.region.ratio>=.35&&built.construction.region.ratio<=.5);
 for(const id of plan.protectedBodyIds)assert.deepEqual(built.level.blocks.find(b=>b.id===id),packet.level.blocks.find(b=>b.id===id));
 assert.equal(chooseConnectedRegion(packet.level,{protectedBodyIds:packet.level.blocks.map(b=>b.id)}),null);
});
