import fs from 'node:fs';import{searchSpatial,loadSpatialApi}from'../remake201to210-v123-floor.mjs';import{build}from'esbuild';
let r=await build({stdin:{resolveDir:process.cwd(),contents:'export {replayRevisedRoute} from "./src/core/revisedLevelSearch.ts"'},bundle:true,write:false,platform:'node',format:'esm'});
const core=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')),api=await loadSpatialApi(),OUT='deliverables/continue211-220-20260930/design-new';
const maps=JSON.parse(fs.readFileSync(`${OUT}/native-layouts211.json`));
for(let i=0;i<maps.length;i++){
const l=maps[i];for(const [id,color]of Object.entries({d:'red',h:'purple',b:'red',g:'blue',k:'red'}))l.blocks.find(b=>b.id==='l211-'+id).color=color;
const u=searchSpatial(l,api,{floor:11,normalize:true,maxMilliseconds:4000,maxStates:50000,maxTransitions:1500000,diagnosticTrace:true});console.log(i,u.status,u.cost,u.maxClearsSeen);
const replay=u.drags?core.replayRevisedRoute(l,u.drags):null,lower=u.drags?searchSpatial(l,api,{floor:5,prove:true,maxMilliseconds:5000,maxStates:100000,maxTransitions:1500000}):null;
console.log(replay,lower?.status);
fs.writeFileSync(`${OUT}/redpass${i}.json`,JSON.stringify({level:l,result:u,replay,lower},null,2));
}
