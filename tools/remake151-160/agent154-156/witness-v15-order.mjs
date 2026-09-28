// DERIVED WITNESS DISCOVERY ONLY. Base tools/campaign-v145/lv141-150/round2-a/witness-greedy.mjs SHA 9f27d25ca39737588a563798efa65fcd95b398af9189da565ceea827bc785578.
// New v1.5 stable headless flip phase: before frozen thaw, unchanged; after thaw
// toggles once for each subsequent clear. Full candidate stays original v1.5.
// This graph is never a difficulty lower-bound or GUI-interleaving proof.
// Every accepted route MUST fresh-replay the unmodified actual PuzzleModel.
// WITNESS ONLY FIFO extension; not qualified for lower-bound proof.
/** Isolated v1.47 star extension of the qualified full inventory spatial domain.
 * New qualification: pipeline/spatial-star-domain.test.mjs. Not a production runtime.
 * Optional contact only relaxes exit timing, retaining all bodies and mechanisms.
 */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
export const NONE=65535;
export const QUEUED=65534;
export const key=s=>String.fromCharCode(...s);
/** Exact identity quotient only. Nodes/routes keep real labeled states. */
export function equivalentBlockGroups(c){
 const by=new Map();for(const [i,b]of c.blocks.entries()){
  const signature=JSON.stringify({shape:[...b.shape].sort((a,z)=>a[1]-z[1]||a[0]-z[0]),layers:b.layers,ice:b.ice,axis:b.movementAxis??null,star:Boolean(b.star),keyId:b.keyId??null,lockedBy:b.lockedBy??null,lockCount:b.lockCount??null,owner:b.cover?.id??null});
  if(!by.has(signature))by.set(signature,[]);by.get(signature).push(i);
 }return [...by.values()].filter(g=>g.length>1);
}
export function canonicalKey(s,groups){if(!groups.length)return key(s);const t=s.slice();for(const g of groups){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>t[i]=values[j]);}return key(t);}
let apiPromise;
export function loadSpatialApi(){return apiPromise??=build({stdin:{resolveDir:process.cwd(),contents:`export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}).then(r=>import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')));}
const overlap=(a,b)=>a.some((v,i)=>v&b[i]);
const add=(a,b)=>{for(let i=0;i<a.length;i++)a[i]|=b[i];};
const mask=(cells,W,words)=>{const out=Array(words).fill(0);for(const[x,y]of cells){const p=y*W+x;out[p>>>5]|=1<<(p&31);}return out;};
const cellKey=p=>p.join(',');
// WITNESS filter: the original optional-contact floor domain deliberately
// permits optimistic departures. Canonical witnesses retain the rigid shape's
// entire straight sweep, including cells in a concave shape's recesses.
function exitSweepClear(c,b,p,ex,occ){
 if(!ex.sweep){const out=Array(c.words).fill(0),side=ex.side,negative=side==='left'||side==='top',horizontal=side==='left'||side==='right',x=p%c.W,y=Math.floor(p/c.W),offsets=b.shape.map(([dx,dy])=>horizontal?dx:dy),boundary=horizontal?ex.portal.origin[0]+(negative?0:1):ex.portal.origin[1]+(negative?0:1),distance=negative?(horizontal?x:y)+Math.max(...offsets)+1-boundary:boundary-(horizontal?x:y)-Math.min(...offsets);for(let step=1;step<=distance;step++)for(const[dx,dy]of b.shape){const xx=x+dx+(horizontal?(negative?-step:step):0),yy=y+dy+(!horizontal?(negative?-step:step):0);if(xx>=0&&xx<c.W&&yy>=0&&yy<c.H){const at=yy*c.W+xx;out[at>>>5]|=1<<(at&31);}}ex.sweep=out;}return !overlap(ex.sweep,occ);
}

/** Complete finite spatial domain: <=128 bounding cells, <=64 bodies, 0..2
 * color stages; keys/axis, body and gate ice, ordinary covers and true lifts.
 * No queue/flip/timer/grid/seam. Star constraints are retained. Gates use authoritative portal geometry.
 * A state retains every labeled pose/stage/removal plus each cover's actual
 * reveal clear-count. Thus ice revealed by a lift ages only AFTER real reveal.
 * Every held unit move settles all cohorts before enumerating its successor;
 * gesture closure keys the entire world, including reveal counts, not its pose.
 */
export function compileSpatial(level,api){
 api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');
 const original=level;level=structuredClone(level);level.mechanismRules='revised-2026-09-23-v1.4';
 const flipPhases=new Map((level.flipDoors??[]).map(d=>[d.id,{initiallyOpen:d.initiallyOpen,frozen:d.frozen??0}]));
 level.gates.push(...(level.flipDoors??[]).map(({initiallyOpen,...g})=>g));level.flipDoors=[];api.validateLevel(level);
 const W=level.width,H=level.height;assert(W*H<=128&&W>=2&&H>=2);assert(level.blocks.length<=64);
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,`Unsupported ${k}`);
 const allowedBlock=['id','x','y','shape','color','shutterId','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star'];
 for(const b of level.blocks){assert(Object.keys(b).every(k=>allowedBlock.includes(k)),`Unsupported block fields for ${b.id}`);assert((b.layers??[b.color]).length<=2);}
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals','star'].includes(k)),'Unsupported gate field');
 const cells=level.playable??Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]),blocked=new Set((level.blocked??[]).map(cellKey)),legal=new Set(cells.map(cellKey).filter(p=>!blocked.has(p)));
 const c={level,W,H,words:Math.ceil(W*H/32),N:level.blocks.length,choosePortal:api.choosePortalReleaseCandidate,covers:[],blocks:[],totalClears:level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0)};
 c.generators=level.generators??[];
 c.covers=(level.shutters??[]).map((s,j)=>{assert(Object.keys(s).every(k=>['id','x','y','width','height','count','skin'].includes(k)),'Unsupported cover field');assert(!s.skin||['shutter','lift'].includes(s.skin));const cells=Array.from({length:s.width*s.height},(_,p)=>[s.x+p%s.width,s.y+Math.floor(p/s.width)]);assert(cells.every(p=>legal.has(cellKey(p))));return{...s,j,stateIndex:c.N+j,mask:mask(cells,W,c.words),members:[]};});
 c.blocks=level.blocks.map((b,i)=>{
  const generator=c.generators.find(g=>g.queueBlockIds.includes(b.id));if(generator)b={...b,x:generator.spawn[0],y:generator.spawn[1]};
  const cover=b.shutterId?c.covers.find(s=>s.id===b.shutterId):null;assert(!b.shutterId||cover);if(cover){cover.members.push(i);assert(b.shape.every(([dx,dy])=>b.x+dx>=cover.x&&b.x+dx<cover.x+cover.width&&b.y+dy>=cover.y&&b.y+dy<cover.y+cover.height));}
  const layers=b.layers??[b.color],bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1])),poses=Array(W*H).fill(null);
  for(let y=0;y+bh<=H;y++)for(let x=0;x+bw<=W;x++){
   const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(!cells.every(p=>legal.has(cellKey(p))))continue;
   const exits=layers.map(color=>['top','right','bottom','left'].flatMap(side=>{
    if(b.movementAxis==='horizontal'&&['top','bottom'].includes(side)||b.movementAxis==='vertical'&&['left','right'].includes(side))return[];
    if(!api.exitFrontierFacesBoundary(level,cells,side))return[];
    const match=api.resolveMatchingGatePortal(level,cells,side,level.gates,[]);return match?.gate.color===color&&(!b.star||match.gate.star)?[{side,gate:match.gate,portal:match.portal,authoredPortal:Boolean(match.gate.portals?.length)}]:[];
   }));poses[y*W+x]={mask:mask(cells,W,c.words),exits,neighbors:[]};
  }
  for(let p=0;p<poses.length;p++)if(poses[p])for(const[dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   if(b.movementAxis==='horizontal'&&dy||b.movementAxis==='vertical'&&dx)continue;
   const x=p%W+dx,y=Math.floor(p/W)+dy,to=y*W+x;if(x>=0&&x<W&&y>=0&&y<H&&poses[to])poses[p].neighbors.push(to);
  }
  assert(poses[b.y*W+b.x]);return{...b,layers,poses,cover,queued:Boolean(generator),ice:b.frozen??0,initial:b.y*W+b.x};
 });
 assert(c.covers.every(s=>s.members.length));
 c.initial=Uint16Array.from([...c.blocks.map(b=>b.queued?QUEUED:b.initial),...c.covers.map(()=>NONE)]);settle(c,c.initial);
 c.level=original;c.flipPhases=flipPhases;
 const source=new api.PuzzleModel(original).snapshot();assertStateMatches(c,c.initial,source);return c;
}
function phaseOpen(c,id,count){const d=c.flipPhases.get(id);return !d||d.initiallyOpen!==Boolean(Math.max(0,count-d.frozen)%2);}
export function cleared(c,s){let n=0;for(let i=0;i<c.N;i++)n+=s[i]===QUEUED?0:s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}
export const visible=(c,s,i)=>s[i]!==NONE&&s[i]!==QUEUED&&(!c.blocks[i].cover||s[c.blocks[i].cover.stateIndex]!==NONE);
export function iceRemaining(c,s,i){const b=c.blocks[i];if(!b.ice||!visible(c,s,i))return b.ice;return Math.max(0,b.ice-(cleared(c,s)-(b.cover?s[b.cover.stateIndex]:0)));}
export function lockRemaining(c,s,i){const b=c.blocks[i];return b.lockedBy?Math.max(0,(b.lockCount??1)-c.blocks.reduce((n,a,j)=>n+Number(a.keyId===b.lockedBy&&s[j]===NONE),0)):0;}
export const active=(c,s,i)=>visible(c,s,i)&&iceRemaining(c,s,i)===0&&lockRemaining(c,s,i)===0;
export function occupied(c,s,excluded=-1,excludedCover){const out=Array(c.words).fill(0);for(const co of c.covers)if(co!==excludedCover&&co.skin!=='lift'&&s[co.stateIndex]===NONE)add(out,co.mask);for(let i=0;i<c.N;i++)if(i!==excluded&&visible(c,s,i))add(out,c.blocks[i].poses[s[i]&127].mask);return out;}
export function settle(c,s){let changed=true;const count=cleared(c,s);while(changed){changed=false;for(const co of c.covers){if(s[co.stateIndex]!==NONE)continue;
 if(co.skin==='lift'){if(c.blocks.some((b,i)=>visible(c,s,i)&&overlap(b.poses[s[i]&127].mask,co.mask)))continue;}else if(co.count>count)continue;
 const occ=occupied(c,s,-1,co);let ok=true;for(const i of co.members){const m=c.blocks[i].poses[s[i]&127].mask;if(overlap(m,occ)){ok=false;break;}add(occ,m);}if(ok){s[co.stateIndex]=count;changed=true;}
 }
 for(const g of c.generators){const i=g.queueBlockIds.map(id=>c.blocks.findIndex(b=>b.id===id)).find(i=>s[i]===QUEUED);if(i===undefined)continue;const b=c.blocks[i],occ=occupied(c,s);if(!overlap(b.poses[b.initial].mask,occ)){s[i]=b.initial;changed=true;}}
 }return s;}
export function eachReference(c,s,visit,{optionalExit=true,orderSeed=0,clearOnly=false}={}){
 const count=cleared(c,s);
 for(let ii=0;ii<c.N;ii++){const i=(ii+orderSeed)%c.N,b=c.blocks[i];if(!active(c,s,i))continue;
  const nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(ni,side)=>{const path=[];while(nodes[ni].parent>=0){const p=nodes[ni].s[i]&127;path.push([p%c.W,Math.floor(p/c.W)]);ni=nodes[ni].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<nodes.length;ni++){if(Date.now()>=c.witnessDeadline||ni>=c.maxHeldStates)return;
   const cur=nodes[ni].s,p=cur[i]&127,stage=cur[i]>>>7,pose=b.poses[p];let exits=pose.exits[stage].filter(ex=>count>=(ex.gate.frozen??0)&&phaseOpen(c,ex.gate.id,count)&&exitSweepClear(c,b,p,ex,occupied(c,cur,i)));
   if(!optionalExit&&exits.length){const prior=nodes[ni].parent>=0?nodes[nodes[ni].parent].s[i]&127:undefined,px=p%c.W,py=Math.floor(p/c.W),inferred=prior===undefined?undefined:px<prior%c.W?'left':px>prior%c.W?'right':py<Math.floor(prior/c.W)?'top':py>Math.floor(prior/c.W)?'bottom':undefined;const chosen=c.choosePortal(exits,{x:px+b.shape[0][0]+0.5,y:py+b.shape[0][1]+0.5},{innerX:0,innerY:0,innerWidth:c.W,innerHeight:c.H,cell:1},inferred);assert(chosen,'Canonical portal selection');exits=[chosen];}
   for(const ex of exits){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(ni,ex.side))===false)return;}
   if(exits.length&&!optionalExit)continue;
   if(ni&&!clearOnly&&visit(cur,1,()=>drag(ni))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlap(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:ni});}
  }
 }
}
/** With no future lift reveal, held unit moves do not change other world slots:
 * ordinary covers reveal only on clear events. Keep one occupied mask and BFS
 * poses; materialize full states only for emitted end/clear successors. */
export function eachFast(c,s,visit,{optionalExit=true,orderSeed=0,clearOnly=false}={}){
 assert(!c.covers.some(co=>co.skin==='lift'&&s[co.stateIndex]===NONE),'Unrevealed lifts require reference world closure');
 const count=cleared(c,s);
 for(let ii=0;ii<c.N;ii++){
  const i=(ii+orderSeed)%c.N,b=c.blocks[i];if(!active(c,s,i))continue;
  const start=s[i]&127,stage=s[i]>>>7,occ=occupied(c,s,i),parents=new Int16Array(c.W*c.H).fill(-2),queue=[start];parents[start]=-1;
  const drag=(p,side)=>{const path=[];for(let at=p;parents[at]>=0;at=parents[at])path.push([at%c.W,Math.floor(at/c.W)]);return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let qi=0;qi<queue.length;qi++){if(Date.now()>=c.witnessDeadline)return;
   const p=queue[qi],pose=b.poses[p];let exits=pose.exits[stage].filter(ex=>count>=(ex.gate.frozen??0)&&phaseOpen(c,ex.gate.id,count)&&exitSweepClear(c,b,p,ex,occ));
   if(!optionalExit&&exits.length){const prior=parents[p],px=p%c.W,py=Math.floor(p/c.W),inferred=prior<0?undefined:px<prior%c.W?'left':px>prior%c.W?'right':py<Math.floor(prior/c.W)?'top':py>Math.floor(prior/c.W)?'bottom':undefined;const chosen=c.choosePortal(exits,{x:px+b.shape[0][0]+0.5,y:py+b.shape[0][1]+0.5},{innerX:0,innerY:0,innerWidth:c.W,innerHeight:c.H,cell:1},inferred);assert(chosen);exits=[chosen];}
   for(const ex of exits){const next=s.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(p,ex.side))===false)return;}
   if(exits.length&&!optionalExit)continue;
   if(p!==start&&!clearOnly){const next=s.slice();next[i]=p|(stage<<7);if(visit(next,1,()=>drag(p))===false)return;}
   for(const to of pose.neighbors){if(parents[to]!==-2||overlap(b.poses[to].mask,occ))continue;parents[to]=p;queue.push(to);}
  }
 }
}
export function each(c,s,visit,options={}){return s.includes(QUEUED)||c.covers.some(co=>co.skin==='lift'&&s[co.stateIndex]===NONE)?eachReference(c,s,visit,options):eachFast(c,s,visit,options);}
export function normalizeClears(c,start,{optionalExit=true,orderSeed=0}={}){
 // Route discovery greedily clears across lift reveals; not a lower-bound graph.
 let s=start;const drags=[];for(;;){if(Date.now()>=c.witnessDeadline)return {s,drags};let choice;each(c,s,(candidate,cost,get)=>{if(cost===0&&candidate.reduce((n,v,i)=>n+Number(i<c.N&&v===NONE),0)>s.reduce((n,v,i)=>n+Number(i<c.N&&v===NONE),0)){choice=candidate;drags.push(get());return false;}},{optionalExit,clearOnly:true,orderSeed});if(!choice)return{s,drags};s=choice;}
}
export function assertStateMatches(c,s,snapshot){
 assert.equal(snapshot.blocks.length,c.blocks.filter((_,i)=>s[i]!==NONE&&s[i]!==QUEUED).length);assert.equal(snapshot.cleared,cleared(c,s));
 for(let i=0;i<c.N;i++){const b=c.blocks[i],a=snapshot.blocks.find(a=>a.id===b.id);if(s[i]===QUEUED){assert(!a);assert(snapshot.queuedBlocks.some(q=>q.id===b.id));continue;}if(s[i]===NONE){assert(!a);continue;}assert(a);assert.equal(a.x,(s[i]&127)%c.W);assert.equal(a.y,Math.floor((s[i]&127)/c.W));assert.deepEqual(a.layers,b.layers.slice(s[i]>>>7));assert.equal(a.frozen,iceRemaining(c,s,i));assert.equal(a.lockCount??0,lockRemaining(c,s,i));}
 for(const co of c.covers){const a=snapshot.shutters.find(a=>a.id===co.id);assert.equal(a.revealed,s[co.stateIndex]!==NONE);assert.equal(a.count,s[co.stateIndex]!==NONE?0:co.skin==='lift'?co.count:Math.max(0,co.count-cleared(c,s)));}
 for(const g of snapshot.gates)assert.equal(g.frozen,Math.max(0,(c.level.gates.find(a=>a.id===g.id).frozen??0)-cleared(c,s)));
}
export function replayDomain(c,drags,api){const model=new api.PuzzleModel(c.level);model.startCountdown();let state=c.initial,cost=0;assertStateMatches(c,state,model.snapshot());
 for(const d of drags){let next,stepCost;each(c,state,(s,k,get)=>{const e=get();if(e.blockId===d.blockId&&e.exitSide===d.exitSide&&JSON.stringify(e.path)===JSON.stringify(d.path)){next=s;stepCost=k;return false;}});assert(next,'Missing graph gesture');model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());assertStateMatches(c,next,model.snapshot());state=next;cost+=stepCost;}
 return{complete:model.snapshot().complete,cost,drags:drags.length,state};}
export function searchSpatial(level,api,{floor=Infinity,maxStates=500000,maxMilliseconds=10000,maxTransitions=5000000,weight=1000,orderSeed=0,prove=false,normalize=true,diagnosticTrace=false,symmetry=false,initialDrags=[]}={}){
 let c;try{c=compileSpatial(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 assert(!prove,'This unqualified FIFO extension is WITNESS DISCOVERY ONLY; independently replay real model.');
 let prefixCost=0;if(initialDrags.length){assert(api.replayRevisedRoute(level,initialDrags).valid);const prefix=replayDomain(c,initialDrags,api);c.initial=prefix.state;prefixCost=prefix.cost;}
 c.witnessDeadline=Date.now()+maxMilliseconds;c.maxHeldStates=512;
 const groups=symmetry&&!c.generators.length?equivalentBlockGroups(c):[],keyOf=s=>canonicalKey(s,groups);
 const normalized=s=>normalize?normalizeClears(c,s,{optionalExit:prove,orderSeed}):{s,drags:[]},start=normalized(c.initial),began=Date.now(),nodes=[{s:start.s,cost:prefixCost,parent:-1,clears:cleared(c,start.s),drags:[...initialDrags,...start.drags]}],seen=new Map([[keyOf(start.s),prefixCost]]),open=[0];let explored=0,transitions=0,stop,maxClearsSeen=cleared(c,start.s),bestNode=0;
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let at=open.length-1;while(at){const p=(at-1)>>1;if(score(open[p])>=score(open[at]))break;[open[p],open[at]]=[open[at],open[p]];at=p;}}
 function pop(){const result=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let n=p*2+1;if(n+1<open.length&&score(open[n+1])>score(open[n]))n++;if(score(open[p])>=score(open[n]))break;[open[p],open[n]]=[open[n],open[p]];p=n;}}return result;}
 const route=i=>{const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();};
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,maxClearsSeen,symmetryGroups:groups.map(g=>g.map(i=>c.blocks[i].id)),...(diagnosticTrace?{partialDrags:route(bestNode),partialState:[...nodes[bestNode].s],partialCost:nodes[bestNode].cost}:{}),elapsedMilliseconds:Date.now()-began,abstraction:'v102-witness-only-full-inventory-stable-v15-flip-phase',sourceLevelSha256:digest(level),solvabilityValidated:false,pointerValidated:false,timeValidated:false,releaseApproved:false,...extra});
 while(open.length){if(Date.now()-began>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(keyOf(n.s))<n.cost)continue;explored++;maxClearsSeen=Math.max(maxClearsSeen,n.clears);if(n.clears>nodes[bestNode].clears||n.clears===nodes[bestNode].clears&&n.cost<nodes[bestNode].cost)bestNode=ni;if(n.clears===c.totalClears)return result(prove?'relaxed-shortcut':'witness',{cost:n.cost,drags:route(ni)});
  each(c,n.s,(raw,k,get)=>{if(Date.now()-began>=maxMilliseconds||transitions>=maxTransitions){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}transitions++;const cost=n.cost+k;if(cost>=floor)return;const normal=normalized(raw),s=normal.s,sk=keyOf(s),prior=seen.get(sk);if(prior!==undefined&&prior<=cost)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(sk,cost);nodes.push({s,cost,parent:ni,clears:cleared(c,s),drags:[get(),...normal.drags]});push(nodes.length-1);},{optionalExit:prove,orderSeed});if(stop)break;
 }
 return result(stop?'unknown':prove?'threshold-proven':'exhausted',{termination:stop??'below-threshold-exhausted'});
}

