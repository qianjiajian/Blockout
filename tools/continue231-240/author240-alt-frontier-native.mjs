import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {each,normalizeClears,NONE,key,cleared} from '../continuation211-colored-witness.mjs';
import {ROOT,digest} from './common.mjs';
import {payload240} from './author240-native.mjs';

// A few shortest static paths suffice as an optional heuristic for small
// ordinary bodies; unlike the lower proof this need not enumerate all paths.
export function directSweep240(c){
 const out={};
 for(const b of c.blocks){
  const ds=Array(c.W*c.H).fill(999),queue=[];
  b.poses.forEach((p,i)=>{if(p?.exits[0].some(e=>!e.gate.frozen)){ds[i]=0;queue.push(i);}});if(!queue.length)continue;
  for(let h=0;h<queue.length;h++)for(const n of b.poses[queue[h]].neighbors)if(ds[n]>ds[queue[h]]+1){ds[n]=ds[queue[h]]+1;queue.push(n);}
  out[b.id]=b.poses.map((pose,start)=>{
   if(!pose||ds[start]===999)return[];const paths=[];
   for(let bias=0;bias<4;bias++){
    const mask=[0,0,0,0];let at=start;
    for(;;){b.poses[at].mask.forEach((v,i)=>mask[i]=(mask[i]|v)>>>0);if(ds[at]===0)break;
     const ns=b.poses[at].neighbors.filter(n=>ds[n]===ds[at]-1).sort((a,b)=>{const directions=[-c.W,1,c.W,-1],da=directions.indexOf(a-at),db=directions.indexOf(b-at);return(da+bias)%4-(db+bias)%4;});at=ns[0];
    }
    if(!paths.some(p=>p.every((v,i)=>v===mask[i])))paths.push(mask);
   }return paths;
  });
 }return out;
}

// Search heuristic only. A complete path is reconstructed in the independent
// JavaScript graph and must additionally pass the strict original runtime.
export function witnessWide240(level,api,sweepPaths,options={}){
 const{c,p}=payload240(level,api,{floor:31,maxStates:180000,maxMilliseconds:2200,...options});
 if(options.initialState){c.initial=Uint16Array.from(options.initialState);p.initial=[...c.initial].map(v=>v===NONE?511:v);delete p.initialState;}
 p.playableMask=[0,0,0,0];for(const[x,y]of level.playable){const at=y*level.width+x;p.playableMask[at>>>5]=(p.playableMask[at>>>5]|(1<<(at&31)))>>>0;}
 const ordinaryColor=level.gates.find(g=>!g.frozen).color;
 if(options.prefixShapeQuotient){
  assert.equal(p.goalClears,4);assert(level.gates.filter(g=>g.color!==ordinaryColor).every(g=>g.frozen>=4));
  const groups=new Map();level.blocks.forEach((b,i)=>{const sig=JSON.stringify({shape:b.shape,color:b.color===ordinaryColor?ordinaryColor:'not-yet-open'});if(!groups.has(sig))groups.set(sig,[]);groups.get(sig).push(i);});p.groups=[...groups.values()].filter(g=>g.length>1);delete p.prefixShapeQuotient;
 }
 p.blocks.forEach((b,i)=>{
  b.traffic=Array(c.W*c.H).fill(0);
  b.gateThresholds=c.blocks[i].layers.map((_,stage)=>Math.min(999,...c.blocks[i].poses.flatMap(p=>p?p.exits[stage].map(e=>e.gate.frozen??0):[])));
  b.distances=c.blocks[i].layers.map((_,stage)=>{
   const ds=Array(c.W*c.H).fill(100),queue=[];c.blocks[i].poses.forEach((pose,j)=>{if(pose?.exits[stage].length){ds[j]=0;queue.push(j);}});
   for(let j=0;j<queue.length;j++)for(const n of c.blocks[i].poses[queue[j]].neighbors)if(ds[n]>ds[queue[j]]+1){ds[n]=ds[queue[j]]+1;queue.push(n);}return ds;
  });
  b.sweepPaths=level.blocks[i].color===ordinaryColor?sweepPaths[c.blocks[i].id]:null;
  if(b.sweepPaths)assert.equal(b.sweepPaths.length,c.W*c.H);
 });
 const nativeSource='tools/continue231-240/author240-alt-frontier-witness.cs',root=ROOT+'/author240-alt/native-frontier';fs.mkdirSync(root,{recursive:true});
 const sourceHash=digest(fs.readFileSync(nativeSource)),exe=path.resolve(root,'witness-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(nativeSource)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(root,`run-${Date.now()}-${process.pid}`);fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+7000});
 const result={...JSON.parse(fs.readFileSync(output)),input,output,source:nativeSource,sourceHash,inputSha256:digest(p),witnessOnly:true};
 if(result.path){
  let s=c.initial;const drags=[],compare=(state,values)=>key(state)===key(Uint16Array.from(values.map(v=>v===511?NONE:v)));
  for(const[i,step]of result.path.entries()){
   if(i){let found,drag;each(c,s,(n,cost,get)=>{if(compare(n,step.raw)){found=n;drag=get();return false;}});assert(found,'Native raw gesture missing');s=found;drags.push(drag);}else assert(compare(s,step.raw));
   if(p.goalClears===c.totalClears){const normal=normalizeClears(c,s);s=normal.s;drags.push(...normal.drags);}else{
    for(;;){if(cleared(c,s)>=p.goalClears)break;let next,drag;each(c,s,(n,cost,get)=>{if(cost===0&&cleared(c,n)>cleared(c,s)){next=n;drag=get();return false;}});if(!next)break;s=next;drags.push(drag);}
   }assert(compare(s,step.normalized));
  }
  assert.equal(cleared(c,s),p.goalClears);result.drags=drags;result.finalState=[...s];
 }
 return result;
}
