import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {keyPayload} from '../remake191-200/author194-196/key-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
export function project226(l){
 assert.equal(l.id,226);assert(!l.flipDoors?.length&&!l.coloredGrids?.length&&!l.shutters?.length);
 const queued=l.generators.flatMap(g=>g.queueBlockIds),cargo=l.blocks.filter(b=>queued.includes(b.id));
 assert.equal(cargo.length,queued.length);assert(cargo.every(b=>!b.keyId&&!b.lockedBy&&!b.frozen&&!b.timedBombSeconds&&!b.layers?.length));
 const credit=cargo.length,copy=structuredClone(l);delete copy.generators;
 copy.blocks=copy.blocks.filter(b=>!queued.includes(b.id));
 for(const b of copy.blocks)if(b.frozen)b.frozen=Math.max(0,b.frozen-credit);
 for(const g of copy.gates)if(g.frozen)g.frozen=Math.max(0,g.frozen-credit);
 for(const x of [...copy.blocks,...copy.gates])if(x.frozen===0)delete x.frozen;
 return {level:copy,credit,queued,qualification:'Optimistic inventory relaxation: remove ALL real cargo and credit ALL its clears at time zero by reducing each affected initial gate/body ice counter. No queue body has a key/shell/timer and no flip/grid/cover is present. Real surviving opening-body gestures remain legal; cargo gestures project to stutters; granting clears earlier only removes monotone restrictions. Therefore every real complete route maps to a relaxed complete opening-body route with no larger reposition cost. This is not the invalid deletion of queue while retaining ice counters. Original full FIFO is independently replayed.'};
}
const root='deliverables/continue221-230-20260930/author226/native';fs.mkdirSync(root,{recursive:true});
const source='tools/remake191-200/author194-196/native-keys32.cs';
export function run226(p){
 const sourceHash=digest(fs.readFileSync(source)),exe=path.resolve(root,'keys-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(root,'run-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));
 execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+3000});return {...JSON.parse(fs.readFileSync(output)),input,output,source,sourceHash,inputSha256:digest(p)};
}
export function floor226(l,opts={}){let projection=project226(l);if(opts.prefix){const machine=l.generators[0],cargo=l.blocks.find(b=>b.id===machine.queueBlockIds[0]),footprint=cargo.shape.map(([x,y])=>[x+machine.spawn[0],y+machine.spawn[1]].join(',')),guard=l.blocks.find(b=>b.frozen===17&&b.shape.some(([x,y])=>footprint.includes([x+b.x,y+b.y].join(','))));assert(guard);const copy=structuredClone(l);delete copy.generators;copy.blocks=copy.blocks.filter(b=>!projection.queued.includes(b.id));projection={level:copy,queued:projection.queued,guard:guard.id,goalClears:17,qualification:'Before 17 actual clear events, numeric-ice-17 guard cannot move or leave and overlaps the first FIFO cargo footprint. Thus no queue item can spawn in any such history. This exact opening-body prefix graph stops at 17 clears; it is not a queue-deleted full-completion proof. All original ice counters retained only for that verified no-spawn prefix.'};}const{p}=keyPayload(projection.level,{floor:11,maxMilliseconds:1800,maxStates:500000,...opts});if(opts.prefix)p.goalClears=17;return {proof:run226(p),projection,levelSha256:digest(l),qualificationRequired:true};}
if(process.argv[1]?.endsWith('floor226.mjs')){const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),r=floor226(d.level);const output=file.replace('.json','-floor.json');fs.writeFileSync(output,JSON.stringify(r,null,2),{flag:'wx'});console.log(JSON.stringify({output,proof:r.proof}));}
