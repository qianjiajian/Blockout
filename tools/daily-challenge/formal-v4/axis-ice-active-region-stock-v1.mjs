/** One finite joint shape/place/colour/axis/rim construction. No model, old
 * route, solver, plain completed board, history mutation or public claim. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';

export const SELF='tools/daily-challenge/formal-v4/axis-ice-active-region-stock-v1.mjs';
export const VERSION='joint-active-region-real-body-ice-first-full-v1';
export const PROPOSAL=null; // Every production call supplies its reviewed immutable declaration.
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

/** Finite meter primitive. In v4 this factory's instance accounts only for
 * construction. Joint search and deterministic verification own separate
 * task meters and one-shot phase clocks; no charged phase is refunded. */
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
 let occupied=0n,supported=0n;const seen=new Set();meter.transition('cover-call');for(const a of selected){meter.transition('cover-selected-mask');occupied|=a.mask;}for(const d of remaining){meter.transition('cover-group-reference');if(seen.has(d.options)){meter.transition('cover-domain-reuse');continue;}seen.add(d.options);for(const a of d.options){meter.transition('cover-option-mask');supported|=a.mask;}}
 for(let i=0;i<area;i++){meter.transition('cover-cell');const bit=1n<<BigInt(i);if(!(occupied&bit)&&!(supported&bit))return false;}return true;
}

/** One starter fragment only. No deleted-body world, route or second-clear
 * promise is constructed. Every inspected native pose is paid. */
export function necessaryStarterGateSupport(g,region,W,H,shapes,meter){
 meter.transition('starter-gate-support');if(g.frozen)return false;
 for(const s of shapes){meter.transition('starter-native-shape');if(s.w*s.h!==2||!s.colours.includes(g.color))continue;
  for(let y=region.y;y+s.h<=region.y+region.height;y++)for(let x=region.x;x+s.w<=region.x+region.width;x++){meter.transition('starter-native-pose');if(atGate({x,y,w:s.w,h:s.h},g,W,H))return true;}}
 return false;
}

/** Necessary removal-order capacity. The partial bound is optimistic: each
 * remaining label may use any one of its own options. It never constructs a
 * complete arrangement and does not assert geometric solvability. */
export function necessaryReleaseSupport(chosen,remaining,thresholds,meter){
 const checks=[];for(const t of thresholds){meter.transition('ice-capacity-threshold');integer(t,1);let eligible=0,possible=0;for(const a of chosen){meter.transition('ice-capacity-selected');eligible+=Number(a.release<t);}for(const d of remaining){for(const a of d.options){meter.transition('ice-capacity-option');if(a.release<t){possible++;break;}}}if(eligible+possible<t)return null;checks.push({threshold:t,eligible});}return checks;
}

/** A child domain is a subset of its parent's already-filtered domain.
 * Only the newly placed body is checked. ordinaryOrder is derived from the
 * original label indices, never the order in which bodies were selected.
 * openingCheck, when supplied by a private test, sees one fragment only. */
export function incrementalDomainFilter(options,placed,meter,{ordinaryOrder=0,openingCheck=null}={}){
 assert([-1,0,1].includes(ordinaryOrder));const out=[];
 for(const a of options){meter.transition('incremental-domain-filter');meter.transition('body-pair');if((a.mask&placed.mask)||(a.color===placed.color&&adjacency(a,placed)))continue;
  if(ordinaryOrder){meter.transition('ordinary-label-symmetry');if(ordinaryOrder>0?a.symmetryKey<=placed.symmetryKey:a.symmetryKey>=placed.symmetryKey)continue;}
  if(openingCheck&&!openingCheck(a))continue;out.push(a);
 }
 return out;
}

/** Minimum-support empty cell of a PARTIAL board. Options are coordinate
 * fragments, not complete worlds. Each inspected option, cell membership,
 * support reference and board-cell choice is paid. Zero support is terminal. */
export function minimumOrdinaryCoverCell(options,occupied,W,H,meter){
 const support=Array.from({length:W*H},()=>[]);meter.transition('tail-cover-array-initialization',W*H);
 for(const a of options){meter.transition('tail-cover-option');if(a.mask&occupied)continue;for(let yy=0;yy<a.h;yy++)for(let xx=0;xx<a.w;xx++){meter.transition('tail-cover-cell-membership');const cell=(a.y+yy)*W+a.x+xx;meter.transition('tail-cover-support-reference');support[cell].push(a);}}
 let best=null;for(let cell=0;cell<W*H;cell++){meter.transition('tail-cover-cell-choice');if(occupied&(1n<<BigInt(cell)))continue;if(!support[cell].length)return{cell,options:[],zeroSupport:true};if(!best||support[cell].length<best.options.length)best={cell,options:support[cell],zeroSupport:false};}
 return best;
}

function checkedRecipe(source,r,catalogue,meter,opts){
 assert(catalogues.has(catalogue)&&meters.has(meter),'Use issued native catalogue and shared meter');assert.equal(meter.report().qualificationOnly,opts.qualificationOnly);
 integer(source.id,1);integer(source.width,1,100);integer(source.height,1,100);assert(!(source.blocked??[]).length);const A=source.width*source.height;
 if(source.playable){assert.equal(source.playable.length,A);assert.equal(new Set(source.playable.map(p=>p.join(','))).size,A);for(const[x,y]of source.playable)assert(x>=0&&y>=0&&x<source.width&&y<source.height);}
 const N=r.authoredInventory?.bodyCount;integer(N,2,A);assert.equal(r.sourceLevelId,source.id);assert.equal(r.authoredInventory.shapeAreaMaximum,6);assert.equal(r.authoredInventory.nativeOrientation,'q0-only');assert.equal(r.finiteLimits.maximumFullWorlds,1);assert.equal(r.finiteLimits.maximumCspSessions,1);assert.equal(r.finiteLimits.maximumRestarts,0);assert.equal(r.finiteLimits.firstFullIsTerminal,true);
 const gates=r.labels.gateRoles,axes=r.labels.axisRoles,ids=new Set(gates.map(g=>g.id)),label=i=>'b'+String(i).padStart(2,'0'),labels=new Set(Array.from({length:N},(_,i)=>label(i)));
 assert.equal(ids.size,gates.length);assert.equal(new Set(axes.map(a=>a.body)).size,axes.length);for(const g of gates){assert(g.allowedSides.length&&g.allowedSides.every(s=>SIDES.includes(s)));integer(g.sizeRange[0],1,3);integer(g.sizeRange[1],g.sizeRange[0],3);if(g.frozen!==undefined)integer(g.frozen,1,N-1);}
 for(const a of axes){assert(labels.has(a.body)&&AXES.includes(a.axis)&&ids.has(a.gateRole));assert(gates.find(g=>g.id===a.gateRole).allowedSides.every(side=>parallel(a.axis,{side})));}
 assert.equal(r.openingRelations,undefined,'Old instant second-clear motif is not accepted');
 const region=r.activeRegion,o=r.starter;assert(region&&o);for(const k of ['x','y','width','height'])integer(region[k],k==='width'||k==='height'?1:0);
 assert(region.x+region.width<=source.width&&region.y+region.height<=source.height);assert(region.width*region.height<A,'A real perimeter is required');
 assert((region.x===0||region.x+region.width===source.width)&&(region.y===0||region.y+region.height===source.height),'Corner region touches two real outer board edges');
 assert(Array.isArray(region.bodyIds)&&new Set(region.bodyIds).size===region.bodyIds.length&&region.bodyIds.every(id=>labels.has(id)));
 for(const k of ['minimumHorizontalBars','minimumVerticalBars'])integer(region[k],0,region.bodyIds.length);
 const active=new Set(region.bodyIds),ice=r.labels.iceRoles;assert(Array.isArray(ice));assert.equal(new Set(ice.map(b=>b.body)).size,ice.length);
 assert.equal(ice.length,N-active.size,'Every perimeter label has one immutable real numeric-ice role');for(const b of ice){assert(labels.has(b.body)&&!active.has(b.body));integer(b.frozen,2,N-1);}
 assert(labels.has(o.body)&&active.has(o.body)&&ids.has(o.gateRole));assert.equal(o.area,2);assert.equal(o.onlyInitiallyAvailableExit,true);assert(!axes.some(a=>a.body===o.body));assert(!gates.find(g=>g.id===o.gateRole).frozen);
 integer(r.authoredInventory.maximumSingleCellBodies,0,N);assert(Array.isArray(r.authoredInventory.allowedRectangleDimensions));for(const [w,h]of r.authoredInventory.allowedRectangleDimensions){integer(w,1,3);integer(h,1,3);assert(w*h<=6&&DIMS.some(d=>d[0]===w&&d[1]===h));}
 integer(r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears,0,source.blocks.length);assert(r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction>=0&&r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction<=1);integer(r.redesignRequirements.minimumChangedPhysicalGateApertures,0,gates.length);
 if(opts.qualificationOnly){assert(source.id>=990000&&A<=16&&N<=8,'Tiny synthetic qualification only');const q=opts.qualificationConstraints;assert(Object.keys(q).every(k=>['gatePins','bodyPins','roleColours','coverageSupport','incrementalDomains','ordinaryTail'].includes(k)));if(q.ordinaryTail!==undefined)assert.equal(typeof q.ordinaryTail,'boolean');if(q.incrementalDomains!==undefined)assert.equal(typeof q.incrementalDomains,'boolean');if(q.coverageSupport!==undefined)assert.equal(typeof q.coverageSupport,'boolean');for(const[id,pin]of Object.entries(q.gatePins??{})){assert(ids.has(id));assert(Object.keys(pin).every(k=>['side','offset','size'].includes(k)));}for(const[id,pin]of Object.entries(q.bodyPins??{})){assert(labels.has(id));assert(Object.keys(pin).every(k=>['x','y','dimensions','gateRoles'].includes(k)));if(pin.gateRoles)assert(pin.gateRoles.length&&pin.gateRoles.every(g=>ids.has(g)));}}
 else {assert.deepEqual(opts.qualificationConstraints,{});const d=opts.proposalDescriptor;assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));const bytes=fs.readFileSync(d.path);assert.equal(hash(bytes),d.sha256);const p=JSON.parse(bytes);assert.equal(p.schemaVersion,1);assert(Array.isArray(p.recipes));const exact=p.recipes.find(q=>q.recipeId===r.recipeId);assert(exact);assert.deepEqual(r,exact,'Production recipe must be the immutable task-reviewed declaration');assert.equal(levelSha256(source),r.source.levelSha256);assert(A<=63,'Qualified normal-board template area cap');integer(N,14,23);integer(active.size,8,10);assert([[4,4],[4,5],[5,4],[3,6],[6,3]].some(([w,h])=>region.width===w&&region.height===h),'Declared finite active-region dimensions');assert(region.minimumHorizontalBars>=2&&region.minimumVerticalBars>=2);assert(r.authoredInventory.maximumSingleCellBodies<=3);for(const n of[2,3,4,7,8])assert(ice.some(b=>b.frozen===n),'Production early+late thaw profile');assert(r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction>=.5);const queued=new Set((source.generators??[]).flatMap(g=>g.queueBlockIds));const openingCount=source.blocks.filter(b=>!b.shutterId&&!queued.has(b.id)).length;assert(r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears>=Math.ceil(openingCount/2));assert.equal(axes.length,4);assert.equal(axes.filter(a=>a.axis==='horizontal').length,2);assert.equal(axes.filter(a=>a.axis==='vertical').length,2);assert.deepEqual(gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[7,8]);assert.equal(gates.length,8);assert.deepEqual(meter.report().limits,CAPS);}
 const future=opts.futureReservations;assert(Array.isArray(future));assert.equal(new Set(future.map(q=>q.reason)).size,future.length);for(const q of future){assert(typeof q.reason==='string'&&q.reason&&q.reason!=='first-full-world');assert(Object.keys(q).every(k=>['reason','worlds','transitions','micro'].includes(k)));for(const k of ['worlds','transitions','micro'])integer(q[k]??0);}
 if(!opts.qualificationOnly){assert.deepEqual(future.map(q=>q.reason),['static-audit','spatial-compile','dual-replay','terminal-guard']);assert.deepEqual(future.map(q=>q.worlds),[16,16,r.proposedWholeWorldBudget.dualReplayReservation,1]);}
 return{N,A,label};
}

export function createAxisIceWholeBoardFactory(source,recipe,catalogue,meter,{qualificationOnly=false,qualificationConstraints={},futureReservations=[],proposalDescriptor=PROPOSAL}={}){
 const opts={qualificationOnly,qualificationConstraints,futureReservations,proposalDescriptor},spec=checkedRecipe(source,recipe,catalogue,meter,opts),r=freeze(clone(recipe)),W=source.width,H=source.height,{N,A,label}=spec,sourceSHA=levelSha256(source),recipeSHA=levelSha256(r),q=freeze(clone(qualificationConstraints));
 const declaredFuture=freeze(clone(futureReservations));
 const roles=r.labels.gateRoles,axisRoles=new Map(r.labels.axisRoles.map(x=>[x.body,x])),iceRoles=new Map(r.labels.iceRoles.map(x=>[x.body,x.frozen])),region=r.activeRegion,activeLabels=new Set(region.bodyIds),opening=r.starter,firstIndex=Number(opening.body.slice(1));
 const randomColour=random(r.colourSeed),allColours=[...new Set(catalogue.shapes.flatMap(s=>s.colours))].sort().map(c=>({c,rank:randomColour()})).sort((a,b)=>a.rank-b.rank).map(x=>x.c),colours=q.roleColours??allColours.slice(0,roles.length);assert.equal(colours.length,roles.length);assert.equal(new Set(colours).size,colours.length);assert(colours.every(c=>allColours.includes(c)));
 const roleColour=new Map(roles.map((g,i)=>[g.id,colours[i]])),rnd=random(r.seed),pruneCounts={},domainsSummary=[],gateAssignments=new Map(),partialAssignmentCount={gate:0,body:0},domainReuse={ordinaryCompilationReferences:0,incrementalReferences:0},ordinaryTailStats={entries:0,childNodes:0,cellBranches:0,canonicalCompletions:0};let used=false,full=null,firstFullReceipt=null,status='NOT_STARTED',reason=null;
 const prune=k=>{pruneCounts[k]=(pruneCounts[k]??0)+1;return false;},footprints=new Map();const queued=new Set((source.generators??[]).flatMap(g=>g.queueBlockIds));const sourceOpening=source.blocks.filter(b=>!b.shutterId&&!queued.has(b.id));for(const b of sourceOpening)footprints.set(footprint(b),b.shape.length);const openingArea=sourceOpening.reduce((n,b)=>n+b.shape.length,0),sourceGates=new Set((source.gates??[]).map(aperture));
 const dimensionSet=new Set(r.authoredInventory.allowedRectangleDimensions.map(d=>d.join(','))),shapes=catalogue.shapes.filter(s=>dimensionSet.has([s.w,s.h].join(',')));assert(shapes.length);
 // Only identical full role domains are interchangeable. Region and initial
 // ice are part of the class; no frozen label can inherit a free-body domain.
 const groupKeys=Array.from({length:N},(_,i)=>i===firstIndex||axisRoles.has(label(i))||q.bodyPins?.[label(i)]?null:JSON.stringify([activeLabels.has(label(i)),iceRoles.get(label(i))??0]));
 const nonSpecial=Array.from({length:N},(_,i)=>i).filter(i=>groupKeys[i]!==null),sameGroup=(i,j)=>groupKeys[i]!==null&&groupKeys[i]===groupKeys[j];
 const report=()=>({version:VERSION,budgetAccountingVersion:'stage-separated-construction-v1',stageSeparated:true,futureReservationsDeclared:clone(declaredFuture),futureReservationsPaid:false,futureVerificationExecuted:false,qualificationOnly,status,reason,recipeSha256:recipeSHA,sourceLevelSha256:sourceSHA,partialAssignmentCount:clone(partialAssignmentCount),pruneCounts:clone(pruneCounts),domainCounts:clone(domainsSummary),domainReuse:clone(domainReuse),ordinaryTail:clone(ordinaryTailStats),optimizationChoices:{sameDomainOrdinaryMinimumCoverTail:q.ordinaryTail!==false,tailCanonicalIdsOnlyAfterWorldPrepayment:true,incrementalDomains:q.incrementalDomains!==false,qualificationNaiveReference:qualificationOnly&&q.incrementalDomains===false,domainClassIncludesRegionAndIce:true},accounting:meter.report(),firstFullWorlds:firstFullReceipt?1:0,firstFullReceipt:clone(firstFullReceipt),placeholderWorlds:0,newModels:0,newSearches:0,newReplays:0,newClaims:0,necessaryOpeningOnly:true,domainDesignChoices:{activeRegion:clone(region),starter:clone(opening),iceRoles:clone(r.labels.iceRoles),onlyStarterInitiallyAvailable:true,forcedSecondClear:false,normalWholeBoard:true,realFrozenPerimeter:true,permanentWalls:false,mathematicalDifficultyClaimed:false,earlyReleasePolicy:'explicit-new-engineering-profile-not-uniform-v3-counter-pass',axisAtOrdinaryPortalExcludedEvenIfBodyFrozen:true,axisPortalExclusionReason:'after-body-thaw-first-pointer-down-would-clear-without-axis-movement'},productionQualified:false});
 function mask(x,y,w,h){let m=0n;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){meter.transition('shape-cell-mask');m|=1n<<BigInt((y+yy)*W+x+xx);}return m;}
 function gateOptions(role){const out=[];for(const side of role.allowedSides){const length=['top','bottom'].includes(side)?W:H;for(let size=role.sizeRange[0];size<=role.sizeRange[1];size++)for(let offset=0;offset+size<=length;offset++){meter.transition('gate-domain');const g={id:role.id,color:roleColour.get(role.id),side,offset,size,...role.frozen?{frozen:role.frozen}:{}};const pin=q.gatePins?.[role.id];if(pin&&Object.entries(pin).some(([k,v])=>g[k]!==v))continue;out.push({g,rank:rnd()+size*.04});}}return out.sort((a,b)=>a.rank-b.rank).map(x=>x.g);}
 function compatibleGate(g,b){meter.transition('gate-overlap');return g.side!==b.side||Math.max(g.offset,b.offset)>=Math.min(g.offset+g.size,b.offset+b.size);}
 function bodyOptions(i,gates){const name=label(i),axisRole=axisRoles.get(name),pin=q.bodyPins?.[name],required=axisRole?.gateRole??(i===firstIndex?opening.gateRole:null),isActive=activeLabels.has(name),ice=iceRoles.get(name)??0,out=[];
  for(const s of shapes)for(let y=0;y+s.h<=H;y++)for(let x=0;x+s.w<=W;x++){meter.transition('body-shape-pose');meter.micro('body-shape-pose');if(pin&&(pin.x!==undefined&&x!==pin.x||pin.y!==undefined&&y!==pin.y||pin.dimensions&&pin.dimensions.join(',')!==[s.w,s.h].join(',')))continue;
   meter.transition('region-pose-membership');const inside=x>=region.x&&y>=region.y&&x+s.w<=region.x+region.width&&y+s.h<=region.y+region.height,overlaps=x<region.x+region.width&&x+s.w>region.x&&y<region.y+region.height&&y+s.h>region.y;if(isActive?!inside:overlaps)continue;if(i===firstIndex&&s.w*s.h!==2)continue;
   for(const g of gates){meter.transition('body-colour-axis-domain');if(required&&g.id!==required||pin?.gateRoles&&!pin.gateRoles.includes(g.id)||!s.colours.includes(g.color))continue;const vertical=['top','bottom'].includes(g.side),span=vertical?s.w:s.h;if(span>g.size)continue;
    const a={x,y,w:s.w,h:s.h,shape:s.shape,shapeId:s.shapeId,color:g.color,gateRole:g.id,axis:axisRole?.axis??null,ice,release:Math.max(ice,g.frozen??0),activeRegion:isActive,area:s.w*s.h};if(a.axis&&(!parallel(a.axis,g)||(a.axis==='horizontal'?(y<g.offset||y+s.h>g.offset+g.size):(x<g.offset||x+s.w>g.offset+g.size))))continue;
    // An axis body touching its ordinary gate cannot demonstrate movement:
    // even when initially body-frozen, its first action after thaw exits at
    // pointer-down. This is a participation-oriented construction choice,
    // distinct from initial availability. A still-frozen gate may allow
    // real movement before that portal opens and remains in the domain.
    if(a.axis&&!g.frozen&&atGate(a,g,W,H))continue;
    if(i!==firstIndex&&!ice&&!g.frozen&&atGate(a,g,W,H)){prune('non-starter-initial-ordinary-contact');continue;}
    if(i===firstIndex&&!atGate(a,g,W,H))continue;
    a.mask=mask(x,y,s.w,s.h);a.footprint=footprint(a);a.retainedArea=footprints.get(a.footprint)??0;a.rank=(a.retainedArea?1:0)+Math.abs(a.area-A/N)*.08+rnd();a.symmetryKey=[y*W+x,s.w,s.h,colours.indexOf(g.color)].join(':');out.push(a);
   }}return out.sort((a,b)=>a.rank-b.rank||a.symmetryKey.localeCompare(b.symmetryKey));}
 function bodySearch(gates){
  // Ordinary unpinned labels have the same physical domain. Compile once and
  // reuse its deterministic rank order. This changes v2 RNG consumption, so
  // no v2 first-full equivalence is claimed. Pinned labels never join it.
  const sharedDomains=new Map(),domains=Array.from({length:N},(_,i)=>{if(nonSpecial.includes(i)){const key=groupKeys[i];if(sharedDomains.has(key)){meter.transition('ordinary-domain-share');domainReuse.ordinaryCompilationReferences++;return sharedDomains.get(key);}const d=bodyOptions(i,gates);sharedDomains.set(key,d);return d;}return bodyOptions(i,gates);});
  domainsSummary.push({gatePlan:domainsSummary.length,choices:domains.map(d=>d.length)});if(domains.some(d=>!d.length))return prune('empty-initial-domain');const selected=new Map(),gateMap=new Map(gates.map(g=>[g.id,g])),areaByDomain=new WeakMap(),thresholdSet=new Set();for(const b of r.labels.iceRoles){meter.transition('release-threshold-role');thresholdSet.add(b.frozen);}for(const g of gates){meter.transition('release-threshold-gate');if(g.frozen)thresholdSet.add(g.frozen);}const thresholds=[...thresholdSet];
  function partialBounds(chosen,remaining){
   let area=0,singles=0,retainedArea=0,retainedBodies=0,horizontalBars=0,verticalBars=0;const usedColours=new Set();meter.transition('partial-global-bounds');
   for(const a of chosen){meter.transition('selected-scalar-body');area+=a.area;singles+=Number(a.area===1);retainedArea+=a.retainedArea;retainedBodies+=Number(a.retainedArea>0);usedColours.add(a.color);horizontalBars+=Number(a.activeRegion&&a.h===1&&a.w>1);verticalBars+=Number(a.activeRegion&&a.w===1&&a.h>1);}
   // min/max are properties of an immutable domain array. Pay once per
   // inspected option and reuse only that calculation. Each remaining label
   // still contributes its own min/max to the total, even for a shared array.
   let minimumRemainingArea=0,maximumRemainingArea=0;for(const d of remaining){meter.transition('area-variable-reference');let bounds=areaByDomain.get(d.options);if(!bounds){let min=Infinity,max=-Infinity;for(const a of d.options){meter.transition('area-domain-option');min=Math.min(min,a.area);max=Math.max(max,a.area);}bounds={min,max};areaByDomain.set(d.options,bounds);}else meter.transition('area-domain-reuse');minimumRemainingArea+=bounds.min;maximumRemainingArea+=bounds.max;}
   if(area+minimumRemainingArea>A||area+maximumRemainingArea<A)return prune('area-bound');
   if(singles>r.authoredInventory.maximumSingleCellBodies)return prune('single-cell-limit');
   if(retainedBodies>sourceOpening.length-r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears||retainedArea>openingArea*(1-r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction))return prune('source-footprint-retention');
   const colourSupport=new Set(usedColours),colourDomains=new Set();for(const d of remaining){meter.transition('colour-group-reference');if(colourDomains.has(d.options)){meter.transition('colour-domain-reuse');continue;}colourDomains.add(d.options);for(const a of d.options){meter.transition('colour-support');colourSupport.add(a.color);}}if(colourSupport.size!==roles.length||roles.length-usedColours.size>remaining.length)return prune('all-colours-bound');
   let possibleH=0,possibleV=0;for(const d of remaining){let h=false,v=false;for(const a of d.options){meter.transition('active-bar-support');h ||= a.activeRegion&&a.h===1&&a.w>1;v ||= a.activeRegion&&a.w===1&&a.h>1;if(h&&v)break;}possibleH+=Number(h);possibleV+=Number(v);}if(horizontalBars+possibleH<region.minimumHorizontalBars||verticalBars+possibleV<region.minimumVerticalBars)return prune('active-bar-inventory');
   const iceChecks=necessaryReleaseSupport(chosen,remaining,thresholds,meter);if(!iceChecks)return prune('ice-clear-inventory-bound');
   if(q.coverageSupport!==false&&!necessaryCoverSupport(chosen,remaining,A,meter))return prune('initial-coverage');
   return{area,singles,retainedArea,retainedBodies,usedColours,iceChecks,horizontalBars,verticalBars};
  }
  function lastScalarAllowed(a,bounds){const {area,singles,retainedArea,retainedBodies,usedColours,iceChecks,horizontalBars,verticalBars}=bounds;let iceCapacity=true;for(const c of iceChecks){meter.transition('ice-capacity-last-scalar');if(c.eligible+Number(a.release<c.threshold)<c.threshold)iceCapacity=false;}if(horizontalBars+Number(a.activeRegion&&a.h===1&&a.w>1)<region.minimumHorizontalBars||verticalBars+Number(a.activeRegion&&a.w===1&&a.h>1)<region.minimumVerticalBars||!iceCapacity||area+a.area!==A||singles+Number(a.area===1)>r.authoredInventory.maximumSingleCellBodies||new Set([...usedColours,a.color]).size!==roles.length||retainedBodies+Number(a.retainedArea>0)>sourceOpening.length-r.redesignRequirements.minimumSourceBodiesWhoseFootprintDisappears||retainedArea+a.retainedArea>openingArea*(1-r.redesignRequirements.minimumOriginalOpeningFootprintAreaChangedFraction))return prune('last-scalar-bound');return true;
}
  function materializeFirstFull(commitSelection,tailMetadata={}){
     // No completed uncoloured or ordinary object has existed. This last
     // joint variable makes the entire actual physical input determined.
     // v4 future static/compile/replay quotes remain declarations. The task
     // pays them only when those separate phases actually start. They are
     // never silently charged against this construction or a search quota.
     const total={worlds:1,transitions:0,micro:0};meter.reserve(total,'construction-first-full-world');
     firstFullReceipt={...tailMetadata,budgetAccountingVersion:'stage-separated-construction-v1',stageSeparated:true,firstFullWorlds:1,constructionReservation:total,futureReservationsDeclared:clone(declaredFuture),futureReservationsPaid:false,futureVerificationExecuted:false,reservation:total,allMechanismsBeforeFirstHash:true,firstCompleteIsTerminal:true};commitSelection();
     const blocks=Array.from({length:N},(_,i)=>{const b=selected.get(i);return{id:r.labels.bodyPrefix+label(i),x:b.x,y:b.y,shape:clone(b.shape),color:b.color,...b.axis?{movementAxis:b.axis}:{},...b.ice?{frozen:b.ice}:{}};});
     full={id:source.id,name:'每日挑战 '+r.recipeId,difficulty:'super',reward:0,width:W,height:H,...source.playable?{playable:clone(source.playable)}:{},timeSeconds:source.timeSeconds,parMoves:source.parMoves,mechanismRules:'revised-2026-09-27-v1.5',blocks,gates:gates.map(g=>({...g,id:r.labels.bodyPrefix+g.id}))};
     firstFullReceipt.levelSha256=levelSha256(full);meter.transition('post-full-opening-receipt');firstFullReceipt.openingRelation={starterBody:r.labels.bodyPrefix+opening.body,starterGate:r.labels.bodyPrefix+opening.gateRole,starterArea:2,activeRegion:clone(region),numericIceRoles:clone(r.labels.iceRoles),onlyStarterInitiallyAvailable:true,forcedSecondClear:false,necessaryLocalGeometryOnly:true,completeRouteProven:false};return true;
  }
  function tailSearch(ids,base,pool,tailChosen,lastPlaced=null,knownBounds=null){
   if(!knownBounds){meter.node();partialAssignmentCount.body++;ordinaryTailStats.childNodes++;meter.guard();pool=incrementalDomainFilter(pool,lastPlaced,meter);if(!pool.length)return prune('empty-compatible-domain');}
   let bounds=knownBounds;if(!bounds){const chosen=[];for(const a of base){meter.transition('tail-chosen-reference');chosen.push(a);}for(const a of tailChosen){meter.transition('tail-chosen-reference');chosen.push(a);}const remaining=[];for(let i=tailChosen.length;i<ids.length;i++){meter.transition('tail-variable-reference');remaining.push({i:ids[i],options:pool});}bounds=partialBounds(chosen,remaining);if(!bounds)return false;}
   let occupied=0n;for(const a of base){meter.transition('tail-occupied-mask');occupied|=a.mask;}for(const a of tailChosen){meter.transition('tail-occupied-mask');occupied|=a.mask;}
   const cell=minimumOrdinaryCoverCell(pool,occupied,W,H,meter);if(!cell||!cell.options.length)return prune('ordinary-tail-zero-cover');
   for(const a of cell.options){meter.transition('ordinary-tail-branch');ordinaryTailStats.cellBranches++;
    if(tailChosen.length===ids.length-1){if(!lastScalarAllowed(a,bounds))continue;
     // Only n-1 still-partial bodies are sorted before the world debit. The
     // last body's insertion position is a scalar. No complete candidate
     // list or final ID assignment exists before atomic first-full reserve.
     const ordered=[];for(const b of tailChosen){meter.transition('tail-canonical-partial-copy');ordered.push(b);}let comparisons=0;
     for(let i=1;i<ordered.length;i++){const b=ordered[i];let j=i-1;for(;j>=0;j--){meter.transition('tail-canonical-partial-comparison');comparisons++;if(ordered[j].symmetryKey<=b.symmetryKey)break;meter.transition('tail-canonical-partial-move');ordered[j+1]=ordered[j];}meter.transition('tail-canonical-partial-move');ordered[j+1]=b;}
     let position=0;while(position<ordered.length){meter.transition('tail-last-rank-comparison');comparisons++;if(a.symmetryKey<ordered[position].symmetryKey)break;position++;}
     // One actual source-reference read and one Map assignment per ID. This
     // finite debit occurs before firstFull; if insufficient, world count is
     // still zero. The following commit consumes these prepaid operations.
     meter.transition('tail-canonical-id-read-write-prepaid',2*ids.length);
     return materializeFirstFull(()=>{for(let i=0;i<ids.length;i++)selected.set(ids[i],i<position?ordered[i]:i===position?a:ordered[i-1]);ordinaryTailStats.canonicalCompletions++;},{ordinaryTailCanonicalAssignment:{count:ids.length,partialSortComparisons:comparisons,prepaidIdReadWrites:2*ids.length,priorDomainBoundsPreserved:true}});
    }
    tailChosen.push(a);if(tailSearch(ids,base,pool,tailChosen,a))return true;tailChosen.pop();
   }return false;
  }
  function compatible(a,b){meter.transition('body-pair');return !(a.mask&b.mask)&&!(a.color===b.color&&adjacency(a,b));}
  function search(parentDomains,lastPlaced=null){meter.node();partialAssignmentCount.body++;meter.guard();let remaining=[];const chosen=[],filteredGroups=new Map(),nextDomains=new Array(N);for(const b of selected.values()){meter.transition('selected-body-reference');chosen.push(b);}
   for(let i=0;i<N;i++)if(!selected.has(i)){
    let options;meter.transition('incremental-domain-reference');
    if(q.incrementalDomains===false){
     // Qualification-only slow reference: same compiled/ranked domains,
     // original full chosen-set checks; not a production retry mechanism.
     options=[];for(const a of domains[i]){meter.transition('domain-filter');if(!chosen.every(b=>compatible(a,b)))continue;
      if(nonSpecial.includes(i)){let ok=true;for(const[j,b]of selected)if(sameGroup(i,j)){meter.transition('ordinary-label-symmetry');if((j<i&&b.symmetryKey>=a.symmetryKey)||(j>i&&b.symmetryKey<=a.symmetryKey)){ok=false;break;}}if(!ok)continue;}
      options.push(a);
     }
    }else if(!lastPlaced){options=parentDomains[i];}
    else{
     const j=lastPlaced.i,b=lastPlaced.a,ordinaryOrder=sameGroup(i,j)?(j<i?1:-1):0,policy=String(ordinaryOrder),original=parentDomains[i];
     let group=filteredGroups.get(original);if(!group){group=new Map();filteredGroups.set(original,group);}
     if(group.has(policy)){meter.transition('incremental-domain-reuse');domainReuse.incrementalReferences++;options=group.get(policy);}
     else{options=incrementalDomainFilter(original,b,meter,{ordinaryOrder});group.set(policy,options);}
    }
    if(!options.length)return prune('empty-compatible-domain');meter.transition('incremental-child-domain-reference');nextDomains[i]=options;remaining.push({i,options});
   }
   const bounds=partialBounds(chosen,remaining);if(!bounds)return false;
   if(q.ordinaryTail!==false&&remaining.length>=2){let exchangeable=true;const ids=[];for(const d of remaining){meter.transition('tail-exchangeable-label-check');if(!nonSpecial.includes(d.i)||d.options!==remaining[0].options){exchangeable=false;break;}meter.transition('tail-label-reference-copy');ids.push(d.i);}if(exchangeable){ids.sort((a,b)=>{meter.transition('tail-label-sort-comparison');return a-b;});const lo=ids[0],hi=ids.at(-1);for(const i of selected.keys()){meter.transition('tail-prior-label-boundary');if(sameGroup(i,lo)&&i>lo&&i<hi){exchangeable=false;break;}}if(exchangeable){ordinaryTailStats.entries++;return tailSearch(ids,chosen,remaining[0].options,[],null,bounds);}}}
   remaining.sort((a,b)=>Number(b.i===firstIndex)-Number(a.i===firstIndex)||a.options.length-b.options.length||a.i-b.i);const next=remaining[0];
   for(const a of next.options){meter.transition('partial-branch');if(remaining.length===1){if(!lastScalarAllowed(a,bounds))continue;return materializeFirstFull(()=>selected.set(next.i,a));
    }selected.set(next.i,a);if(search(nextDomains,{i:next.i,a}))return true;selected.delete(next.i,a);
   }return false;
  }return search(domains);
 }
 function constructOnce(){assert(!used,'One recipe session is terminal; no second construction');used=true;status='CONSTRUCTING';try{assert.equal(levelSha256(source),sourceSHA,'Existing source changed');const gateDomains=new Map(roles.map(g=>[g.id,gateOptions(g)]));
   function gateSearch(){meter.node();partialAssignmentCount.gate++;
    if(gateAssignments.size===1&&!necessaryStarterGateSupport(gateAssignments.get(opening.gateRole),region,W,H,shapes,meter))return prune('starter-gate-necessary');
    if(gateAssignments.size===roles.length){const gates=roles.map(g=>gateAssignments.get(g.id));if(gates.filter(g=>!sourceGates.has(aperture(g))).length<r.redesignRequirements.minimumChangedPhysicalGateApertures)return prune('physical-gate-change');return bodySearch(gates);}
    const unassigned=roles.filter(g=>!gateAssignments.has(g.id)).map(g=>({g,options:gateDomains.get(g.id).filter(a=>[...gateAssignments.values()].every(b=>compatibleGate(a,b)))}));if(unassigned.some(d=>!d.options.length))return prune('rim-pack');const priority=id=>id===opening.gateRole?-1:0;unassigned.sort((a,b)=>priority(a.g.id)-priority(b.g.id)||a.options.length-b.options.length||a.g.id.localeCompare(b.g.id));const next=unassigned[0];for(const g of next.options){meter.transition('gate-branch');gateAssignments.set(g.id,g);if(gateSearch())return true;gateAssignments.delete(g.id);}return false;
   }const found=gateSearch();meter.guard();status=found?'FIRST_FULL_AXIS_ICE_TERMINAL':'FINITE_JOINT_DOMAIN_EXHAUSTED';
  }catch(e){status='WHOLEBOARD_CONSTRUCTION_TERMINAL';reason=e.message;}
  return freeze({status,reason,found:full!==null,level:full,levelSha256:full?levelSha256(full):null,firstFullReceipt,accounting:meter.report(),constructionAccounting:report(),nativeBindings:catalogue.assetBindings,recipeSha256:recipeSHA,formalReady:false});
 }
 return Object.freeze({constructOnce,report});
}
