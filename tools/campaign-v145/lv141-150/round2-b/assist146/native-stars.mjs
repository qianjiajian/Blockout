import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {compileSpatial,cleared,NONE,normalizeClears,each,key} from '../../../../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../../../../revised-preview-validation-v160.mjs';
export {cleared,NONE,normalizeClears,each,key};
export const SOURCE='tools/campaign-v145/lv141-150/round2-c/native96.cs';
export const WRAPPER='tools/campaign-v145/lv141-150/round2-b/assist146/native-stars.mjs';
export const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b/assist146/native';
export function compile(level,api){
 const c=compileSpatial(level,api);assert(c.W*c.H<=96&&c.N<=32,'96 cells / 32 bodies');
 assert(c.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.lockCount),'No keys or locks');
 assert(c.covers.every(s=>!s.skin||s.skin==='shutter'),'No lifts');
 assert(c.covers.every(s=>Number.isSafeInteger(s.count)&&s.count>0),'Positive countdown covers');
 for(let i=0;i<c.covers.length;i++)for(let j=0;j<i;j++)assert(!c.covers[i].mask.some((v,k)=>v&c.covers[j].mask[k]),'Covers must be disjoint');
 for(const b of c.blocks){assert(!b.cover||!b.ice,'Hidden ice outside this restriction');if(b.movementAxis)assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))));}
 return c;
}
export function groupsOf(c){const g=new Map();c.blocks.forEach((b,i)=>{const signature=JSON.stringify({shape:b.shape,layers:b.layers,ice:b.ice,cover:b.cover?.id,axis:b.movementAxis,star:!!b.star});if(!g.has(signature))g.set(signature,[]);g.get(signature).push(i);});return [...g.values()].filter(a=>a.length>1);}
export function canonical(c,s){const r=s.slice();for(const g of groupsOf(c)){const a=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>r[i]=a[j]);}return r;}
export const stateText=(c,s)=>Buffer.from([...s].slice(0,c.N).map(v=>v===NONE?255:v)).toString('base64');
export function payload(level,api,o={}){const c=compile(level,api),mask=a=>[a[0]??0,a[1]??0,a[2]??0],state=s=>[...s].slice(0,c.N).map(v=>v===NONE?255:v);return {width:c.W,height:c.H,initial:state(c.initial),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,reveal:b.cover?.count??0,poses:b.poses.map(p=>p&&({mask:mask(p.mask),exits:p.exits.map(a=>a.length?Math.min(...a.map(e=>e.gate.frozen??0)):-1),neighbors:p.neighbors}))})),covers:c.covers.map(s=>({count:s.count,mask:mask(s.mask)})),groups:groupsOf(c),floor:o.floor??21,maxStates:o.maxStates??500000,maxMilliseconds:o.maxMilliseconds??2000,successorsOnly:!!o.successorsOnly,states:o.states?.map(state)};}
/** Exact static countdown restriction of the qualified mixed-star graph.
 * Nonoverlapping ordinary covers reveal at their threshold: before reveal the
 * entire region is unavailable, and afterwards its own members are disjoint.
 * No hidden ice/key/lift world timing is erased. At each pose/stage the minimum
 * threshold among legally matching star/ordinary portals expresses precisely
 * the disjunction of legal zero-cost exits; each has the same resulting state.
 */
export function checkNativeStars(level,api,o={}){let p;try{p=payload(level,api,o);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 fs.mkdirSync(OUT,{recursive:true});const sourceHash=digest(fs.readFileSync(SOURCE)),wrapperHash=digest(fs.readFileSync(WRAPPER)),exe=path.resolve(OUT,'native-'+sourceHash.slice(0,16)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const exeHash=digest(fs.readFileSync(exe)),folder=path.resolve(OUT,'run-'+Date.now()+'-'+process.pid);fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p),{flag:'wx'});const inputHash=digest(fs.readFileSync(input));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+15000});
 assert.equal(digest(fs.readFileSync(SOURCE)),sourceHash);assert.equal(digest(fs.readFileSync(WRAPPER)),wrapperHash);assert.equal(digest(fs.readFileSync(input)),inputHash);assert.equal(digest(fs.readFileSync(exe)),exeHash);
 return{...JSON.parse(fs.readFileSync(output)),sourceHash,wrapperHash,exeHash,input,output,inputSha256:inputHash,sourceLevelSha256:digest(level),abstraction:'native96-static-countdown-star-portal-disjunction-v173',solvabilityValidated:false,pointerValidated:false,timeValidated:false};}
