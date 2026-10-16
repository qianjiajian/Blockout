/** Future closed source29 factory revision. Old 7b776 bytes stay unchanged.
 * All-variable leaves are paid once even if final coverage/design fails; axes
 * are present at creation. Domain debit includes the prior 123ms/read-only work.
 * CSP partialAssignments are coordinate choices, not committed full worlds. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {parkingIceReplayQuote} from './parking-ice-region-stock.mjs';
import {assertIceProofDomain} from '../formal-v3/bounded-ice-proof.mjs';
import {RECTANGLE_SHAPES,boardCells} from '../formal-v3/diversity-layout-factory.mjs';

export const ROUTE_CONSTRAINED_STOCK_VERSION='single-complete-route-coordinate-csp-axis-v2';
export const SELF='tools/daily-challenge/formal-v4/route-constrained-ice-stock-v2.mjs';
export const SOURCE29_REFERENCE=Object.freeze({path:'deliverables/daily-formal-v4-20261008/selection/merged-116-v2/daily-basic-combined-d3-03.json',sha256:'c868e91ad41544b254458274034449b1eb73b3bdbcf04f604c2791acbcd54b59'});
export const DOMAIN_EVIDENCE=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/source29-full-route-shape-domains-readonly-01/report.json',sha256:'723c6430088f1d17186724b8cdad90bd0dd77da59d5028357adc5e5238bbf9fb'});
export const INHERITED_DOMAIN_COST=Object.freeze({coordinateTransitions:1303725,singleBodyPoses:1205897,elapsedMilliseconds:123});
export const SOURCE29_AXES=Object.freeze({'v3-29-6871441-b7':'vertical','v3-29-6871441-b18':'vertical','v3-29-6871441-b22':'horizontal'});
const LIMITS=Object.freeze({maxStates:10000,maxNodes:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const issuedCatalogues=new WeakSet();
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>assert(Number.isSafeInteger(n)&&n>=min&&n<=max,'Invalid finite coordinate value');
const copy=structuredClone,point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger);
const shapeKey=s=>JSON.stringify(s.map(p=>[...p]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const inventoryKey=bs=>JSON.stringify(bs.map(b=>shapeKey(b.shape)).sort());
const colourKey=bs=>JSON.stringify(bs.map(b=>b.color).sort());
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const y of Object.values(x))if(y&&typeof y==='object'&&!Object.isFrozen(y))freeze(y);}return x;}
function rectangle(shape){assert(shape.length&&shape.every(point));const w=1+Math.max(...shape.map(p=>p[0])),h=1+Math.max(...shape.map(p=>p[1]));assert.equal(Math.min(...shape.map(p=>p[0])),0);assert.equal(Math.min(...shape.map(p=>p[1])),0);assert.equal(new Set(shape.map(p=>p.join(','))).size,w*h,'Solid normalized q0 rectangle required');return{w,h};}
function gateContact(g,x,y,w,h,W,H){return g.side==='left'?x===0&&y>=g.offset&&y+h<=g.offset+g.size:g.side==='right'?x+w===W&&y>=g.offset&&y+h<=g.offset+g.size:g.side==='top'?y===0&&x>=g.offset&&x+w<=g.offset+g.size:y+h===H&&x>=g.offset&&x+w<=g.offset+g.size;}
function adjacent(a,b){return ((a.x+a.w===b.x||b.x+b.w===a.x)&&Math.max(a.y,b.y)<Math.min(a.y+a.h,b.y+b.h))||((a.y+a.h===b.y||b.y+b.h===a.y)&&Math.max(a.x,b.x)<Math.min(a.x+a.w,b.x+b.w));}

/** No model, reference replay, solver, ledger, or complete world creation.
 * These are per-body coordinates derived solely from an already supplied
 * witness. Full original dual evidence must be authenticated by a future caller.
 */
export function inspectRouteCoordinateTracks(reference){
 const {level,drags}=reference;assertIceProofDomain(level);const W=level.width,H=level.height;integer(W,1,100);integer(H,1,100);assert(level.blocks.length>0&&level.blocks.length<=W*H);
 assert.equal(boardCells(level).length,W*H,'Only the complete normal rectangle is supported');assert.equal(new Set(boardCells(level).map(p=>p.join(','))).size,W*H);assert(!(level.blocked??[]).length);
 const gateColours=new Set(level.gates.map(g=>g.color));assert.equal(gateColours.size,level.gates.length,'One gate per colour required');assert.equal(new Set(level.gates.map(g=>g.id)).size,level.gates.length);
 for(const g of level.gates){assert(!g.portals?.length,'Internal/multiple portals excluded');assert(['left','right','top','bottom'].includes(g.side));integer(g.offset);integer(g.size,1);assert(g.offset+g.size<=(['top','bottom'].includes(g.side)?W:H));}
 for(const [i,a]of level.gates.entries())for(const b of level.gates.slice(i+1))assert(a.side!==b.side||Math.max(a.offset,b.offset)>=Math.min(a.offset+a.size,b.offset+b.size),'Overlapping apertures excluded');
 const occupied=new Set();for(const b of level.blocks)for(const [dx,dy]of b.shape){const x=b.x+dx,y=b.y+dy,k=x+','+y;assert(x>=0&&x<W&&y>=0&&y<H&&!occupied.has(k),'Reference initial cover invalid');occupied.add(k);}assert.equal(occupied.size,W*H,'Reference must start fully tiled');
 const tracks=level.blocks.map(b=>{rectangle(b.shape);assert.equal(b.frozen,undefined,'Gate ice only');integer(b.x);integer(b.y);assert(gateColours.has(b.color));return{id:b.id,color:b.color,shape:copy(b.shape),start:[b.x,b.y],poses:[[b.x,b.y]],actions:[],axes:new Set(),unitSteps:0,exitSide:null};});
 assert.equal(new Set(tracks.map(t=>t.id)).size,tracks.length);const byId=new Map(tracks.map(t=>[t.id,t])),live=new Set(byId.keys()),positions=new Map(tracks.map(t=>[t.id,t.start]));let frame=0,clears=0,parking=0;
 assert(Array.isArray(drags)&&drags.length>0&&drags.length<=10000);
 const checkpoint=()=>{frame++;for(const t of tracks)t.poses.push(live.has(t.id)?[...positions.get(t.id)]:null);};
 for(const [i,d]of drags.entries()){
  assert(d&&Object.keys(d).every(k=>['blockId','path','exitSide'].includes(k))&&Array.isArray(d.path));const t=byId.get(d.blockId);assert(t&&live.has(t.id),'Route operates a removed/unknown body');const start=[...positions.get(t.id)],samples=[{frame,pose:start}];
  for(const p of d.path){assert(point(p));const previous=positions.get(t.id);assert.equal(Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1]),1,'Every unit step is required');t.axes.add(p[0]===previous[0]?'vertical':'horizontal');t.unitSteps++;positions.set(t.id,[...p]);checkpoint();samples.push({frame,pose:[...p]});}
  if(d.exitSide!==undefined){assert(['top','right','bottom','left'].includes(d.exitSide));t.axes.add(['top','bottom'].includes(d.exitSide)?'vertical':'horizontal');t.exitSide=d.exitSide;live.delete(t.id);}
  else{assert(d.path.length&&JSON.stringify(start)!==JSON.stringify(d.path.at(-1)),'Parking must change the committed pose');parking++;}
  t.actions.push({drag:i,clearsBefore:clears,samples,exitSide:d.exitSide??null});if(d.exitSide)clears++;checkpoint();
 }
 assert.equal(live.size,0,'Provided trace must clear the complete inventory');assert.equal(clears,tracks.length);
 return freeze({referenceLevelSha256:levelSha256(level),referenceRouteSha256:routeSha256(drags),width:W,height:H,frames:frame+1,parking,clears,
  tracks:tracks.map(t=>({...t,axes:[...t.axes],axisCompatible:t.unitSteps>0&&t.axes.size===1?[...t.axes][0]:null})),
  coordinateMetadataOnly:true,fullRouteValidated:false,lowerBoundClaimed:false});
}

/** Actual q0 artwork catalogue; no >=4-colour heuristic. Every chosen shape
 * needs its actual final colour image. The normal rectangular domain is narrow
 * enough that edge contact proves an unobstructed outward rectangle sweep.
 */
export function nativeRouteShapeCatalogue(runtime){
 const shapes=[],assetBindings={};for(const shape of RECTANGLE_SHAPES){if(shape.length>6)continue;const m=runtime.matchFormalBlockShape(shape,'native-only');if(m?.quarterTurns!==0)continue;
  const colours=[];for(const [colour,data]of Object.entries(runtime.GAME_ART.gameplay.formalBlocks)){const image=data.solid?.[m.shapeId];if(!image)continue;const file=path.resolve('public',image);assetBindings[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');colours.push(colour);}
  if(colours.length)shapes.push({shapeId:m.shapeId,shape:copy(shape),colours});
 }const result=freeze({shapes,assetBindings});issuedCatalogues.add(result);return result;
}

/** One finite coordinate CSP. A complete labelled assignment is debited even
 * before a future caller creates a LevelSpec. It is the ONLY completed stock;
 * inventory/history/near/U/L failure cannot request another leaf. No complete
 * reference/new-board model or route replay is created by this implementation.
 * Production history/owner/claim and one charged dual U still belong to the
 * future closed task. This coordinate result alone never certifies U or L.
 */
export function createRouteConstrainedGeometry(reference,recipe,catalogue,{budget={},now=Date.now,qualificationOnly=false}={}){
 const initializationStarted=now();if(!qualificationOnly)assert.equal(now,Date.now,'No production clock override');
 assert(issuedCatalogues.has(catalogue),'Use the actual q0 catalogue issued by this module');const trace=inspectRouteCoordinateTracks(reference),originalSHA=trace.referenceLevelSha256,routeSHA=trace.referenceRouteSha256,routeDrags=freeze(copy(reference.drags));
 assert.equal(typeof now,'function');const limits=Object.freeze(Object.fromEntries(Object.entries(LIMITS).map(([k,max])=>{const n=budget[k]??max;integer(n,1,max);return[k,n];})));assert(Object.keys(budget).every(k=>Object.hasOwn(LIMITS,k)));
 const declared=copy(recipe),palette=declared.palettePermutation,colours=reference.level.gates.map(g=>g.color).sort();assert.deepEqual(Object.keys(palette).sort(),colours);assert.deepEqual(Object.values(palette).sort(),colours);assert(colours.every(c=>palette[c]!==c),'Declared actual colour derangement required');
 integer(declared.minimumChangedBodies,Math.ceil(trace.tracks.length/2),trace.tracks.length);integer(declared.minimumChangedArea,Math.ceil(trace.width*trace.height/2),trace.width*trace.height);assert.equal(declared.maximumCompleteInputs,1);assert.equal(declared.candidateOrder,'changed-first-y-x-shape');
 const axes=declared.axes;assert(axes&&typeof axes==='object');for(const[id,axis]of Object.entries(axes))assert.equal(trace.tracks.find(t=>t.id===id)?.axisCompatible,axis,'Declared axis must permit the entire unit route and exit');
 if(!qualificationOnly){assert.equal(originalSHA,'c0a30fc007bb2dc322d72a97aa8e40dffc46c2397204d5e03ff1e2ea0e02cc54');assert.equal(routeSHA,'ee727372ef0f745767f20be70c53c3457451d3becc1368206ec1bbf4c9f2b293');assert.equal(declared.minimumChangedBodies,12);assert.equal(declared.minimumChangedArea,32);assert.deepEqual(axes,SOURCE29_AXES);assert.deepEqual(palette,Object.fromEntries(colours.map((c,i)=>[c,colours[(i+1)%colours.length]])));assert.equal(declared.targetSlot,'daily-mechanisms-axis-block-50-d3-02');assert.deepEqual(budget,{});}
 const inherited=qualificationOnly?{coordinateTransitions:0,singleBodyPoses:0,elapsedMilliseconds:0}:INHERITED_DOMAIN_COST;
 const shapes=copy(catalogue.shapes);assert(shapes.length>0);for(const s of shapes){rectangle(s.shape);assert(s.shape.length<=6);assert(Array.isArray(s.colours));}assert.equal(new Set(shapes.map(s=>shapeKey(s.shape))).size,shapes.length);
 for(const t of trace.tracks)assert(shapes.some(s=>shapeKey(s.shape)===shapeKey(t.shape)&&s.colours.includes(t.color)),'Original shape/colour needs real q0 art');
 const referenceBodies=trace.tracks.map(t=>({shape:t.shape,color:t.color})),gates=reference.level.gates.map(g=>({...g,color:palette[g.color]})),W=trace.width,H=trace.height;
 let started=initializationStarted,latest=started,terminal=null,compiled=false,used=false,dualReserved=false,staticReserved=false,full=null;integer(started);const counts={coordinateTransitions:inherited.coordinateTransitions,singleBodyPoses:inherited.singleBodyPoses,cspNodes:0,completeWorldReservations:0,fullAssignments:0};const domains=[],partialAssignments=[];const replayReservations={worlds:0,transitions:0,micro:0};
 const stop=reason=>{if(!terminal||terminal==='FIRST_COMPLETE_COORDINATE_STOCK_TERMINAL')terminal=reason;throw Error(terminal);};
 function guard(allowCompleted=false){const t=now();integer(t);if(t<latest)stop('coordinate-clock-reversed');latest=t;if(t-started+inherited.elapsedMilliseconds>=limits.maxMilliseconds)stop('coordinate-deadline');if(terminal&&!(allowCompleted&&terminal==='FIRST_COMPLETE_COORDINATE_STOCK_TERMINAL'))throw Error(terminal);}
 function work(transitions=1,micro=0){guard();integer(transitions);integer(micro);if(counts.coordinateTransitions+transitions>limits.maxTransitions)stop('coordinate-transition-cap');if(counts.singleBodyPoses+micro>limits.maxMicroStates)stop('coordinate-micro-cap');counts.coordinateTransitions+=transitions;counts.singleBodyPoses+=micro;}
 const report=()=>({qualificationOnly,inheritedDomainCost:copy(inherited),replayReservations:copy(replayReservations),staticAuditReservations:staticReserved?16:0,partialAssignmentCount:partialAssignments.length,version:ROUTE_CONSTRAINED_STOCK_VERSION,budget:limits,...counts,elapsedMilliseconds:latest-started+inherited.elapsedMilliseconds,terminal,referenceLevelSha256:originalSHA,referenceRouteSha256:routeSHA,fullRouteValidated:false,lowerBoundClaimed:false,productionEntryQualified:false,newModelCalls:0,newSearches:0,publicClaimsStarted:0});
 function mask(x,y,w,h){let value=0n;for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){work();value|=1n<<BigInt((y+dy)*W+x+dx);}return value;}
 function options(t){
  const out=[],colour=palette[t.color],gate=gates.find(g=>g.color===colour);assert(gate);
  for(const s of shapes.filter(s=>s.colours.includes(colour))){const{w,h}=rectangle(s.shape);
   for(let y=0;y+h<=H;y++)for(let x=0;x+w<=W;x++){
    work();const ox=x-t.start[0],oy=y-t.start[1];let valid=true;
    for(const p of t.poses)if(p){work(1,1);if(p[0]+ox<0||p[1]+oy<0||p[0]+ox+w>W||p[1]+oy+h>H){valid=false;break;}}
    if(!valid)continue;
    for(const action of t.actions){for(const [j,sample]of action.samples.entries()){work();const actual=(gate.frozen??0)<=action.clearsBefore&&gateContact(gate,sample.pose[0]+ox,sample.pose[1]+oy,w,h,W,H)?gate.side:null;
      const expected=j===action.samples.length-1?action.exitSide:null;if(actual!==expected){valid=false;break;}}if(!valid)break;}
    if(!valid)continue;
    const changed=shapeKey(s.shape)!==shapeKey(t.shape),masks=t.poses.map(p=>p?mask(p[0]+ox,p[1]+oy,w,h):0n);
    out.push({id:t.id,color:colour,shape:s.shape,shapeId:s.shapeId,x,y,w,h,offset:[ox,oy],area:w*h,changed,changedArea:changed?t.shape.length:0,masks,axisCompatible:t.axisCompatible});
   }
  }
  return out.sort((a,b)=>Number(b.changed)-Number(a.changed)||a.y-b.y||a.x-b.x||shapeKey(a.shape).localeCompare(shapeKey(b.shape)));
 }
 function compile(){guard();assert.equal(levelSha256(reference.level),originalSHA,'Reference mutated');assert.equal(routeSha256(reference.drags),routeSHA,'Reference route mutated');if(compiled)return;for(const t of trace.tracks)domains.push(options(t));compiled=true;}
 function compatible(a,b){work();if(a.color===b.color&&adjacent(a,b))return false;for(let i=0;i<trace.frames;i++){work();if(a.masks[i]&b.masks[i])return false;}return true;}
 function solve(){
  assert(!used,'One fixed recipe may reach only one terminal outcome');used=true;
  try{compile();const selected=new Map();
   function complete(area,changed,changedArea){
     // Charged BEFORE copying the complete inventory/positions/colours.
     const blocks=trace.tracks.map((t,i)=>{const a=selected.get(i);return{id:t.id,x:a.x,y:a.y,shape:copy(a.shape),color:a.color,...axes[t.id]?{movementAxis:axes[t.id]}:{}};});
     const drags=routeDrags.map(d=>{const i=trace.tracks.findIndex(t=>t.id===d.blockId),a=selected.get(i);return{blockId:d.blockId,path:d.path.map(p=>[p[0]+a.offset[0],p[1]+a.offset[1]]),...d.exitSide?{exitSide:d.exitSide}:{}};});
     const level={...reference.level,blocks,gates:copy(gates)};full={level,levelSha256:levelSha256(level),blocks,gates:level.gates,drags,fullCoverage:area===W*H,requiredChangePassed:changed>=declared.minimumChangedBodies&&changedArea>=declared.minimumChangedArea,changedBodies:changed,changedOriginalArea:changedArea,shapeInventoryChanged:inventoryKey(blocks)!==inventoryKey(referenceBodies),colourInventoryChanged:blocks.some((b,i)=>b.color!==referenceBodies[i].color),axisCompatible:trace.tracks.filter(t=>t.axisCompatible).map(t=>({id:t.id,axis:t.axisCompatible,unitSteps:t.unitSteps,exitSide:t.exitSide}))};return true;
   }
   function search(){
    guard();if(counts.cspNodes>=limits.maxNodes)stop('coordinate-node-cap');counts.cspNodes++;partialAssignments.push([...selected].map(([i,a])=>[trace.tracks[i].id,domains[i].indexOf(a)]));
    const remaining=[];for(let i=0;i<domains.length;i++)if(!selected.has(i)){const viable=domains[i].filter(a=>[...selected.values()].every(b=>compatible(a,b)));if(!viable.length)return false;remaining.push({i,viable});}
    const chosen=[...selected.values()],area=chosen.reduce((n,x)=>n+x.area,0),changed=chosen.filter(x=>x.changed).length,changedArea=chosen.reduce((n,x)=>n+x.changedArea,0);
    assert(remaining.length>0,'Full tuple is finalized before recursive search');
    work();if(area+remaining.reduce((n,r)=>n+Math.min(...r.viable.map(x=>x.area)),0)>W*H||area+remaining.reduce((n,r)=>n+Math.max(...r.viable.map(x=>x.area)),0)<W*H)return false;
    if(changed+remaining.filter(r=>r.viable.some(x=>x.changed)).length<declared.minimumChangedBodies||changedArea+remaining.reduce((n,r)=>n+Math.max(...r.viable.map(x=>x.changedArea)),0)<declared.minimumChangedArea)return false;
    remaining.sort((a,b)=>a.viable.length-b.viable.length||a.i-b.i);const next=remaining[0];for(const a of next.viable){work();if(remaining.length===1&&(area+a.area!==W*H||changed+Number(a.changed)<declared.minimumChangedBodies||changedArea+a.changedArea<declared.minimumChangedArea))continue;if(remaining.length===1){if(counts.completeWorldReservations>=limits.maxStates)stop('coordinate-world-cap');counts.completeWorldReservations++;counts.fullAssignments++;selected.set(next.i,a);return complete(area+a.area,changed+Number(a.changed),changedArea+a.changedArea);}selected.set(next.i,a);if(search())return true;selected.delete(next.i);}return false;
   }
   const found=search();guard();terminal=found?'FIRST_COMPLETE_COORDINATE_STOCK_TERMINAL':'FINITE_COORDINATE_DOMAIN_EXHAUSTED';
   return freeze({status:terminal,found,assignment:full,domainCounts:domains.map((x,i)=>({id:trace.tracks[i].id,choices:x.length,shapeChoices:new Set(x.map(a=>shapeKey(a.shape))).size})),accounting:report(),partialAssignments:copy(partialAssignments),
    referenceParkingCost:trace.parking,providedRouteOnly:true,requiresActualDualReplay:!!full,requiresFreshOriginalLower:!!full,actualNewIdentityAndNearUnchecked:true,shapeAndColourInventoryPassed:!!full&&full.fullCoverage&&full.requiredChangePassed&&full.shapeInventoryChanged&&full.colourInventoryChanged});
  }catch(e){terminal??=e.message;return freeze({status:'COORDINATE_CONSTRUCTION_TERMINAL',reason:e.message,found:!!full,assignment:full,accounting:report(),partialAssignments:copy(partialAssignments)});}
 }
 return Object.freeze({solve,guard:()=>guard(true),reserveStaticAudit(){assert(used&&full&&!staticReserved);guard(true);if(counts.completeWorldReservations+16>limits.maxStates)stop('coordinate-world-cap');if(counts.coordinateTransitions+16>limits.maxTransitions)stop('coordinate-transition-cap');staticReserved=true;counts.completeWorldReservations+=16;counts.coordinateTransitions+=16;return 16;},reserveDualReplay(){assert(used&&full&&!dualReserved,'Exactly one first-full dual replay');guard(true);const q=parkingIceReplayQuote(full.drags);if(counts.completeWorldReservations+q.worlds>limits.maxStates)stop('coordinate-world-cap');if(counts.coordinateTransitions+q.transitions>limits.maxTransitions)stop('coordinate-transition-cap');if(counts.singleBodyPoses+q.micro>limits.maxMicroStates)stop('coordinate-micro-cap');dualReserved=true;counts.completeWorldReservations+=q.worlds;counts.coordinateTransitions+=q.transitions;counts.singleBodyPoses+=q.micro;Object.assign(replayReservations,q);return copy(q);},inspectDomains(){assert(!used);compile();return freeze({domainCounts:domains.map((x,i)=>({id:trace.tracks[i].id,choices:x.length,shapeChoices:new Set(x.map(a=>shapeKey(a.shape))).size})),accounting:report()});},report});
}
