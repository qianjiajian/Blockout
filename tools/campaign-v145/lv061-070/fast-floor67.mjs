import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {qualifyLift} from './lift-floor.mjs';
import {compile,clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {eachFast67} from './fast-lift-edges67.mjs';
import {normalizeTerminalClears} from './terminal-clear-floor67.mjs';
export function checkFastFloor67(level,api,{floor=11,maxStates=3000000,maxMilliseconds=120000}={}){
 const files=['tools/campaign-v145/lv061-070/fast-floor67.mjs','tools/campaign-v145/lv061-070/fast-lift-edges67.mjs','tools/campaign-v145/lv061-070/terminal-clear-floor67.mjs','tools/campaign-v145/lv061-070/lift-floor.mjs','deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs'];
 const base={thresholdProven:false,abstraction:'qualified-full-lift-optional-exit-identity-terminal-clear-fast67-v147',sourceLevelSha256:digest(level),costNonincreasing:true,relaxedRouteIncluded:false,solvabilityValidated:false,timeValidated:false,pointerValidated:false,toolBindings:Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(f))]))};
 if(![floor,maxStates,maxMilliseconds].every(n=>Number.isSafeInteger(n)&&n>0))return{...base,status:'invalid'};
 try{assert.equal(level.id,67);qualifyLift(level,api);assert(level.blocks.every(b=>Number.isInteger(b.frozen??0)&&(b.frozen??0)>=0&&(b.frozen??0)<64&&(b.layers?.length??1)<8));}catch(e){return{...base,status:'unsupported',reason:e.message};}
 const c=compile(level),grouped=new Map();level.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.layers??[b.color],b.frozen??0,b.shutterId??null]);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(i);});const groups=[...grouped.values()],codes=new Uint16Array(c.N+c.covers.length),key=s=>{let at=0;for(const g of groups){if(g.length===1){const i=g[0];codes[at++]=s[i]+1024*s[c.N+i];}else{const a=g.map(i=>s[i]+1024*s[c.N+i]);a.sort((a,b)=>a-b);for(const x of a)codes[at++]=x;}}for(let j=0;j<c.covers.length;j++)codes[at++]=s[2*c.N+j];return String.fromCharCode(...codes);};
 const start=Date.now(),initial=normalizeTerminalClears(c,c.initial),seen=new Map([[key(initial.state),0]]),buckets=Array.from({length:floor},()=>[]);buckets[0].push(initial.state);let explored=0,transitions=0,normalizedClears=initial.drags.length,stop,maxClears=0,frontierCost=0;
 outer:for(let cost=0;cost<floor;cost++){frontierCost=cost;for(let bi=0;bi<buckets[cost].length;bi++){
  if(Date.now()-start>=maxMilliseconds){stop='deadline';break outer;}const s=buckets[cost][bi];buckets[cost][bi]=null;if(seen.get(key(s))<cost)continue;explored++;const clears=clearCount(c,s);maxClears=Math.max(maxClears,clears);if(clears===c.total)return{...base,status:'relaxed-shortcut',cost,states:seen.size,explored,transitions,normalizedClears,frontierCost,ms:Date.now()-start};
  eachFast67(c,s,(next,delta)=>{if(Date.now()-start>=maxMilliseconds){stop='deadline';return false;}transitions++;const nc=cost+delta;if(nc>=floor)return;const normalized=normalizeTerminalClears(c,next),k=key(normalized.state),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return false;}normalizedClears+=normalized.drags.length;seen.set(k,nc);buckets[nc].push(normalized.state);},{optionalExit:true});if(stop)break outer;
 }buckets[cost]=[];}
 return{...base,status:stop?'unknown':'threshold-proven',thresholdProven:!stop,floor,states:seen.size,explored,transitions,normalizedClears,maxClears,frontierCost,ms:Date.now()-start,stop};
}
if(process.argv[1]?.endsWith('fast-floor67.mjs')){const{api}=await loadApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),report=checkFastFloor67(d.level,api,{floor:11,maxStates:Number(process.env.MAX_STATES??3000000),maxMilliseconds:Number(process.env.PROOF_MS??120000)}),out=file.replace(/\.json$/,'.fast-floor-'+Date.now()+'.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
