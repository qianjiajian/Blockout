import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';
import {payload,SOURCE,hash} from '../../lv131-140/agent139-140/native-prefix-pruned.mjs';
import {digest,OUT,api,save} from './common.mjs';
export function project(level){
 assert.equal(level.id,143);assert.equal(level.generators.length,1);assert.equal(level.shutters.length,1);const cover=level.shutters[0],g=level.generators[0];assert.equal(cover.count,19);assert(!cover.skin||cover.skin==='shutter');
 const ids=new Set(g.queueBlockIds);assert.equal(ids.size,2);for(const id of ids){const b=level.blocks.find(b=>b.id===id);assert(b&&!b.shutterId&&!b.frozen);assert(b.shape.every(([dx,dy])=>g.spawn[0]+dx>=cover.x&&g.spawn[0]+dx<cover.x+cover.width&&g.spawn[1]+dy>=cover.y&&g.spawn[1]+dy<cover.y+cover.height),'Every queue footprint stays entirely inside closed curtain19');}
 assert.equal(level.blocks.filter(b=>!b.shutterId&&!ids.has(b.id)).reduce((n,b)=>n+(b.layers?.length??1),0),19);
 const projected=structuredClone(level);delete projected.generators;projected.blocks=projected.blocks.filter(b=>!ids.has(b.id));api.validateLevel(projected);
 return{level:projected,goalClears:19,removedQueueIds:[...ids],sourceLevelSha256:digest(level),proofArgument:'Until clear19 the real curtain19 occupies every cell of both fixed FIFO spawn footprints, so no cargo can emit. The prefix graph keeps that mask and all18 opening identities/layers/gate ice; its target is precisely clear19. Hidden bodies and queues cannot participate before this first reveal. Proving no prefix below16 lower-bounds every full real solution; it does not claim full solvability after deleting inventory.'};
}
export function floor143(level,{floor=16,maxMilliseconds=15000,maxStates=500000}={}){
 const projection=project(level),p=payload(projection.level,api,{goalClears:19,floor,maxMilliseconds,maxStates}),sourceHash=hash(fs.readFileSync(SOURCE));
 const exe=path.resolve(OUT,'native-prefix-'+sourceHash.slice(0,16)+'.exe');if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(SOURCE)],{windowsHide:true,stdio:'pipe'});
 const folder=path.resolve(OUT,'prefix143-'+Date.now());fs.mkdirSync(folder);const input=path.join(folder,'input.json'),output=path.join(folder,'output.json');fs.writeFileSync(input,JSON.stringify(p));const inputHash=digest(fs.readFileSync(input)),exeHash=digest(fs.readFileSync(exe));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:maxMilliseconds+10000});assert.equal(hash(fs.readFileSync(SOURCE)),sourceHash);assert.equal(digest(fs.readFileSync(exe)),exeHash);assert.equal(digest(fs.readFileSync(input)),inputHash);
 return{...JSON.parse(fs.readFileSync(output)),projection,sourceHash,exeHash,input,output,sourceLevelSha256:digest(level),qualificationRequired:true,pointerValidated:false};
}
if(process.argv[1]?.endsWith('prefix-floor143.mjs')){const d=JSON.parse(fs.readFileSync(process.argv[2])),result=floor143(d.level);console.log(JSON.stringify({file:save('floor143',result),status:result.status,cost:result.relaxedNonClearingDrags,states:result.states,ms:result.ms}));}
