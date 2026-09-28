import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {compile,each,clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
/** Exact guard: every real cover index has revealed bit 1, and each present
 * body has exactly one color layer left. qualifyLift rejects generators, keys,
 * flips, colored grids, time, axes and identity triggers. No unrevealed cargo
 * can appear, no shell can change pose/color without removal. A zero-cost exit
 * removes one complete body, reduces occupancy, increments monotone clear count
 * and only reduces already-visible ice. Thus it cannot disable any later action
 * of another body. Delete the removed body's later gestures from any completion
 * to obtain a completion of no greater reposition cost. Repeat until no such
 * exit: the normalized state dominates its input. The explicit zero-cost prefix
 * also maps every normalized solution back to its input, so the optimum agrees.
 * This reasoning does NOT apply before every batch is revealed or to shells.
 */
export function normalizeTerminalClears(c,input){
 if(c.covers.some(co=>!input[2*c.N+co.j])||c.blocks.some((b,i)=>input[i]!==511&&(input[i]===510||b.layers.length-(input[i]>>>7)!==1)))return{state:input,drags:[]};
 let state=input;const drags=[];for(;;){let next,drag;each(c,state,(s,cost,get)=>{if(cost===0){next=s;drag=get();return false;}},{optionalExit:true});if(!next)break;state=next;drags.push(drag);}return{state,drags};
}
export function checkTerminalClearFloor67(level,api,{floor=11,maxStates=1500000,maxMilliseconds=120000}={}){
 const base={thresholdProven:false,abstraction:'qualified-full-lift-optional-exit-identity-terminal-clear67-v147',sourceLevelSha256:digest(level),costNonincreasing:true,solvabilityValidated:false,timeValidated:false,pointerValidated:false};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...base,status:'invalid'};
 try{assert.equal(level.id,67);qualifyLift(level,api);assert(level.blocks.every(b=>Number.isInteger(b.frozen??0)&&(b.frozen??0)>=0&&(b.frozen??0)<64&&(b.layers?.length??1)<8));}catch(e){return{...base,status:'unsupported',reason:e.message};}
 const c=compile(level),grouped=new Map();level.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.layers??[b.color],b.frozen??0,b.shutterId??null]);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i);});const groups=[...grouped.values()],key=s=>String.fromCharCode(...groups.flatMap(g=>g.map(i=>s[i]+1024*s[c.N+i]).sort((a,b)=>a-b)),...s.slice(2*c.N));
 const start=Date.now(),initial=normalizeTerminalClears(c,c.initial),nodes=[{s:initial.state,cost:0,parent:-1,drags:initial.drags}],seen=new Map([[key(initial.state),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(0);let explored=0,transitions=0,normalizedClears=initial.drags.length,stop,maxClears=0;
 const route=i=>{const out=[];for(;;){out.push(nodes[i].drags);if(nodes[i].parent<0)break;i=nodes[i].parent;}return out.reverse().flat();};
 for(let cost=0;cost<floor;cost++)for(let bi=0;bi<buckets[cost].length;bi++){
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=buckets[cost][bi],n=nodes[ni];if(seen.get(key(n.s))<cost)continue;explored++;const clears=clearCount(c,n.s);maxClears=Math.max(maxClears,clears);if(clears===c.total)return{...base,status:'relaxed-shortcut',cost,drags:route(ni),states:seen.size,explored,transitions,normalizedClears,ms:Date.now()-start};
  each(c,n.s,(s,delta,get)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=cost+delta;if(nc>=floor)return;const normalized=normalizeTerminalClears(c,s),k=key(normalized.state),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}normalizedClears+=normalized.drags.length;seen.set(k,nc);nodes.push({s:normalized.state,cost:nc,parent:ni,drags:[get(),...normalized.drags]});buckets[nc].push(nodes.length-1);},{optionalExit:true});
  if(stop)break;
 }
 return{...base,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,floor,states:seen.size,explored,transitions,normalizedClears,maxClears,ms:Date.now()-start,stop};
}
if(process.argv[1]?.endsWith('terminal-clear-floor67.mjs')){const{api}=await loadApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),report=checkTerminalClearFloor67(d.level,api,{floor:11,maxStates:Number(process.env.MAX_STATES??1500000),maxMilliseconds:Number(process.env.PROOF_MS??120000)}),out=file.replace(/\.json$/,'.terminal-floor-'+Date.now()+'.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report,drags:undefined}));}
