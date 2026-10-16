/** One finite joint shape/place/colour/axis/rim construction. No model, old
 * route, solver, plain completed board, history mutation or public claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';

export const SELF='tools/daily-challenge/formal-v4/axis-ice-wholeboard-stock-v1.mjs';
export const VERSION='joint-wholeboard-axis-ice-first-full-v1';
export const PROPOSAL=Object.freeze({path:'deliverables/daily-formal-v4-20261008/design/axis-ice-wholeboard-three-proposal-01/proposal.json',sha256:'7520df47878c1e65ddd0938ff06cc313935c99f140d354ac7f3381c5aae66d2b'});
const CAPS=Object.freeze({maxWorlds:10000,maxPartialNodes:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
const DIMS=[[1,1],[1,2],[2,1],[1,3],[3,1],[2,2],[2,3],[3,2],[4,1]];
const SIDES=['top','right','bottom','left'],AXES=['horizontal','vertical'];
const catalogues=new WeakSet(),meters=new WeakSet(),integer=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>assert(Number.isSafeInteger(v)&&v>=lo&&v<=hi,'Finite integer required');
const hash=b=>createHash('sha256').update(b).digest('hex'),clone=structuredClone;
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const extent=s=>[1+Math.max(...s.map(p=>p[0])),1+Math.max(...s.map(p=>p[1]))];
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const shapeKey=s=>JSON.stringify(s.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const footprint=b=>JSON.stringify(b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const aperture=g=>`${g.side}:${g.offset}:${g.size}`;
const adjacency=(a,b)=>((a.x+a.w===b.x||b.x+b.w===a.x)&&Math.max(a.y,b.y)<Math.min(a.y+a.h,b.y+b.h))||((a.y+a.h===b.y||b.y+b.h===a.y)&&Math.max(a.x,b.x)<Math.min(a.x+a.w,b.x+b.w));
const atGate=(a,g,W,H)=>g.side==='left'?a.x===0&&a.y>=g.offset&&a.y+a.h<=g.offset+g.size:g.side==='right'?a.x+a.w===W&&a.y>=g.offset&&a.y+a.h<=g.offset+g.size:g.side==='top'?a.y===0&&a.x>=g.offset&&a.x+a.w<=g.offset+g.size:a.y+a.h===H&&a.x>=g.offset&&a.x+a.w<=g.offset+g.size;
const parallel=(axis,g)=>axis==='horizontal'?['left','right'].includes(g.side):['top','bottom'].includes(g.side);
function random(seed){integer(seed,0,0xffffffff);return()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}

/** The task retains this same meter through static checks, joint search and
 * replay. Prepaid envelopes are never refunded or silently charged twice. */
export function createWholeBoardMeter({qualificationOnly=false,limits={},now=Date.now}={}){
 if(!qualificationOnly)assert.equal(now,Date.now,'Production clock must be real');
 assert(Object.keys(limits).every(k=>Object.hasOwn(CAPS,k)));const cap={...CAPS,...limits};for(const[k,v]of Object.entries(cap))integer(v,1,CAPS[k]);
 let started=null,latest=null,terminal=null;const counts={worlds:0,partialNodes:0,transitions:0,micro:0},kinds={},reservations=[];
 const fail=reason=>{terminal??=reason;throw Error(terminal);};
 function guard(){if(terminal)throw Error(terminal);const t=now();integer(t);if(started===null)started=t;if(latest!==null&&t<latest)fail('wholeboard-clock-reversed');latest=t;if(t-started>=cap.maxMilliseconds)fail('wholeboard-deadline');}
 function charge(values,reason,reservation=false){guard();for(const[k,v]of Object.entries(values))integer(v);const mapping={worlds:'maxWorlds',partialNodes:'maxPartialNodes',transitions:'maxTransitions',micro:'maxMicroStates'};assert(Object.keys(values).every(k=>mapping[k]));for(const[k,v]of Object.entries(values))if(counts[k]+v>cap[mapping[k]])fail('wholeboard-'+k+'-cap');for(const[k,v]of Object.entries(values))counts[k]+=v;kinds[reason]??={};for(const[k,v]of Object.entries(values))kinds[reason][k]=(kinds[reason][k]??0)+v;if(reservation)reservations.push({reason,...values});}
 const meter={guard,transition:(reason='coordinate',n=1)=>charge({transitions:n},reason),micro:(reason='single-body-coordinate',n=1)=>charge({micro:n},reason),node:()=>charge({partialNodes:1},'partial-node'),reserve:(values,reason)=>{assert(typeof reason==='string'&&reason);assert(Object.keys(values).every(k=>['worlds','transitions','micro'].includes(k)));charge(values,reason,true);},
  report:()=>clone({version:VERSION,qualificationOnly,limits:cap,...counts,kinds,reservations,started:started!==null,elapsedMilliseconds:started===null?0:latest-started,terminal,exactWorldVisitsClaimed:false}),
  remaining:()=>({worlds:cap.maxWorlds-counts.worlds,partialNodes:cap.maxPartialNodes-counts.partialNodes,transitions:cap.maxTransitions-counts.transitions,micro:cap.maxMicroStates-counts.micro,maxMilliseconds:cap.maxMilliseconds-(started===null?0:latest-started)}),fail};
 meters.add(meter);return Object.freeze(meter);
}

/** Catalogue only; no source-domain or complete board is constructed. */
export function nativeWholeBoardCatalogue(runtime){
 const shapes=[],assetBindings={};for(const[w,h]of DIMS){const shape=rect(w,h),m=runtime.matchFormalBlockShape(shape,'native-only');if(m?.quarterTurns!==0)continue;const colours=[];
  for(const[c,data]of Object.entries(runtime.GAME_ART.gameplay.formalBlocks)){const p=data.solid?.[m.shapeId];if(!p)continue;const file=path.resolve('public',p);assetBindings[file]=hash(fs.readFileSync(file));colours.push(c);}
  if(colours.length)shapes.push({w,h,shape,shapeId:m.shapeId,colours:colours.sort()});}
 const result=freeze({shapes,assetBindings});catalogues.add(result);return result;
}

/** Necessary coverage only. No full board or assignment is returned. */
export function necessaryCoverSupport(selected,remaining,area,meter){
 let occupied=0n,supported=0n;meter.transition('cover-call');for(const a of selected){meter.transition('cover-selected-mask');occupied|=a.mask;}for(const d of remaining)for(const a of d.options){meter.transition('cover-option-mask');supported|=a.mask;}
 for(let i=0;i<area;i++){meter.transition('cover-cell');const bit=1n<<BigInt(i);if(!(occupied&bit)&&!(supported&bit))return false;}return true;
}

/** A local two-body relation only; no world with A removed is constructed. */
export function localAxisRelease(a,b,ga,gb,W,H,meter){
 meter.transition('opening-local-check');if(ga.frozen||gb.frozen||!b.axis||!parallel(b.axis,gb)||!atGate(a,ga,W,H)||atGate(b,gb,W,H)||(a.mask&b.mask))return null;
 const [dx,dy]=gb.side==='left'?[-1,0]:gb.side==='right'?[1,0]:gb.side==='top'?[0,-1]:[0,1];const moved={x:b.x+dx,y:b.y+dy,w:b.w,h:b.h};
 if(moved.x<0||moved.y<0||moved.x+b.w>W||moved.y+b.h>H||!atGate(moved,gb,W,H))return null;
 let entering=0n;for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){meter.transition('opening-entering-cell');const bit=1n<<BigInt((moved.y+y)*W+moved.x+x);if(!(b.mask&bit))entering|=bit;}
 if(!entering||(entering&~a.mask))return null;return{from:[b.x,b.y],to:[moved.x,moved.y],axis:b.axis,exitSide:gb.side,unitSteps:1,necessaryLocalGeometryOnly:true,completeRouteProven:false};
}

function checkedRecipe(source,r,catalogue,meter,opts){
 assert(catalogues.has(catalogue)&&meters.has(meter),'Use issued native catalogue and shared meter');assert.equal(meter.report().qualificationOnly,opts.qualificationOnly);
 integer(source.id,1);integer(source.width,1,100);integer(source.height,1,100);assert(!(source.blocked??[]).length);const A=source.width*source.height;
 if(source.playable){assert.equal(source.playable.length,A);assert.equal(new Set(source.playable.map(p=>p.join(','))).size,A);for(const[x,y]of source.playable)assert(x>=0&&y>=0&&x<source.width&&y<source.height);}
 const N=r.authoredInventory?.bodyCount;integer(N,2,A);assert.equal(r.sourceLevelId,source.id);assert.equal(r.authoredInventory.shapeAreaMaximum,6);assert.equal(r.authoredInventory.nativeOrientation,'q0-only');assert.equal(r.finiteLimits.maximumFullWorlds,1);assert.equal(r.finiteLimits.maximumCspSessions,1);assert.equal(r.finiteLimits.maximumRestarts,0);assert.equal(r.finiteLimits.firstFullIsTerminal,true);
 const gates=r.labels.gateRoles,axes=r.labels.axisRoles,ids=new Set(gates.map(g=>g.id)),label=i=>'b'+String(i).padStart(2,'0'),labels=new Set(Array.from({length:N},(_,i)=>label(i)));
 assert.equal(ids.size,gates.length);assert.equal(new Set(axes.map(a=>a.body)).size,axes.length);for(const g of gates){assert(g.allowedSides.length&&g.allowedSides.every(s=>SIDES.includes(s)));integer(g.sizeRange[0],1,3);integer(g.sizeRange[1],g.sizeRange[0],3);if(g.frozen!==undefined)integer(g.frozen,1,N-1);}
 for(const a of axes){assert(labels.has(a.body)&&AXES.includes(a.axis)&&ids.has(a.gateRole));assert(gates.find(g=>g.id===a.gateRole).allowedSides.every(side=>parallel(a.axis,{side})));}
 assert.equal(r.openingRelations.length,1,'This narrowly qualified implementation supports one A-to-B motif');const o=r.openingRelations[0];assert(labels.has(o.first)&&labels.has(o.second)&&o.first!==o.second);assert(!axes.some(a=>a.body===o.first));const ba=axes.find(a=>a.body===o.second);assert(ba&&ids.has(o.firstGateRole)&&ba.gateRole!==o.firstGateRole);assert(!gates.find(g=>g.id===o.firstGateRole).frozen&&!gates.find(g=>g.id===ba.gateRole).frozen);assert(o.firstIsInitiallyOrdinaryClear&&o.secondInitiallyClearable===false&&o.secondMoveUnitSteps===1&&o.secondNewOccupiedCellsSubsetOfFirstFootprint&&o.secondShiftMatchesActualAxis&&o.secondShiftEndsAtItsOrdinaryGate);
 integer(r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears,0,source.blocks.length);assert(r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction>=0&&r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction<=1);integer(r.redesignRequirements.minimumChangedPhysicalGateApertures,0,gates.length);
 if(opts.qualificationOnly){assert(source.id>=990000&&A<=16&&N<=8,'Tiny synthetic qualification only');const q=opts.qualificationConstraints;assert(Object.keys(q).every(k=>['gatePins','bodyPins','roleColours','coverageSupport'].includes(k)));if(q.coverageSupport!==undefined)assert.equal(typeof q.coverageSupport,'boolean');for(const[id,pin]of Object.entries(q.gatePins??{})){assert(ids.has(id));assert(Object.keys(pin).every(k=>['side','offset','size'].includes(k)));}for(const[id,pin]of Object.entries(q.bodyPins??{})){assert(labels.has(id));assert(Object.keys(pin).every(k=>['x','y','dimensions','gateRoles'].includes(k)));if(pin.gateRoles)assert(pin.gateRoles.length&&pin.gateRoles.every(g=>ids.has(g)));}}
 else {assert.deepEqual(opts.qualificationConstraints,{});const d=opts.proposalDescriptor;assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));const bytes=fs.readFileSync(d.path);assert.equal(hash(bytes),d.sha256);const p=JSON.parse(bytes);assert.equal(p.schemaVersion,1);assert(Array.isArray(p.recipes));const exact=p.recipes.find(q=>q.recipeId===r.recipeId);assert(exact);assert.deepEqual(r,exact,'Production recipe must be the immutable task-reviewed declaration');assert.equal(levelSha256(source),r.source.levelSha256);assert(A<=63,'Qualified normal-board template area cap');assert.equal(axes.length,4);assert.equal(axes.filter(a=>a.axis==='horizontal').length,2);assert.equal(axes.filter(a=>a.axis==='vertical').length,2);assert.deepEqual(gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[7,8]);assert.equal(gates.length,8);assert.deepEqual(meter.report().limits,CAPS);}
 const future=opts.futureReservations;assert(Array.isArray(future));assert.equal(new Set(future.map(q=>q.reason)).size,future.length);for(const q of future){assert(typeof q.reason==='string'&&q.reason&&q.reason!=='first-full-world');assert(Object.keys(q).every(k=>['reason','worlds','transitions','micro'].includes(k)));for(const k of ['worlds','transitions','micro'])integer(q[k]??0);}
 if(!opts.qualificationOnly){assert.deepEqual(future.map(q=>q.reason),['static-audit','spatial-compile','dual-replay','terminal-guard']);assert.deepEqual(future.map(q=>q.worlds),[16,16,r.proposedWholeWorldBudget.dualReplayReservation,1]);}
 return{N,A,label};
}

export function createAxisIceWholeBoardFactory(source,recipe,catalogue,meter,{qualificationOnly=false,qualificationConstraints={},futureReservations=[],proposalDescriptor=PROPOSAL}={}){
 const opts={qualificationOnly,qualificationConstraints,futureReservations,proposalDescriptor},spec=checkedRecipe(source,recipe,catalogue,meter,opts),r=freeze(clone(recipe)),W=source.width,H=source.height,{N,A,label}=spec,sourceSHA=levelSha256(source),recipeSHA=levelSha256(r),q=freeze(clone(qualificationConstraints));
 const prepaid=freeze(clone(futureReservations));
 const roles=r.labels.gateRoles,axisRoles=new Map(r.labels.axisRoles.map(x=>[x.body,x])),opening=r.openingRelations[0],firstIndex=Number(opening.first.slice(1)),secondIndex=Number(opening.second.slice(1));
 const randomColour=random(r.colourSeed),allColours=[...new Set(catalogue.shapes.flatMap(s=>s.colours))].sort().map(c=>({c,rank:randomColour()})).sort((a,b)=>a.rank-b.rank).map(x=>x.c),colours=q.roleColours??allColours.slice(0,roles.length);assert.equal(colours.length,roles.length);assert.equal(new Set(colours).size,colours.length);assert(colours.every(c=>allColours.includes(c)));
 const roleColour=new Map(roles.map((g,i)=>[g.id,colours[i]])),rnd=random(r.seed),pruneCounts={},domainsSummary=[],gateAssignments=new Map(),partialAssignmentCount={gate:0,body:0};let used=false,full=null,firstFullReceipt=null,status='NOT_STARTED',reason=null;
 const prune=k=>{pruneCounts[k]=(pruneCounts[k]??0)+1;return false;},footprints=new Map();const queued=new Set((source.generators??[]).flatMap(g=>g.queueBlockIds));const sourceOpening=source.blocks.filter(b=>!b.shutterId&&!queued.has(b.id));for(const b of sourceOpening)footprints.set(footprint(b),b.shape.length);const openingArea=sourceOpening.reduce((n,b)=>n+b.shape.length,0),sourceGates=new Set((source.gates??[]).map(aperture));
 const dimensionSet=new Set(r.authoredInventory.allowedRectangleDimensions.map(d=>d.join(','))),shapes=catalogue.shapes.filter(s=>dimensionSet.has([s.w,s.h].join(',')));assert(shapes.length);
 // Ordinary labels are interchangeable only when their entire domains are
 // identical. Tiny pinned labels deliberately do not use this symmetry.
 const nonSpecial=Array.from({length:N},(_,i)=>i).filter(i=>i!==firstIndex&&!axisRoles.has(label(i))&&!q.bodyPins?.[label(i)]);
 const report=()=>({version:VERSION,qualificationOnly,status,reason,recipeSha256:recipeSHA,sourceLevelSha256:sourceSHA,partialAssignmentCount:clone(partialAssignmentCount),pruneCounts:clone(pruneCounts),domainCounts:clone(domainsSummary),accounting:meter.report(),firstFullWorlds:firstFullReceipt?1:0,firstFullReceipt:clone(firstFullReceipt),placeholderWorlds:0,newModels:0,newSearches:0,newReplays:0,newClaims:0,necessaryOpeningOnly:true,domainDesignChoices:{ordinaryAxisInitialExitContactExcluded:true,frozenAxisInitialContactPermitted:true,authority:'Root supplementary implementation choice; avoids zero-step ordinary-axis clear in monotone joint closure. This does not certify actual axis participation.'},productionQualified:false});
 function mask(x,y,w,h){let m=0n;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){meter.transition('shape-cell-mask');m|=1n<<BigInt((y+yy)*W+x+xx);}return m;}
 function gateOptions(role){const out=[];for(const side of role.allowedSides){const length=['top','bottom'].includes(side)?W:H;for(let size=role.sizeRange[0];size<=role.sizeRange[1];size++)for(let offset=0;offset+size<=length;offset++){meter.transition('gate-domain');const g={id:role.id,color:roleColour.get(role.id),side,offset,size,...role.frozen?{frozen:role.frozen}:{}};const pin=q.gatePins?.[role.id];if(pin&&Object.entries(pin).some(([k,v])=>g[k]!==v))continue;out.push({g,rank:rnd()+size*.04});}}return out.sort((a,b)=>a.rank-b.rank).map(x=>x.g);}
 function compatibleGate(g,b){meter.transition('gate-overlap');return g.side!==b.side||Math.max(g.offset,b.offset)>=Math.min(g.offset+g.size,b.offset+b.size);}
 function bodyOptions(i,gates){const name=label(i),axisRole=axisRoles.get(name),pin=q.bodyPins?.[name],required=axisRole?.gateRole??(i===firstIndex?opening.firstGateRole:null),out=[];
  for(const s of shapes)for(let y=0;y+s.h<=H;y++)for(let x=0;x+s.w<=W;x++){meter.transition('body-shape-pose');meter.micro('body-shape-pose');if(pin&&(pin.x!==undefined&&x!==pin.x||pin.y!==undefined&&y!==pin.y||pin.dimensions&&pin.dimensions.join(',')!==[s.w,s.h].join(',')))continue;
   for(const g of gates){meter.transition('body-colour-axis-domain');if(required&&g.id!==required||pin?.gateRoles&&!pin.gateRoles.includes(g.id)||!s.colours.includes(g.color))continue;const vertical=['top','bottom'].includes(g.side),span=vertical?s.w:s.h;if(span>g.size)continue;
    const a={x,y,w:s.w,h:s.h,shape:s.shape,shapeId:s.shapeId,color:g.color,gateRole:g.id,axis:axisRole?.axis??null,area:s.w*s.h};if(a.axis&&(!parallel(a.axis,g)||(a.axis==='horizontal'?(y<g.offset||y+s.h>g.offset+g.size):(x<g.offset||x+s.w>g.offset+g.size))))continue;
    // The qualified joint closure would clear an ordinary axis body already
    // at its gate with zero movement. Root explicitly chose to omit those
    // starts; frozen gates remain eligible for genuine pre-thaw movement.
    if(a.axis&&!g.frozen&&atGate(a,g,W,H))continue;
    if(i===firstIndex&&!atGate(a,g,W,H))continue;if(i===secondIndex){if(atGate(a,g,W,H))continue;const moved={...a,x:x+(g.side==='left'?-1:g.side==='right'?1:0),y:y+(g.side==='top'?-1:g.side==='bottom'?1:0)};if(!atGate(moved,g,W,H))continue;}
    a.mask=mask(x,y,s.w,s.h);a.footprint=footprint(a);a.retainedArea=footprints.get(a.footprint)??0;a.rank=(a.retainedArea?1:0)+Math.abs(a.area-A/N)*.08+rnd();a.symmetryKey=[y*W+x,s.w,s.h,colours.indexOf(g.color)].join(':');out.push(a);
   }}return out.sort((a,b)=>a.rank-b.rank||a.symmetryKey.localeCompare(b.symmetryKey));}
 function bodySearch(gates){const domains=Array.from({length:N},(_,i)=>bodyOptions(i,gates));domainsSummary.push({gatePlan:domainsSummary.length,choices:domains.map(d=>d.length)});if(domains.some(d=>!d.length))return prune('empty-initial-domain');const selected=new Map(),gateMap=new Map(gates.map(g=>[g.id,g]));
  function compatible(a,b){meter.transition('body-pair');return !(a.mask&b.mask)&&!(a.color===b.color&&adjacency(a,b));}
  function search(){meter.node();partialAssignmentCount.body++;meter.guard();let remaining=[];const chosen=[...selected.values()];
   for(let i=0;i<N;i++)if(!selected.has(i)){const options=[];for(const a of domains[i]){meter.transition('domain-filter');if(!chosen.every(b=>compatible(a,b)))continue;
     if(nonSpecial.includes(i)){let ok=true;for(const[j,b]of selected)if(nonSpecial.includes(j)){meter.transition('ordinary-label-symmetry');if((j<i&&b.symmetryKey>=a.symmetryKey)||(j>i&&b.symmetryKey<=a.symmetryKey)){ok=false;break;}}if(!ok)continue;}
     if(i===secondIndex&&selected.has(firstIndex)&&!localAxisRelease(selected.get(firstIndex),a,gateMap.get(opening.firstGateRole),gateMap.get(a.gateRole),W,H,meter))continue;
     if(i===firstIndex&&selected.has(secondIndex)&&!localAxisRelease(a,selected.get(secondIndex),gateMap.get(opening.firstGateRole),gateMap.get(selected.get(secondIndex).gateRole),W,H,meter))continue;
     options.push(a);}if(!options.length)return prune('empty-compatible-domain');remaining.push({i,options});}
   const area=chosen.reduce((n,a)=>n+a.area,0),singles=chosen.filter(a=>a.area===1).length,retainedArea=chosen.reduce((n,a)=>n+a.retainedArea,0),retainedBodies=chosen.filter(a=>a.retainedArea>0).length,usedColours=new Set(chosen.map(a=>a.color));meter.transition('partial-global-bounds');
   if(area+remaining.reduce((n,d)=>n+Math.min(...d.options.map(a=>a.area)),0)>A||area+remaining.reduce((n,d)=>n+Math.max(...d.options.map(a=>a.area)),0)<A)return prune('area-bound');
   if(singles>r.authoredInventory.maximumSingleCellBodies)return prune('single-cell-limit');
   if(retainedBodies>sourceOpening.length-r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears||retainedArea>openingArea*(1-r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction))return prune('source-footprint-retention');
   const colourSupport=new Set(usedColours);for(const d of remaining)for(const a of d.options){meter.transition('colour-support');colourSupport.add(a.color);}if(colourSupport.size!==roles.length||roles.length-usedColours.size>remaining.length)return prune('all-colours-bound');
   // Before a threshold t, only bodies behind gates of threshold < t may
   // supply its t clear events. This is an optimistic inventory bound, not a
   // route or a simulation of cleared worlds. Each inspected option is paid.
   const iceChecks=[];for(const t of [...new Set(gates.filter(g=>g.frozen).map(g=>g.frozen))]){let eligible=0,possible=0;for(const a of chosen){meter.transition('ice-capacity-selected');eligible+=Number((gateMap.get(a.gateRole).frozen??0)<t);}for(const d of remaining){for(const a of d.options){meter.transition('ice-capacity-option');if((gateMap.get(a.gateRole).frozen??0)<t){possible++;break;}}}if(eligible+possible<t)return prune('ice-clear-inventory-bound');iceChecks.push({threshold:t,eligible});}
   if(q.coverageSupport!==false&&!necessaryCoverSupport(chosen,remaining,A,meter))return prune('initial-coverage');
   remaining.sort((a,b)=>(a.i===firstIndex?-2:a.i===secondIndex?-1:0)-(b.i===firstIndex?-2:b.i===secondIndex?-1:0)||a.options.length-b.options.length||a.i-b.i);const next=remaining[0];
   for(const a of next.options){meter.transition('partial-branch');if(remaining.length===1){let iceCapacity=true;for(const c of iceChecks){meter.transition('ice-capacity-last-scalar');if(c.eligible+Number((gateMap.get(a.gateRole).frozen??0)<c.threshold)<c.threshold)iceCapacity=false;}if(!iceCapacity||area+a.area!==A||singles+Number(a.area===1)>r.authoredInventory.maximumSingleCellBodies||new Set([...usedColours,a.color]).size!==roles.length||retainedBodies+Number(a.retainedArea>0)>sourceOpening.length-r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears||retainedArea+a.retainedArea>openingArea*(1-r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction)){prune('last-scalar-bound');continue;}
     // No completed uncoloured or ordinary object has existed. This last
     // joint variable makes the entire actual physical input determined.
     const total={worlds:1,transitions:0,micro:0};for(const f of prepaid)for(const k of Object.keys(total))total[k]+=f[k]??0;meter.reserve(total,'first-full-plus-prepaid-phases');
     firstFullReceipt={firstFullWorlds:1,prepaidPhases:clone(prepaid),reservation:total,allMechanismsBeforeFirstHash:true,firstCompleteIsTerminal:true};selected.set(next.i,a);
     const blocks=Array.from({length:N},(_,i)=>{const b=selected.get(i);return{id:r.labels.bodyPrefix+label(i),x:b.x,y:b.y,shape:clone(b.shape),color:b.color,...b.axis?{movementAxis:b.axis}:{}};});
     full={id:source.id,name:'每日挑战 '+r.recipeId,difficulty:'super',reward:0,width:W,height:H,...source.playable?{playable:clone(source.playable)}:{},timeSeconds:source.timeSeconds,parMoves:source.parMoves,mechanismRules:'revised-2026-09-27-v1.5',blocks,gates:gates.map(g=>({...g,id:r.labels.bodyPrefix+g.id}))};
     firstFullReceipt.levelSha256=levelSha256(full);firstFullReceipt.openingRelation=localAxisRelease(selected.get(firstIndex),selected.get(secondIndex),gateMap.get(opening.firstGateRole),gateMap.get(selected.get(secondIndex).gateRole),W,H,meter);assert(firstFullReceipt.openingRelation);return true;
    }selected.set(next.i,a);if(search())return true;selected.delete(next.i,a);
   }return false;
  }return search();
 }
 function constructOnce(){assert(!used,'One recipe session is terminal; no second construction');used=true;status='CONSTRUCTING';try{assert.equal(levelSha256(source),sourceSHA,'Existing source changed');const gateDomains=new Map(roles.map(g=>[g.id,gateOptions(g)]));
   function gateSearch(){meter.node();partialAssignmentCount.gate++;if(gateAssignments.size===roles.length){const gates=roles.map(g=>gateAssignments.get(g.id));if(gates.filter(g=>!sourceGates.has(aperture(g))).length<r.redesignRequirements.minimumChangedPhysicalGateApertures)return prune('physical-gate-change');return bodySearch(gates);}
    const unassigned=roles.filter(g=>!gateAssignments.has(g.id)).map(g=>({g,options:gateDomains.get(g.id).filter(a=>[...gateAssignments.values()].every(b=>compatibleGate(a,b)))}));if(unassigned.some(d=>!d.options.length))return prune('rim-pack');unassigned.sort((a,b)=>a.options.length-b.options.length||a.g.id.localeCompare(b.g.id));const next=unassigned[0];for(const g of next.options){meter.transition('gate-branch');gateAssignments.set(g.id,g);if(gateSearch())return true;gateAssignments.delete(g.id);}return false;
   }const found=gateSearch();meter.guard();status=found?'FIRST_FULL_AXIS_ICE_TERMINAL':'FINITE_JOINT_DOMAIN_EXHAUSTED';
  }catch(e){status='WHOLEBOARD_CONSTRUCTION_TERMINAL';reason=e.message;}
  return freeze({status,reason,found:full!==null,level:full,levelSha256:full?levelSha256(full):null,firstFullReceipt,accounting:meter.report(),constructionAccounting:report(),nativeBindings:catalogue.assetBindings,recipeSha256:recipeSHA,formalReady:false});
 }
 return Object.freeze({constructOnce,report});
}
