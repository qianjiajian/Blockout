import fs from 'node:fs';import assert from 'node:assert/strict';
import {compileSpatial,each,key,cleared,normalizeClears,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
/** Exact permutation quotient. Equal shape, ordered layers, starting ice and
 * owning cohort have identical transitions. Every cohort reveal count remains
 * ordered in the key, so visibility and visible-ice age are retained. No key/
 * lock or ID-triggered mechanism is accepted. Normalize complete bodies only
 * once every actual lift has revealed; the source domain implements that guard.
 */
export function compile147(level,api){assert.equal(level.id,147);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy));const c=compileSpatial(level,api),groups=new Map();c.blocks.forEach((b,i)=>{const k=JSON.stringify([b.shape,b.layers,b.frozen??0,b.shutterId??null,b.movementAxis??null,b.star??false]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});const canonical=s=>{const t=s.slice();for(const g of groups.values()){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>t[i]=values[j]);}return key(t);};return{c,canonical};}
export function floor147(level,api,{floor=5,maxStates=1000000,maxMilliseconds=30000}={}){const{c,canonical}=compile147(level,api),start=Date.now(),initial=normalizeClears(c,c.initial).s,buckets=Array.from({length:floor},()=>[]),seen=new Map([[canonical(initial),0]]);buckets[0].push(initial);let explored=0,transitions=0,stop,maxClears=0;
 outer:for(let cost=0;cost<floor;cost++){for(let j=0;j<buckets[cost].length;j++){if(Date.now()-start>=maxMilliseconds){stop='deadline';break outer;}const s=buckets[cost][j];buckets[cost][j]=null;if(seen.get(canonical(s))<cost)continue;explored++;maxClears=Math.max(maxClears,cleared(c,s));if(cleared(c,s)===c.totalClears)return{status:'relaxed-shortcut',thresholdProven:false,cost,floor,explored,states:seen.size,transitions,ms:Date.now()-start};
 each(c,s,(raw,edge)=>{transitions++;const nc=cost+edge;if(nc>=floor)return;const next=normalizeClears(c,raw).s,k=canonical(next),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(Date.now()-start>=maxMilliseconds||seen.size>=maxStates){stop=seen.size>=maxStates?'max-states':'deadline';return false;}seen.set(k,nc);buckets[nc].push(next);});if(stop)break outer;}buckets[cost]=[];}
 return{status:stop?'unknown':'threshold-proven',thresholdProven:!stop,floor,explored,states:seen.size,transitions,maxClears,ms:Date.now()-start,stop,sourceLevelSha256:digest(level),abstraction:'v173-full-stock-lift-countdown-exact-identity-quotient-terminal-normalization'};}
if(process.argv[1]?.endsWith('floor147.mjs')){const api=await loadSpatialApi(),file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),proof=floor147(d.level,api);const out=file.replace('candidate147-','canonical-floor147-');fs.writeFileSync(out,JSON.stringify({file,proof},null,2));console.log(JSON.stringify({out,...proof}));}
