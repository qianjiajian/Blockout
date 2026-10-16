import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
const root='deliverables/daily-formal-v3-20261008',out=`${root}/design/mechanism-capacity-review-01`;
assert(!fs.existsSync(out));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bindingPaths=['docs/rules/mechanism-rules-v1.154.0.md','src/core/generatorMountContract.ts','src/core/generatorMouthSpawnGeometry.ts','tools/daily-challenge/formal-v3/mechanism-intensity.mjs','tools/daily-challenge/formal-v3/catalog-contract.mjs','tools/daily-challenge/formal-v3/bounded-proof.mjs','tools/daily-challenge/formal-v3/design-mechanism-capacity-review.mjs'];
const bindings=bindingPaths.map(path=>({path,sha256:sha(path)}));
const bundle=await build({stdin:{contents:'export {auditGeneratorMounts} from "./src/core/generatorMountContract.ts"; export {resolveGeneratorMouthTemplate,validateGeneratorMouthSpawn} from "./src/core/generatorMouthSpawnGeometry.ts";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const native=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const footprint=b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`);
const rect=b=>b.shape.length===(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1);
function staticMounts(level){
 const mounts=[];
 for(const side of ['top','right','bottom','left'])for(let offset=0;offset<(['top','bottom'].includes(side)?level.width:level.height);offset++){
  const g={id:`audit-${side}-${offset}`,side,offset,rimSpan:3,rimMount:'rim',spawn:[0,0],queueBlockIds:[]};
  if(!native.auditGeneratorMounts({...level,generators:[g]}).length)mounts.push(g);
 }
 let states=0,best=[];
 function visit(i,chosen){states++;if(chosen.length+mounts.length-i<=best.length)return;if(i===mounts.length){best=chosen;return;}
  if(!native.auditGeneratorMounts({...level,generators:[...chosen,mounts[i]]}).length)visit(i+1,[...chosen,mounts[i]]);visit(i+1,chosen);
 }
 visit(0,[]);assert.equal(native.auditGeneratorMounts({...level,generators:best}).length,0);
 return {mounts,maximumSimultaneous:best.length,witness:best.map(({side,offset})=>({side,offset})),staticSubsetNodes:states,gameSearchStates:0};
}
function trace(level,drags,complete){
 const bodies=new Map(level.blocks.map(b=>[b.id,{...structuredClone(b),poses:[[b.x,b.y]],firstDrag:null,clearsBeforeFirst:null,exitDrag:null,unitSteps:0}]));
 const live=new Map(level.blocks.map(b=>[b.id,structuredClone(b)])),visits=new Map(),entries=new Map(),departures=new Map(),firstExit=new Map(),frames=[];let clears=0;
 const visit=b=>{for(const k of footprint(b)){if(!visits.has(k))visits.set(k,new Set());visits.get(k).add(b.color);}};
 const frame=(drag,unit,event)=>frames.push({drag,unit,event,clears,remaining:live.size,occupied:new Set([...live.values()].flatMap(footprint))});
 for(const b of live.values())visit(b);frame(0,0,'initial');
 for(const [i,d] of drags.entries()){
  const b=live.get(d.blockId),info=bodies.get(d.blockId);assert(b,'route acts on live inventory');
  if(info.firstDrag===null){info.firstDrag=i+1;info.clearsBeforeFirst=clears;}
  for(const [j,pos]of d.path.entries()){
   assert.equal(Math.abs(pos[0]-b.x)+Math.abs(pos[1]-b.y),1);const before=footprint(b);b.x=pos[0];b.y=pos[1];const next=footprint(b);
   for(const k of next)if(!before.includes(k))entries.set(k,(entries.get(k)??0)+1);for(const k of before)if(!next.includes(k))departures.set(k,(departures.get(k)??0)+1);
   visit(b);info.poses.push(pos);info.unitSteps++;frame(i+1,j+1,'held-unit');
  }
  if(d.exitSide){info.exitDrag=i+1;info.exitSide=d.exitSide;info.clearsBeforeExit=clears;if(!firstExit.has(b.color))firstExit.set(b.color,{color:b.color,drag:i+1,clearsBefore:clears});live.delete(b.id);clears++;frame(i+1,d.path.length,'clear');}
 }
 if(complete)assert.equal(live.size,0);
 const axis=[...bodies.values()].filter(b=>rect(b)&&b.unitSteps>0&&b.exitSide&&((b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide))||(b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide)))).map(b=>({id:b.id,color:b.color,initial:[b.x,b.y],axis:['top','bottom'].includes(b.exitSide)?'vertical':'horizontal',firstDrag:b.firstDrag,clearsBeforeFirst:b.clearsBeforeFirst,exitDrag:b.exitDrag,unitSteps:b.unitSteps}));
 const grid=[...visits].filter(([k,colors])=>colors.size===1&&((entries.get(k)??0)>0||(departures.get(k)??0)>0)).map(([k,colors])=>({cell:k.split(',').map(Number),color:[...colors][0],entries:entries.get(k)??0,departures:departures.get(k)??0}));
 const impossibleAxis=[...bodies.values()].filter(b=>new Set(b.poses.map(p=>p[0])).size>1&&new Set(b.poses.map(p=>p[1])).size>1).map(b=>b.id);
 const late=[...bodies.values()].filter(b=>b.clearsBeforeFirst>=7).map(b=>({id:b.id,color:b.color,firstDrag:b.firstDrag,clearsBeforeFirst:b.clearsBeforeFirst}));
 return {summary:{scope:complete?'complete-known-witness':'verified-prefix-only',drags:drags.length,clears,nonClearingDrags:drags.length-clears,remaining:live.size,
  axisCompatibleCompletedBodies:axis,axisAlreadyImpossibleInThisTrace:impossibleAxis.length,axisUpperBoundBeforeUnseenTail:level.blocks.length-impossibleAxis.length,
  gridCompatibleCells:grid,gridDistinctColors:[...new Set(grid.map(x=>x.color))],gridStrictNewEntryCells:grid.filter(x=>x.entries>0),
  frozenGateAtLeast7:[...firstExit.values()].filter(x=>x.clearsBefore>=7),firstColorExit:[...firstExit.values()],numericIceAtLeast7:late,
  caveat:complete?'Only fixed provided route capacity; not an impossibility theorem for other routes.':'Unseen tail can invalidate every currently compatible axis/grid/machine opportunity. No full U or L.'},frames,bodies};
}
function spawnOpportunities(level,mounts,frames){
 const shapes={S1:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]]},out=[];
 for(const m of mounts){const t=native.resolveGeneratorMouthTemplate(m,level);assert.equal(t.status,'ok');
  for(const [shapeName,shape]of Object.entries(shapes))for(let y=t.templateOrigin[1];y<t.templateOrigin[1]+3;y++)for(let x=t.templateOrigin[0];x<t.templateOrigin[0]+3;x++){
   const p=native.validateGeneratorMouthSpawn(m,[x,y],shape,level);if(p.status!=='ok')continue;
   // A separate current generator design requirement bounds cargo to the inward 3x3 staging zone.
   if(p.footprint.some(([cx,cy])=>cx<t.templateOrigin[0]||cx>=t.templateOrigin[0]+3||cy<t.templateOrigin[1]||cy>=t.templateOrigin[1]+3))continue;
   const first=frames.find(f=>p.footprint.every(c=>!f.occupied.has(c.join(','))));if(first)out.push({side:m.side,offset:m.offset,shapeName,spawn:[x,y],firstEmpty:{drag:first.drag,unit:first.unit,event:first.event,clears:first.clears,remaining:first.remaining},midgameWindow:first.clears>=2&&first.remaining>=2});
  }
 }
 return out;
}
const inputSpecs=[{name:'source118-complete',file:`${root}/design/macro-opening-guarded8-02/candidate-006.json`,complete:true},
 {name:'source198-stock0059-prefix',file:`${root}/design/independent-vacancy-plain-tail-01/candidate-0001.json`,plan:`${root}/design/independent-vacancy-plain-tail-01/plan-0001-before-claim.json`,rawStock:`${root}/design/single-vacancy-independent-03/candidate-0059.json`,complete:false},
 {name:'source198-stock0074-prefix',file:`${root}/design/independent-vacancy-plain-tail-01/candidate-0000.json`,plan:`${root}/design/independent-vacancy-plain-tail-01/plan-0000-before-claim.json`,rawStock:`${root}/design/single-vacancy-independent-03/candidate-0074.json`,complete:false}];
const rows=[];
for(const s of inputSpecs){
 const q=read(s.file),level=q.level,drags=s.complete?q.drags:read(s.plan).prefix.drags;assert.equal(levelSha256(level),q.levelSha256);
 let replays=null;if(s.complete){const canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);assert(canonical.valid&&canonical.complete&&independent.valid&&independent.complete);replays={canonical,independent};}
 const stat=staticMounts(level),route=trace(level,drags,s.complete),opportunities=spawnOpportunities(level,stat.mounts,route.frames);
 rows.push({...s,inputSha256:sha(s.file),planSha256:s.plan?sha(s.plan):null,rawStockSha256:s.rawStock?sha(s.rawStock):null,levelSha256:q.levelSha256,routeSha256:routeSha256(drags),sourceLevelId:q.sourceLevelId,
  width:level.width,height:level.height,cells:level.playable?.length??level.width*level.height,bodies:level.blocks.length,gates:level.gates,
  currentStatus:q.status,currentL:q.L??null,currentU:q.U??null,staticGenerator:stat,routeCapacity:route.summary,
  firstSpawnFootprintOpportunities:opportunities,spawnOpportunityIsNotFullFifoGuarantee:true,replays,
  providedPrefixEvidence:s.complete?null:{prefixAudits:q.upperConstruction.prefixAudits,tailLevelSha256:q.upperConstruction.tailLevelSha256,status:q.upperConstruction.status,reason:q.upperConstruction.reason}});
}
const baselinePath=`${root}/mechanisms/old450-baseline.json`,oldRows=read(baselinePath).rows;
const oldComparison=['generator','axis-block','colored-grid','numeric-ice','frozen-exit'].map(mechanism=>{const selected=oldRows.filter(x=>x.difficulty===3&&x.stageKey.includes(mechanism));return {mechanism,rows:selected.length,counts:selected.map(x=>x.inventory[mechanism].length),examples:selected.slice(0,1).map(x=>({formalId:x.formalId,inventory:x.inventory}))};});
const proposal={status:'DESIGN_RECOMMENDATION_ONLY_NOT_CURRENT_CONTRACT',userFixedQuota:false,unchangedDifficulty:'D3 lower>=31 + finite actual complete U; no proof exception',
 capacityPlan:'Record fixed-mask/fixed-exit static upper bound separately from full-witness compatible active instances. Design latest 1..4 only when latest>=1 really participates; total real mechanisms must exceed matched old baseline. Zero latest capacity requires a genuinely new design, never substitution by auxiliary-only.',
 disclosedEngineeringOption:{latest1:{auxiliaryMinimum:2,totalMinimum:3},latest2:{auxiliaryMinimum:1,totalMinimum:3},latest3:{auxiliaryMinimum:1,totalMinimum:4},latest4:{auxiliaryMinimum:0,totalMinimum:4},note:'These are proposed implementation choices, not newly asserted user rules. Actual old total remains the comparison floor.'},
 concreteIllustration:{base:'source118-complete',notAnotherFinalSlot:true,alreadySelectedAs:'bomb-D3',stage:'axis-block (unlocks50)',latest:[{blockId:'v3-118-7652547-b18',movementAxis:'vertical',knownRouteDrag:41,heldSteps:2}],
  auxiliary:[{gateId:'v3-g-green',frozen:9,firstUseDrag:50,firstUseClearsBefore:9},{gateId:'v3-g-pink',frozen:10,firstUseDrag:51,firstUseClearsBefore:10}],totalRealInstances:3,
  oldAxisStage:'1 axis only',whyKnownRouteCompatible:'Cyan b18 only translates vertically and exits bottom; green and pink first use is after their proposed thaw counts, on distinct events. No body, inventory, mask, exit, or route is changed in this read-only proposal.',
  proofStatus:'NOT_CREATED_NOT_REPLAYED_NOT_REQUALIFIED',requiredNext:'If this capacity policy is adopted for a future independently new stock (or deliberate replacement, never duplicate), build final object, verify all real mechanism participation, fresh L>=31 and actual complete U, then Pointer/natural-clock. Existing source118 stays bomb; blocked 0059/0074 may not be modified and retried.'},
 generatorNextDesign:'Use exact legal three-rail mounts first, then fixed cargo footprints and per-unit spawn timing. A mount or a first-empty footprint is only necessary geometry; full FIFO/interleaving proof and all cargo clearance are still required. Queue count is not machine count.',
 contractWorkNeeded:['intensityTargets currently rejects instances1 and generates D3=4; catalog checks exact default targets. A reviewed new capacity schema and negative tests are required before any reduced latest count can pass.','Current participation audit requires at least2 distinct release events for numeric cases; singleton numeric latest needs explicit meaningful release evidence plus auxiliaries, not silently bypassing audit.','A new layout or mechanisms require fresh same-object proof. Existing failed physical stock cannot be re-searched by adding mechanisms.']};
for(const b of bindings)assert.equal(sha(b.path),b.sha256);
fs.mkdirSync(out,{recursive:false});
fs.writeFileSync(`${out}/report.json`,JSON.stringify({status:'READ_ONLY_CAPACITY_AUDIT',productionChanged:false,proofOrIntensityChanged:false,gameSearches:0,mechanismCandidatesConstructed:0,toolchainSha256:runtime.toolchainSha256,bindings,
 ruleEvidence:{path:bindingPaths[0],mechanismSectionLines:[23,27],fixedFourQuota:'Implementation only'},baseline:{path:baselinePath,sha256:sha(baselinePath),oldComparison},rows,proposal},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,rows:rows.map(r=>({name:r.name,mountMaximum:r.staticGenerator.maximumSimultaneous,mountWitness:r.staticGenerator.witness,route:r.routeCapacity,midgameSpawnOpportunities:r.firstSpawnFootprintOpportunities.filter(x=>x.midgameWindow).length})),oldComparison}));
