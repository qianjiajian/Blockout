import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {compile,clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
const overlap=(a,b)=>(a[0]&b[0])||(a[1]&b[1])||(a[2]&b[2]);
export function occupiedDelayed(c,s,excluded=-1,excludedCover=-1){const occ=[0,0,0];for(const co of c.covers)if(co.j!==excludedCover&&!s[2*c.N+co.j]&&co.skin!=='lift')for(let k=0;k<3;k++)occ[k]|=co.mask[k];for(let i=0;i<c.N;i++)if(i!==excluded&&s[i]<510){const mask=c.blocks[i].poses[s[i]&127].mask;for(let k=0;k<3;k++)occ[k]|=mask[k];}return occ;}
export function revealDelayed(c,s,j){const co=c.covers[j];if(s[2*c.N+j]||co.skin!=='lift'||overlap(co.mask,occupiedDelayed(c,s,-1,j)))return null;const next=s.slice();next[2*c.N+j]=1;for(const i of co.members)next[i]=c.blocks[i].initial;return next;}
function settleOrdinary(c,s){for(const co of c.covers){if(co.skin==='lift'||s[2*c.N+co.j]||clearCount(c,s)<co.count)continue;const occ=occupiedDelayed(c,s,-1,co.j);if(co.members.some(i=>overlap(c.blocks[i].poses[c.blocks[i].initial].mask,occ)))continue;s[2*c.N+co.j]=1;for(const i of co.members)s[i]=c.blocks[i].initial;}return s;}
export function eachDelayed67(c,s,visit,{includeReveals=true}={}){
 if(includeReveals)for(const co of c.covers){const next=revealDelayed(c,s,co.j);if(next&&visit(next,0,()=>({revealId:co.id}))===false)return;}
 const cleared=clearCount(c,s);
 for(let i=0;i<c.N;i++){if(s[i]>=510||s[c.N+i]>0)continue;const b=c.blocks[i],occ=occupiedDelayed(c,s,i),anchors=[s[i]&127],parents=[-1],seen=new Uint8Array(128);seen[s[i]&127]=1;
  const drag=(ni,side)=>{const path=[];while(parents[ni]>=0){const p=anchors[ni];path.push([p%c.W,Math.floor(p/c.W)]);ni=parents[ni];}return{blockId:b.id,path:path.reverse(),...(side?{exitSide:side}:{})};};
  for(let ni=0;ni<anchors.length;ni++){const p=anchors[ni],pose=b.poses[p],gate=pose.exits[0];if(gate&&cleared>=(gate.frozen??0)){const next=s.slice();next[i]=511;for(let j=0;j<c.N;j++)if(j!==i&&s[j]<510&&next[c.N+j])next[c.N+j]--;settleOrdinary(c,next);if(visit(next,0,()=>drag(ni,gate.side))===false)return;}
   if(ni){const next=s.slice();next[i]=p;if(visit(next,1,()=>drag(ni))===false)return;}
   for(const to of pose.neighbors)if(!seen[to]&&!overlap(b.poses[to].mask,occ)){seen[to]=1;anchors.push(to);parents.push(ni);}
  }
 }
}
function firstFreeClear(c,s){const cleared=clearCount(c,s);for(let i=0;i<c.N;i++){if(s[i]>=510||s[c.N+i])continue;const b=c.blocks[i],occ=occupiedDelayed(c,s,i),anchors=[s[i]&127],parents=[-1],seen=new Uint8Array(128);seen[s[i]&127]=1;for(let ni=0;ni<anchors.length;ni++){const p=anchors[ni],pose=b.poses[p],gate=pose.exits[0];if(gate&&cleared>=(gate.frozen??0)){const next=s.slice();next[i]=511;for(let j=0;j<c.N;j++)if(j!==i&&s[j]<510&&next[c.N+j])next[c.N+j]--;settleOrdinary(c,next);const path=[];for(let k=ni;parents[k]>=0;k=parents[k])path.push([anchors[k]%c.W,Math.floor(anchors[k]/c.W)]);return{state:next,action:{blockId:b.id,path:path.reverse(),exitSide:gate.side}};}for(const to of pose.neighbors)if(!seen[to]&&!overlap(b.poses[to].mask,occ)){seen[to]=1;anchors.push(to);parents.push(ni);}}}return null;}
export function normalizeDelayedClears67(c,input){let state=input;const actions=[];for(;;){const next=firstFreeClear(c,state);if(!next)break;state=next.state;actions.push(next.action);}return{state,actions};}
export function qualifyDelayed67(level,api){assert.equal(level.id,67);const c=qualifyLift(level,api);assert(level.blocks.every(b=>!b.layers||b.layers.length===1&&b.layers[0]===b.color),'No shells or inconsistent singleton layers');assert(level.blocks.every(b=>Number.isInteger(b.frozen??0)&&(b.frozen??0)>=0&&(b.frozen??0)<64),'Canonical numeric range');assert(level.blocks.filter(b=>b.shutterId).every(b=>!(b.frozen??0)),'No hidden ice');for(let i=0;i<c.covers.length;i++)for(let j=i+1;j<c.covers.length;j++)assert(!overlap(c.covers[i].mask,c.covers[j].mask),'Disjoint full hidden regions');for(const co of c.covers)if(co.skin!=='lift'&&!c.initial[2*c.N+co.j])assert(!overlap(co.mask,occupiedDelayed(c,c.initial,-1,co.j)),'Closed ordinary curtain has no visible occupant');return c;}
/** Full-stock relaxation: spatial lifts may be revealed for free at any empty
 * action boundary. A real mid-drag reveal can be deferred to that boundary:
 * its full hidden footprint prevents that held body from re-entering the region,
 * so the region is still empty at its endpoint. Delaying only removes collisions.
 * Hidden ice and shells are forbidden; all counters and full inventory remain.
 * In this relaxation early free complete clears dominate: occupancy decreases,
 * ice/gates only improve, ordinary curtains replace already blocked full areas,
 * and lifts can stay deferred without retaining a physical blocker. Delete the
 * early-removed body's later gestures from any continuation. No hidden ice loses
 * future thaw events. The explicit free-clear prefix provides the reverse map.
 */
export function checkDelayedLiftFloor67(level,api,{floor=11,maxStates=1000000,maxMilliseconds=60000,normalize=true}={}){
 const base={thresholdProven:false,abstraction:'full-stock-delayed-spatial-reveal-monotone-clears67-v147',sourceLevelSha256:digest(level),costNonincreasing:true,solvabilityValidated:false,pointerValidated:false,fullInventory:level.blocks.length,normalize};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...base,status:'invalid'};let c;try{c=qualifyDelayed67(level,api);}catch(e){return{...base,status:'unsupported',reason:e.message};}
 const norm=normalize?s=>normalizeDelayedClears67(c,s):s=>({state:s,actions:[]}),grouped=new Map();level.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.color,b.frozen??0,b.shutterId??null]);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i);});const groups=[...grouped.values()],key=s=>String.fromCharCode(...groups.flatMap(g=>g.map(i=>s[i]+1024*s[c.N+i]).sort((a,b)=>a-b)),...s.slice(2*c.N));
 const start=Date.now(),initial=norm(c.initial),seen=new Map([[key(initial.state),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(initial.state);let explored=0,transitions=0,freeClears=initial.actions.length,stop,frontierCost=0;
 outer:for(let cost=0;cost<floor;cost++){frontierCost=cost;for(let bi=0;bi<buckets[cost].length;bi++){if(Date.now()-start>=maxMilliseconds){stop='deadline';break outer;}const s=buckets[cost][bi];buckets[cost][bi]=null;if(seen.get(key(s))<cost)continue;explored++;if(clearCount(c,s)===c.total)return{...base,status:'relaxed-shortcut',cost,states:seen.size,explored,transitions,freeClears,ms:Date.now()-start};
  eachDelayed67(c,s,(next,delta)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=cost+delta;if(nc>=floor)return;const normalized=norm(next),k=key(normalized.state),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(k,nc);freeClears+=normalized.actions.length;buckets[nc].push(normalized.state);});if(stop)break outer;
 }buckets[cost]=[];}
 return{...base,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,floor,states:seen.size,explored,transitions,freeClears,frontierCost,ms:Date.now()-start,stop};
}
if(process.argv[1]?.endsWith('delayed-lift-floor67.mjs')){const{api}=await loadApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),report=checkDelayedLiftFloor67(d.level,api,{floor:11,maxStates:Number(process.env.MAX_STATES??1000000),maxMilliseconds:Number(process.env.PROOF_MS??60000)}),out=file.replace(/\.json$/,'.delayed-floor-'+Date.now()+'.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
