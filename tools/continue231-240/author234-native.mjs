import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {compileSpatial} from '../continuation211-optional-lift-domain.mjs';import {sha256} from '../continuation211-runtime.mjs';
const OUT='deliverables/continue231-240-20261019/author234/native';fs.mkdirSync(OUT,{recursive:true});
export function liftPayload(level,api,options={}){
 assert(!level.blocks.some(b=>b.keyId||b.lockedBy));const c=compileSpatial(level,api);assert(c.N+c.covers.length<=64);assert(c.W*c.H<=128);
 for(const co of c.covers){const cells=co.members.flatMap(i=>{const b=c.blocks[i];assert(!(co.skin==='lift'&&b.ice));return b.shape.map(([x,y])=>[b.x+x,b.y+y].join(','));});assert.equal(new Set(cells).size,co.width*co.height);assert.equal(cells.length,co.width*co.height);}
 const groups=new Map();level.blocks.forEach((b,i)=>{const k=sha256(Object.fromEntries(Object.entries(b).filter(([k])=>!['id','x','y'].includes(k))));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});
 const pad=m=>[...m,...Array(4-m.length).fill(0)];
 const p={width:c.W,height:c.H,floor:11,maxMilliseconds:6000,maxStates:500000,...options,initial:[...c.initial],groups:[...groups.values()].filter(g=>g.length>1),blocks:c.blocks.map(b=>({layers:b.layers.length,ice:b.ice,cover:b.cover?.j??-1,poses:b.poses.map(p=>p&&({mask:pad(p.mask),neighbors:p.neighbors,exits:p.exits.map(exits=>exits.length?Math.min(...exits.map(e=>e.gate.frozen??0)):-1)}))})),covers:c.covers.map(co=>({count:co.count,lift:co.skin==='lift',mask:pad(co.mask),members:co.members}))};return{p,c};
}
export function runNativeLift(p){
 const source='tools/continuation211-native-lift.cs',sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex'),exe=path.resolve(OUT,'lift-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(OUT,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+5000});return{...JSON.parse(fs.readFileSync(output)),source,sourceHash,input,output,inputSha256:sha256(p)};
}
