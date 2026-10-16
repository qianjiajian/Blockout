import {build} from 'esbuild'; import fs from 'node:fs';
const b=await build({stdin:{resolveDir:process.cwd(),contents:`export {LEAGUE_LEVELS} from './src/core/leagueLevelData.ts'`},bundle:true,write:false,platform:'node',format:'esm'}); const {LEAGUE_LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const w=await import('./tools/continuation211-colored-witness.mjs'); const api=await w.loadSpatialApi();
function rect(shape){const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]); const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys); const s=new Set(shape.map(p=>p.join(','))); for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++)if(!s.has(`${x},${y}`))return false; return true;}
function strip(base,index){const l=structuredClone(base); l.id=990000+index; l.name='test'; l.difficulty=((index-1)%5===2)?'super':'hard'; l.mechanismRules='revised-2026-09-27-v1.5'; if(index<6) {l.gates.forEach(g=>g.frozen=0); l.blocks.forEach(b=>{delete b.frozen; delete b.layers; delete b.movementAxis; delete b.keyId; delete b.lockedBy; delete b.star;}); delete l.shutters; delete l.generators; delete l.elevators; delete l.conveyors; delete l.coloredGrids;}
 if(index<10){l.blocks.forEach(b=>{delete b.frozen;});}
 if(index<15){l.blocks.forEach(b=>{if(b.layers?.length<=1)delete b.layers;});}
 if(index<20) delete l.shutters;
 if(index<35) delete l.generators;
 if(index<50) l.blocks.forEach(b=>{delete b.movementAxis});
 if(index<60) l.blocks.forEach(b=>{delete b.keyId;delete b.lockedBy;});
 if(index<65) delete l.elevators;
 if(index<100){l.blocks.forEach(b=>{delete b.star}); l.gates.forEach(g=>delete g.star)}
 return l;
}
for(const i of [1,7,9,12,20,21,30,35,50,60,65,71,81,100]){
 const l=strip(LEAGUE_LEVELS[i-1].level,i); let r=w.searchSpatial(l,api,{floor:((i-1)%5===2?31:21),maxStates:300000,maxTransitions:2000000,maxMilliseconds:3000,normalize:true,orderSeed:0}); const rep=r.drags?.length? w.replayDomain(w.compileSpatial(l,api),r.drags,api):null;
 console.log(i,l.blocks.length,l.gates.length,'mech',!!l.shutters,!!l.generators,l.blocks.filter(b=>b.movementAxis).length,'search',r.status,r.reason,r.cost,r.exploredStates,'drags',r.drags?.length,'rep',rep?.cost,rep?.complete);
}
