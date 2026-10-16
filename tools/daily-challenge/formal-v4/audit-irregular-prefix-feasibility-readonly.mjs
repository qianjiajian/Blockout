import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {IRREGULAR_SHAPES,boardCells,absoluteCells,rectangular} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Inventory/previous-witness metadata only. No model, CSP, construction,
// complete-board search or attempt-ledger mutation is called here.
const own='tools/daily-challenge/formal-v4/audit-irregular-prefix-feasibility-readonly.mjs';
const out=process.argv[2];assert(out,'Fresh report path required');
const bindings={},hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=async(p,h)=>{const b=await fs.readFile(p),d=hash(b);if(h)assert.equal(d,h);if(bindings[p])assert.equal(d,bindings[p]);bindings[p]=d;return b;};
const read=async(p,h)=>JSON.parse(await bytes(p,h));
const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime);
for(const[p,h]of Object.entries({...runtime.toolchainBindings,...environment.bindings}))await bytes(p,h);
for(const p of [own,'src/game/formalBlockShapes.ts','src/game/artManifest.ts','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts',
 'tools/daily-challenge/formal-v4/late-region-gate-aware-factory.mjs','tools/daily-challenge/formal-v4/late-prefix-gate-aware-colouring.mjs',
 'tools/daily-challenge/formal-v4/prefix-tail-native-v4.mjs','tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs',
 'tools/daily-challenge/formal-v3/bounded-proof.mjs','tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',
 'tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','tools/continuation211-colored-witness.mjs'])await bytes(p);
const assetInventory=[];
for(const shape of IRREGULAR_SHAPES){const match=runtime.matchFormalBlockShape(shape,'native-only');assert.equal(match?.quarterTurns,0);
 const colours=[];for(const[color,art]of Object.entries(runtime.GAME_ART.gameplay.formalBlocks)){
  const asset=art.solid?.[match.shapeId];if(!asset){colours.push({color,available:false});continue;}
  const file=path.posix.join('public',asset.replace(/^\//,'')),b=await bytes(file);
  assert(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Actual PNG bytes required');
  colours.push({color,available:true,path:file,sha256:bindings[file],bytes:b.length});
 }
 assetInventory.push({shapeId:match.shapeId,cells:shape,q0:true,area:shape.length,colours});
}
const optionsPath='deliverables/daily-formal-v4-20261008/design/native-tail-eight-proposal-01/reference-options.json',oldOptions=await read(optionsPath);
const latestPath='deliverables/daily-formal-v4-20261008/design/next-native-six-readonly-01/reference-regions.json',latest=await read(latestPath);
const ghostPath='deliverables/daily-formal-v3-20261008/proof/promotion105-relaxed-exit-audit-v1.json',ghost=await read(ghostPath);
function components(blocks){const cells=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),todo=new Set(cells.keys()),areas=[];
 while(todo.size){const first=todo.values().next().value,queue=[cells.get(first)];todo.delete(first);for(const[x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(todo.delete(p.join(',')))queue.push(p);areas.push(queue.length);}
 return areas.sort((a,b)=>b-a);
}
const references=[];
for(const row of oldOptions.rows.filter(r=>r.fullU>=31&&r.nonrectangleIds?.length)){
 const q=await read(row.reference.path,row.reference.sha256);assert(q.accepted);runtime.assertPlainProofDomain(q.level);
 assert.equal(levelSha256(q.level),row.levelSha256);assert.equal(routeSha256(q.drags),row.routeSha256);
 const source=runtime.LEVELS.find(x=>x.id===row.sourceLevelId);assert.equal(boardBaselineSha256(q.level),boardBaselineSha256(source));
 assert(row.fullCanonicalReplay&&row.fullIndependentReplay);
 const touched=new Set();let parking=0,cut=0;for(const d of q.drags){cut++;touched.add(d.blockId);if(!d.exitSide)parking++;if(parking===31)break;}
 const untouched=q.level.blocks.filter(b=>!touched.has(b.id)),areas=components(untouched),area=boardCells(q.level).length;
 const best=[...row.options].sort((a,b)=>b.prefixParking-a.prefixParking||a.region.area-b.region.area)[0];
 const shapeMatches=q.level.blocks.filter(b=>!rectangular(b.shape)).map(b=>({id:b.id,color:b.color,...runtime.matchFormalBlockShape(b.shape,'native-only')}));
 references.push({reference:row.reference,sourceLevelId:row.sourceLevelId,U:row.fullU,existingDualFullReplay:true,newReplayPerformed:false,
  width:source.width,height:source.height,normalMaskEqualsSource:true,playableCells:area,sourceMaskSha256:boardBaselineSha256(source),nonrectangles:shapeMatches,
  first31Parking:{prefixDrags:cut,parking,untouchedArea:untouched.reduce((n,b)=>n+b.shape.length,0),connectedComponentAreas:areas,
   largestConnectedFraction:(areas[0]??0)/area,connected35PercentPossible:(areas[0]??0)/area>=.35},
  bestConnected35PercentOption:best?{cut:best.prefixDrags,parking:best.prefixParking,area:best.region.area,fraction:best.region.fraction,
   regionSha256:best.region.sha256,retainedNonrectangleIds:best.retainedNonrectangleIds}:null,
  eligible31ParkingOptions:row.options.filter(o=>o.prefixParking>=31).length});
}
const existingRectangleReferences=latest.rows.filter(r=>r.options.some(o=>o.prefixParking>=31)).map(r=>({reference:r.reference,sourceLevelId:r.sourceLevelId,U:r.U,
 options:r.options.filter(o=>o.prefixParking>=31).slice(0,3).map(o=>({cut:o.cut,parking:o.prefixParking,area:o.region.area,fraction:o.region.fraction}))}));
const report={status:'READ_ONLY_IRREGULAR_NATIVE_PREFIX_FEASIBILITY',environment,fileBindings:bindings,assetInventory,references,existingRectangleReferences,
 findings:{nativeMaterials:'All listed entries were matched q0 and their actual solid PNG bytes were read; colour availability is explicit per entry.',
  factory:'The current late factory passes irregular:false. The underlying exact-cover routine rejects a fixed irregular footprint unless its shape is in the enabled shape list. This is an implementation restriction, not a proof necessity.',
  colour:'The current gate-aware helper explicitly rejects nonrectangles. Its bounding-box edge/span gateAwareExitPose is qualified only for rectangles; removing the assertion alone is not sufficient. A new helper must use authoritative frontier/portal eligibility, preserve all existing per-colour intersections and prevent actual prefix first-contact changes.',
  upper:'Frozen boundedUpperSearch uses actual PuzzleModel unit moves and canonicalExit, including swept-departure obstacles. Its code has no shape/rectangle restriction; it rejects dynamic held-world generator/lift domains. This is code-level feasibility, not qualification of a new irregular production wrapper.',
  innerPrefix:'The frozen v3 prefixTailPlan rectangle guard is only for plain-joint, not native. The v4 native wrapper deliberately narrows all candidates to rectangles and its tests explicitly reject irregulars.',
  lower:'The plain lower domain accepts normalized irregular single-layer visible bodies. The compiler ignores occupied departure sweep and uses optional exits, yielding a lower-bound superset, never a guaranteed actual U. Existing ghost-exit evidence explains this boundary.',
  evidence:ghost.conclusion,geometry:'Among the seven high-U irregular references in the already fully replayed options corpus, no connected >=35% untouched region survives a prefix of 31 parking gestures. Allowing irregular bodies alone does not solve that shortage.',
  scope:'All reference values describe already accepted original objects. Any changed stock needs true shape+colour changes, full-history exclusion, fresh first-claim U/L and eventual actual visual/Pointer review.'},
 minimumNewWork:[
  'Isolated irregular-aware gate helper: authoritative frontier/portal domain, all fixed same-colour bodies intersection, parking first-contact constraints, actual q0 file binding; no edits to frozen helper.',
  'Isolated late-region factory enabling only a declared q0 subset and preserving fixed irregular bodies; same full coverage, adjacency, region >=35%, shape+colour/ledger exclusions and shared construction budgets.',
  'Isolated native wrapper/static-auditor fork removing only qualified rectangle narrowing, retaining one fixed prefix/native tail, actual dual full U, original guarded plain L31 and <=10000 shared upper worlds.',
  'Private qualification before any stock: L/T/concave footprints, continuous bend/first-contact, blocked sweep negative and clear-after-blocker positive, nonrectangular source mask, original q0 assets, failed identity no retry, construction/prefix/tail terminal guard and true original-level lower.'
 ],newConstructions:0,newColourCspCalls:0,newGameplaySearches:0,newPublicClaims:0,newPhysicalInputs:0,newProvidedRouteReplays:0,formalReady:false,
 limitations:'Read-only feasibility; no new irregular constructor or native domain was qualified. Existing geometry options and full-route evidence were read, not re-solved or modified.'};
for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h);
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:out,sha256:hash(await fs.readFile(out)),shapes:assetInventory.length,assets:assetInventory.reduce((n,r)=>n+r.colours.filter(c=>c.available).length,0),irregularReferences:references.length,irregular31PrefixQualified:references.filter(r=>r.eligible31ParkingOptions).length}));
