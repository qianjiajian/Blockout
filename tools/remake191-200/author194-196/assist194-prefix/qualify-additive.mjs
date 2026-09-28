import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from '../../replay.mjs';
import {digest,ruleGate,writeNew,auditSpatial,geometry} from '../../common.mjs';
// Importing author executable is avoided: its suffix-based entry guard would
// run a generation loop when this qualification filename ends in additive.mjs.
const tailProjection=await (async()=>{const argv1=process.argv[1];try{process.argv[1]='independent-additive-review';return(await import('../../author197-199/assist194/additive.mjs')).tailProjection;}finally{process.argv[1]=argv1;}})();

const OUT='deliverables/remake191-200-20260927/author194-196/assist194-prefix';
const lock=ruleGate(),{api,inputs}=await loadApi();
const hashes=Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]));
export function independentProjection(l){
 assert.equal(l.id,194);assert.equal(l.mechanismRules,'revised-2026-09-27-v1.5');
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length,k);
 assert(l.blocks.every(b=>!b.frozen&&!b.keyId&&!b.lockedBy&&!b.star&&!b.timedBombSeconds));
 assert(l.shutters.every(s=>!s.skin||s.skin==='shutter'));
 const cut=l.shutters.find(s=>s.id==='c10');assert(cut);assert.equal(cut.count,10);
 const inside=l.blocks.filter(b=>b.shutterId===cut.id),outside=l.blocks.filter(b=>b.shutterId!==cut.id);
 const events=bs=>bs.reduce((n,b)=>n+(b.layers?.length??1),0);
 assert.equal(l.blocks.length,31);assert.equal(inside.length,13);assert.equal(events(inside),15);assert.equal(events(outside),18);assert.equal(events(l.blocks),33);
 assert.equal(l.generators.length,1);const generator=l.generators[0];assert.equal(generator.queueBlockIds.length,1);
 const queue=generator.queueBlockIds.map(id=>l.blocks.find(b=>b.id===id));assert(queue.every(Boolean));assert(queue.every(b=>outside.includes(b)));
 for(const b of queue)assert(b.shape.every(([x,y])=>generator.spawn[0]+x>=cut.x&&generator.spawn[0]+x<cut.x+cut.width&&generator.spawn[1]+y>=cut.y&&generator.spawn[1]+y<cut.y+cut.height));
 assert.equal(events(queue),1);assert(queue.every(b=>!b.shutterId&&!b.layers&&!b.movementAxis));
 auditSpatial(l,api);
 const tail=structuredClone(l);tail.blocks=inside.map(b=>{const r=structuredClone(b);delete r.shutterId;return r;});delete tail.generators;delete tail.shutters;
 tail.gates=l.gates.map(g=>{const r=structuredClone(g),n=Math.max(0,(g.frozen??0)-events(outside));if(n)r.frozen=n;else delete r.frozen;return r;});
 assert.deepEqual(geometry(tail),geometry(l));api.validateLevel(tail);
 const actual=tailProjection(l);assert.equal(actual.credit,18);assert.deepEqual(actual.level,tail);
 const prefix=structuredClone(l);prefix.blocks=prefix.blocks.filter(b=>!generator.queueBlockIds.includes(b.id));delete prefix.generators;
 return {tail,prefix,cut,insideIds:inside.map(b=>b.id),outsideIds:outside.map(b=>b.id),queueIds:generator.queueBlockIds,credit:18,tailEvents:15};
}
const bodyState=b=>b?{id:b.id,x:b.x,y:b.y,layers:b.layers,frozen:b.frozen,movementAxis:b.movementAxis}:null;
export function routeContainment(l,drags,p){
 const actual=new api.PuzzleModel(l),tail=new api.PuzzleModel(p.tail),prefix=new api.PuzzleModel(p.prefix);for(const m of [actual,tail,prefix])m.startCountdown();
 const tailIds=new Set(p.insideIds),initial=new Map(p.insideIds.map(id=>[id,bodyState(actual.getBlock(id))]));
 let cutStep=null,prefixCost=0,tailCost=0,externalAfterCutCost=0,c10Clear=0,unitMoves=0,births=0;
 const timeline=[],tailDrags=[];
 const compare=()=>{for(const id of p.insideIds)assert.deepEqual(bodyState(actual.getBlock(id)),bodyState(tail.getBlock(id)));for(const g of tail.snapshot().gates){const a=actual.snapshot().gates.find(x=>x.id===g.id);assert(g.frozen<=a.frozen,'Early external clear credit must only reduce gate restrictions');}};
 compare();
 for(const [j,d]of drags.entries()){
  const before=actual.snapshot(),isTail=tailIds.has(d.blockId),beforeCut=before.cleared<10;
  if(beforeCut){assert.equal(cutStep,null);assert(!isTail);for(const id of p.insideIds){const b=actual.getBlock(id);assert(b&&!actual.isBlockActive(b));assert.deepEqual(bodyState(b),initial.get(id));}assert(p.queueIds.every(id=>!actual.getBlock(id)));}
  const targets=[actual,...(isTail?[tail]:[]),...(beforeCut?[prefix]:[])];const queuedBefore=before.queuedBlocks.length;
  for(const m of targets)m.beginAction();
  for(const xy of d.path){for(const m of targets)assert(m.moveBlockStep(d.blockId,...xy));unitMoves++;compare();}
  if(d.exitSide)for(const m of targets)assert(m.tryExit(d.blockId,d.exitSide).ok);
  for(const m of targets)assert(m.commitAction());
  const after=actual.snapshot(),clears=after.cleared-before.cleared,cost=Number(clears===0);assert(clears===0||clears===1);births+=queuedBefore-after.queuedBlocks.length;
  if(beforeCut){prefixCost+=cost;const b=prefix.snapshot();assert.equal(after.cleared,b.cleared);assert.deepEqual(after.blocks.filter(b=>!p.queueIds.includes(b.id)),b.blocks);assert.deepEqual(after.gates,b.gates);assert.deepEqual(after.shutters,b.shutters);}
  else if(isTail)tailCost+=cost;else externalAfterCutCost+=cost;
  if(isTail){assert(cutStep!==null);c10Clear+=clears;tailDrags.push(d);assert.equal(tail.snapshot().cleared,c10Clear);}
  if(beforeCut&&after.cleared===10){cutStep=j+1;assert(!isTail);assert.equal(clears,1);assert(after.shutters.find(s=>s.id==='c10').revealed);for(const id of p.insideIds)assert.deepEqual(bodyState(actual.getBlock(id)),initial.get(id));}
  compare();timeline.push({step:j+1,cleared:after.cleared,isTail,beforeCut,cost,tailClears:c10Clear});
 }
 assert(actual.snapshot().complete);assert(tail.snapshot().complete);assert.equal(c10Clear,15);assert.equal(actual.snapshot().cleared,33);assert.equal(births,1);assert(cutStep!==null);
 const full=replay(l,drags,api,{complete:true,requirePointerCompatible:true});assert.equal(full.nonClearingDrags,prefixCost+tailCost+externalAfterCutCost);
 return {passed:true,cutStep,initialTailImmutableBeforeCut:true,tailSubsetDrags:tailDrags.length,tailRouteSha256:digest(tailDrags),fullDrags:drags.length,U:full.nonClearingDrags,prefixRouteCost:prefixCost,tailRouteCost:tailCost,externalAfterCutCost,unitMoves,realQueueBirths:births,tailClearEvents:c10Clear,timeline};
}
const theorem={status:'VALID_CONDITIONAL_ADDITIVE_CUT',cut:'Immediately at the first tenth clear/peel event; stop before any next gesture. The triggering body is outside c10 and that event costs zero parking drags.',prefix:'All13 c10 bodies are inactive behind an ordinary count10 shutter before the cut, with unchanged positions/layers. The sole one-body FIFO footprint is entirely blocked by this shutter. Thus omitting that not-yet-born queue until the cut is exact on pre-cut state/choices. Retain all other opening and earlier hidden batches.',tail:'From that fixed c10 initial state, remove all18 outside bodies, including the real queued body, remove all covers and the generator, and credit all18 external clear events initially. Preserve the entire board,13 tail bodies,15 tail clear/peel events,shape,position,layer color,axis and gate geometry/color; replace gate ice n by max(0,n-18).',simulation:'Delete outside-body gestures from any real suffix. Every tail-body unit move, full exit sweep and peel remains legal because removed obstacles cannot obstruct, and at every tail count k the real total clears are at most18+k. Therefore projected gate ice is never larger. No hidden body ice, flips, keys, stars, colored grids, lifts, conveyors or timer effects are admitted. Tail dragging cost is unchanged; ignored outside parking only reduces cost.',addition:'Every full real solution reaches the cut. No tail gesture occurs in its prefix, and the suffix projection uses only tail gestures. Hence full non-clearing cost >= prefix floor + tail floor. In particular fresh L8 and L3 certificates on the same bound level imply L11; a complete U<=15 route remains separately required.',limitations:'This qualification does not itself establish L8 or L3 and does not transfer an old proof to a new hash. The FIFO remains fully present in the final level and full route; its deletion is solely the explicitly credited tail relaxation.'};
const files=process.argv.slice(2);if(!files.length)files.push('deliverables/remake191-200-20260927/author197-199/assist194/candidate194-1790526106520-27432.json');
const rows=[];for(const file of files){const d=JSON.parse(fs.readFileSync(file)),p=independentProjection(d.level),hasRoute=Boolean(d.drags?.length&&d.replay?.complete);rows.push({candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),status:'CUT_PROJECTION_QUALIFIED_NOT_A_LOWER_BOUND',tailProjection:p.tail,tailSha256:digest(p.tail),prefixSha256:digest(p.prefix),cut:p.cut,tailIds:p.insideIds,externalIds:p.outsideIds,credit:p.credit,tailEvents:p.tailEvents,routeContainment:hasRoute?routeContainment(d.level,d.drags,p):null});}
for(const[p,h]of Object.entries(hashes))assert.equal(digest(fs.readFileSync(p)),h);
const sourceFiles=['tools/remake191-200/author194-196/assist194-prefix/qualify-additive.mjs','tools/remake191-200/author197-199/assist194/additive.mjs'];
const report={status:'ADDITIVE_CUT_QUALIFICATION_PASS_NOT_DIFFICULTY_CERTIFICATION',activeVersion:lock.activeVersion,theorem,rows,modelInputs:hashes,sourceCodeHashes:Object.fromEntries(sourceFiles.map(p=>[p,digest(fs.readFileSync(p))])),newSearch:false,guiRerun:false,productionWritten:false,sourceClaimChanged:false};
const out=OUT+'/additive-qualification-'+Date.now()+'.json';writeNew(out,report);console.log(JSON.stringify({file:out,rows:rows.map(r=>({hash:r.levelSha256,route:r.routeContainment}))}));
