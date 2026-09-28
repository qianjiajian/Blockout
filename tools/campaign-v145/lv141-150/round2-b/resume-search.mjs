// Lv111–120 mixed-star extension. The prior spatial-domain-v2 stays unchanged.
// Qualification tests compare complete small graphs against PuzzleModel.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export const NONE=65535;
export const key=s=>String.fromCharCode(...s);
let apiPromise;
export function loadSpatialApi(){return apiPromise??=build({stdin:{resolveDir:process.cwd(),contents:`export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}).then(r=>import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')));}
const overlap=(a,b)=>a.some((v,i)=>v&b[i]);
const add=(a,b)=>{for(let i=0;i<a.length;i++)a[i]|=b[i];};
const mask=(cells,W,words)=>{const out=Array(words).fill(0);for(const[x,y]of cells){const p=y*W+x;out[p>>>5]|=1<<(p&31);}return out;};
const cellKey=p=>p.join(',');

/** Complete finite spatial domain: <=128 bounding cells, <=64 bodies, 0..2
 * color stages; keys/axis, body and gate ice, ordinary covers and true lifts.
 * No queue/flip/timer/grid/seam. Star status is preserved through all colour stages. Gates use authoritative portal geometry.
 * A state retains every labeled pose/stage/removal plus each cover's actual
 * reveal clear-count. Thus ice revealed by a lift ages only AFTER real reveal.
 * Every held unit move settles all cohorts before enumerating its successor;
 * gesture closure keys the entire world, including reveal counts, not its pose.
 */
export function compileSpatial(level,api){
 api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 const W=level.width,H=level.height;assert(W*H<=128&&W>=2&&H>=2);assert(level.blocks.length<=64);
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,`Unsupported ${k}`);
 const allowedBlock=['id','x','y','shape','color','shutterId','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star'];
 for(const b of level.blocks){assert(Object.keys(b).every(k=>allowedBlock.includes(k)),`Unsupported block fields for ${b.id}`);assert((b.layers??[b.color]).length<=2);}
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals','star'].includes(k)),'Unsupported gate field');
 const cells=level.playable??Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)]),blocked=new Set((level.blocked??[]).map(cellKey)),legal=new Set(cells.map(cellKey).filter(p=>!blocked.has(p)));
 const c={level,W,H,words:Math.ceil(W*H/32),N:level.blocks.length,covers:[],blocks:[],totalClears:level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0)};
 c.covers=(level.shutters??[]).map((s,j)=>{assert(Object.keys(s).every(k=>['id','x','y','width','height','count','skin'].includes(k)),'Unsupported cover field');assert(!s.skin||['shutter','lift'].includes(s.skin));const cells=Array.from({length:s.width*s.height},(_,p)=>[s.x+p%s.width,s.y+Math.floor(p/s.width)]);assert(cells.every(p=>legal.has(cellKey(p))));return{...s,j,stateIndex:c.N+j,mask:mask(cells,W,c.words),members:[]};});
 c.blocks=level.blocks.map((b,i)=>{
  const cover=b.shutterId?c.covers.find(s=>s.id===b.shutterId):null;assert(!b.shutterId||cover);if(cover){cover.members.push(i);assert(b.shape.every(([dx,dy])=>b.x+dx>=cover.x&&b.x+dx<cover.x+cover.width&&b.y+dy>=cover.y&&b.y+dy<cover.y+cover.height));}
  const layers=b.layers??[b.color],bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1])),poses=Array(W*H).fill(null);
  for(let y=0;y+bh<=H;y++)for(let x=0;x+bw<=W;x++){
   const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(!cells.every(p=>legal.has(cellKey(p))))continue;
   const exits=layers.map(color=>['top','right','bottom','left'].flatMap(side=>{
    if(b.movementAxis==='horizontal'&&['top','bottom'].includes(side)||b.movementAxis==='vertical'&&['left','right'].includes(side))return[];
    if(!api.exitFrontierFacesBoundary(level,cells,side))return[];
    const match=api.resolveMatchingGatePortal(level,cells,side,level.gates,[]);return match?.gate.color===color&&(!b.star||match.gate.star)?[{side,gate:match.gate}]:[];
   }));poses[y*W+x]={mask:mask(cells,W,c.words),exits,neighbors:[]};
  }
  for(let p=0;p<poses.length;p++)if(poses[p])for(const[dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   if(b.movementAxis==='horizontal'&&dy||b.movementAxis==='vertical'&&dx)continue;
   const x=p%W+dx,y=Math.floor(p/W)+dy,to=y*W+x;if(x>=0&&x<W&&y>=0&&y<H&&poses[to])poses[p].neighbors.push(to);
  }
  assert(poses[b.y*W+b.x]);return{...b,layers,poses,cover,ice:b.frozen??0,initial:b.y*W+b.x};
 });
 assert(c.covers.every(s=>s.members.length));
 c.initial=Uint16Array.from([...c.blocks.map(b=>b.initial),...c.covers.map(()=>NONE)]);settle(c,c.initial);
 const source=new api.PuzzleModel(level).snapshot();assertStateMatches(c,c.initial,source);return c;
}
export function cleared(c,s){let n=0;for(let i=0;i<c.N;i++)n+=s[i]===NONE?c.blocks[i].layers.length:s[i]>>>7;return n;}
export const visible=(c,s,i)=>s[i]!==NONE&&(!c.blocks[i].cover||s[c.blocks[i].cover.stateIndex]!==NONE);
export function iceRemaining(c,s,i){const b=c.blocks[i];if(!visible(c,s,i))return b.ice;return Math.max(0,b.ice-(cleared(c,s)-(b.cover?s[b.cover.stateIndex]:0)));}
export function lockRemaining(c,s,i){const b=c.blocks[i];return b.lockedBy?Math.max(0,(b.lockCount??1)-c.blocks.reduce((n,a,j)=>n+Number(a.keyId===b.lockedBy&&s[j]===NONE),0)):0;}
export const active=(c,s,i)=>visible(c,s,i)&&iceRemaining(c,s,i)===0&&lockRemaining(c,s,i)===0;
export function occupied(c,s,excluded=-1,excludedCover){const out=Array(c.words).fill(0);for(const co of c.covers)if(co!==excludedCover&&co.skin!=='lift'&&s[co.stateIndex]===NONE)add(out,co.mask);for(let i=0;i<c.N;i++)if(i!==excluded&&visible(c,s,i))add(out,c.blocks[i].poses[s[i]&127].mask);return out;}
export function settle(c,s){let changed=true;const count=cleared(c,s);while(changed){changed=false;for(const co of c.covers){if(s[co.stateIndex]!==NONE)continue;
 if(co.skin==='lift'){if(c.blocks.some((b,i)=>visible(c,s,i)&&overlap(b.poses[s[i]&127].mask,co.mask)))continue;}else if(co.count>count)continue;
 const occ=occupied(c,s,-1,co);let ok=true;for(const i of co.members){const m=c.blocks[i].poses[s[i]&127].mask;if(overlap(m,occ)){ok=false;break;}add(occ,m);}if(ok){s[co.stateIndex]=count;changed=true;}
 }}return s;}
export function each(c,s,visit,{optionalExit=true,orderSeed=0}={}){
 const count=cleared(c,s);
 for(let ii=0;ii<c.N;ii++){const i=(ii+orderSeed)%c.N,b=c.blocks[i];if(!active(c,s,i))continue;
  const nodes=[{s,parent:-1}],seen=new Set([key(s)]);
  const drag=(ni,side)=>{const path=[];while(nodes[ni].parent>=0){const p=nodes[ni].s[i]&127;path.push([p%c.W,Math.floor(p/c.W)]);ni=nodes[ni].parent;}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<nodes.length;ni++){
   const cur=nodes[ni].s,p=cur[i]&127,stage=cur[i]>>>7,pose=b.poses[p],exits=pose.exits[stage].filter(ex=>count>=(ex.gate.frozen??0));
   for(const ex of exits){const next=cur.slice();next[i]=stage+1<b.layers.length?p|((stage+1)<<7):NONE;settle(c,next);if(visit(next,0,()=>drag(ni,ex.side))===false)return;}
   if(exits.length&&!optionalExit)continue;
   if(ni&&visit(cur,1,()=>drag(ni))===false)return;
   const occ=occupied(c,cur,i);for(const to of pose.neighbors){if(overlap(b.poses[to].mask,occ))continue;const next=cur.slice();next[i]=to|(stage<<7);settle(c,next);const k=key(next);if(seen.has(k))continue;seen.add(k);nodes.push({s:next,parent:ni});}
  }
 }
}
export function normalizeClears(c,start){
 if(c.covers.some(co=>co.skin==='lift'&&start[co.stateIndex]===NONE))return{s:start,drags:[]};
 let s=start;const drags=[];for(;;){let choice;each(c,s,(candidate,cost,get)=>{if(cost===0&&candidate.reduce((n,v,i)=>n+Number(i<c.N&&v===NONE),0)>s.reduce((n,v,i)=>n+Number(i<c.N&&v===NONE),0)){choice=candidate;drags.push(get());return false;}});if(!choice)return{s,drags};s=choice;}
}
export function assertStateMatches(c,s,snapshot){
 assert.equal(snapshot.blocks.length,c.blocks.filter((_,i)=>s[i]!==NONE).length);assert.equal(snapshot.cleared,cleared(c,s));
 for(let i=0;i<c.N;i++){const b=c.blocks[i],a=snapshot.blocks.find(a=>a.id===b.id);if(s[i]===NONE){assert(!a);continue;}assert(a);assert.equal(a.x,(s[i]&127)%c.W);assert.equal(a.y,Math.floor((s[i]&127)/c.W));assert.deepEqual(a.layers,b.layers.slice(s[i]>>>7));assert.equal(a.frozen,iceRemaining(c,s,i));assert.equal(a.lockCount??0,lockRemaining(c,s,i));}
 for(const co of c.covers){const a=snapshot.shutters.find(a=>a.id===co.id);assert.equal(a.revealed,s[co.stateIndex]!==NONE);assert.equal(a.count,s[co.stateIndex]!==NONE?0:co.skin==='lift'?co.count:Math.max(0,co.count-cleared(c,s)));}
 for(const g of snapshot.gates)assert.equal(g.frozen,Math.max(0,(c.level.gates.find(a=>a.id===g.id).frozen??0)-cleared(c,s)));
}
export function replayDomain(c,drags,api){const model=new api.PuzzleModel(c.level);model.startCountdown();let state=c.initial,cost=0;assertStateMatches(c,state,model.snapshot());
 for(const d of drags){let next,stepCost;each(c,state,(s,k,get)=>{const e=get();if(e.blockId===d.blockId&&e.exitSide===d.exitSide&&JSON.stringify(e.path)===JSON.stringify(d.path)){next=s;stepCost=k;return false;}});assert(next,'Missing graph gesture');model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());assertStateMatches(c,next,model.snapshot());state=next;cost+=stepCost;}
 return{complete:model.snapshot().complete,cost,drags:drags.length,state};}
export function searchSpatial(level,api,{floor=Infinity,maxStates=500000,maxMilliseconds=10000,maxTransitions=5000000,weight=1000,orderSeed=0,prove=false,normalize=false,diagnosticTrace=false,startState=null}={}){
 let c;try{c=compileSpatial(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 if(prove){assert(Number.isSafeInteger(floor)&&floor>0);assert(!normalize,'Proofs enumerate the complete graph; normalization is search-only in this new mixed domain');}
 const normalized=s=>normalize?normalizeClears(c,s):{s,drags:[]},start=normalized(startState?Uint16Array.from(startState):c.initial),began=Date.now(),nodes=[{s:start.s,cost:0,parent:-1,clears:cleared(c,start.s),drags:start.drags}],seen=new Map([[key(start.s),0]]),open=[0];let explored=0,transitions=0,stop,maxClearsSeen=cleared(c,start.s),bestNode=0;
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;
 function push(i){open.push(i);let at=open.length-1;while(at){const p=(at-1)>>1;if(score(open[p])>=score(open[at]))break;[open[p],open[at]]=[open[at],open[p]];at=p;}}
 function pop(){const result=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let n=p*2+1;if(n+1<open.length&&score(open[n+1])>score(open[n]))n++;if(score(open[p])>=score(open[n]))break;[open[p],open[n]]=[open[n],open[p]];p=n;}}return result;}
 const route=i=>{const r=[];while(i>=0){r.push(nodes[i].drags);i=nodes[i].parent;}return r.reverse().flat();};
 const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,maxClearsSeen,...(diagnosticTrace?{partialDrags:route(bestNode),partialState:[...nodes[bestNode].s],partialCost:nodes[bestNode].cost}:{}),elapsedMilliseconds:Date.now()-began,abstraction:'v147-full-inventory128-stars-shells-lifts-ice-keys-axis-optional-contact-no-normalization',sourceLevelSha256:digest(level),solvabilityValidated:false,pointerValidated:false,timeValidated:false,releaseApproved:false,...extra});
 while(open.length){if(Date.now()-began>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;maxClearsSeen=Math.max(maxClearsSeen,n.clears);if(n.clears>nodes[bestNode].clears||n.clears===nodes[bestNode].clears&&n.cost<nodes[bestNode].cost)bestNode=ni;if(n.clears===c.totalClears)return result(prove?'relaxed-shortcut':'witness',{cost:n.cost,drags:route(ni)});
  each(c,n.s,(raw,k,get)=>{if(Date.now()-began>=maxMilliseconds||transitions>=maxTransitions){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}transitions++;const cost=n.cost+k;if(cost>=floor)return;const normal=normalized(raw),s=normal.s,sk=key(s),prior=seen.get(sk);if(prior!==undefined&&prior<=cost)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(sk,cost);nodes.push({s,cost,parent:ni,clears:cleared(c,s),drags:[get(),...normal.drags]});push(nodes.length-1);},{optionalExit:prove,orderSeed});if(stop)break;
 }
 return result(stop?'unknown':prove?'threshold-proven':'exhausted',{termination:stop??'below-threshold-exhausted'});
}
