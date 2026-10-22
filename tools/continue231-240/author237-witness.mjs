import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{payload}from'./author236-native.mjs';import{ROOT,digest}from'./common.mjs';import{each,normalizeClears,key,NONE,cleared}from'../continuation211-colored-witness.mjs';
const source='tools/continuation211-native-witness64-v2.cs';
export function witness(level,api,options={}){
 const{p,c}=payload(level,api,{floor:21,maxMilliseconds:1800,maxStates:200000,...options});
 p.blocks.forEach((b,i)=>{b.traffic=Array(c.W*c.H).fill(0);b.gateThresholds=c.blocks[i].layers.map((_,stage)=>Math.min(999,...c.blocks[i].poses.flatMap(p=>p?p.exits[stage].map(e=>e.gate.frozen??0):[])));b.distances=c.blocks[i].layers.map((_,stage)=>c.blocks[i].poses.map((pose,pos)=>{if(!pose)return 100;let best=100;for(let j=0;j<c.blocks[i].poses.length;j++)if(c.blocks[i].poses[j]?.exits[stage].length)best=Math.min(best,Math.abs(pos%c.W-j%c.W)+Math.abs(Math.floor(pos/c.W)-Math.floor(j/c.W)));return best;}));});
 const out=ROOT+'/author237/witness';fs.mkdirSync(out,{recursive:true});const sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex'),exe=path.resolve(out,'native-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(out,'run-'+Date.now()+'-'+process.pid+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+4000});
 const result={...JSON.parse(fs.readFileSync(output)),source,sourceHash,input,output,inputSha256:digest(p),witnessOnly:true,lowerBoundCertified:false};
 if(result.path){let state=c.initial;const drags=[];const compare=(s,a)=>key(s)===key(Uint16Array.from(a.map(v=>v===511?NONE:v)));
  for(const [i,step]of result.path.entries()){if(i){let next,drag;each(c,state,(s,k,get)=>{if(compare(s,step.raw)){next=s;drag=get();return false;}});assert(next,'Native raw transition not independently found');state=next;drags.push(drag);}else assert(compare(state,step.raw));const normalized=normalizeClears(c,state);state=normalized.s;drags.push(...normalized.drags);assert(compare(state,step.normalized));}
  assert.equal(cleared(c,state),c.totalClears);result.drags=drags;
 }
 delete result.path;delete result.partialPath;return result;
}
