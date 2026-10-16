import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../continuation211-colored-witness.mjs';
import {staticLiftPayload} from '../regeneration211-design/native-static-lift214.mjs';
import {loadContinuationRuntime} from '../continuation211-runtime.mjs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
const OUT='deliverables/league-regeneration-20261004/late-experiments';fs.mkdirSync(OUT,{recursive:true});
export function floor(level,api,options={}){
 const {p}=staticLiftPayload(level,api,options),source='tools/regeneration211-design/native-fifo214.cs',sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex'),exe=path.resolve(OUT,'fifo-'+sourceHash.slice(0,12)+'.exe');
 if(!fs.existsSync(exe))execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/optimize+','/r:System.Web.Extensions.dll','/out:'+exe,path.resolve(source)],{windowsHide:true,stdio:'pipe'});
 const dir=path.resolve(OUT,'native-'+Date.now()+'-'+Math.random().toString(16).slice(2,7));fs.mkdirSync(dir);const input=dir+'/input.json',output=dir+'/output.json';fs.writeFileSync(input,JSON.stringify(p));execFileSync(exe,[input,output],{windowsHide:true,stdio:'pipe',timeout:p.maxMilliseconds+5000});return{...JSON.parse(fs.readFileSync(output)),source,sourceHash,input,output};
}
export const api=await loadSpatialApi(),core=await loadContinuationRuntime();
export async function formal(){const b=await build({stdin:{resolveDir:process.cwd(),contents:"export {FORMAL_211_220_LEVELS} from './src/core/formal211to220Data.ts';export {LEVELS} from './src/core/levels.ts'"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));}
if(process.argv[1]?.endsWith('late-probe.mjs')){
const data=await formal();
for(const id of [65,68,73,78,83,88,93,98,100,217,220]){
 const l=structuredClone([...data.LEVELS,...data.FORMAL_211_220_LEVELS].find(l=>l.id===id));
 if(!l)continue;delete l.coloredGrids;delete l.featureIntro;delete l.onboardingHint;delete l.mechanismAdaptation;
 console.log(JSON.stringify({id,blocks:l.blocks.length,keys:Object.keys(l),blockKeys:[...new Set(l.blocks.flatMap(b=>Object.keys(b)))],gates:l.gates,shutters:l.shutters,generators:l.generators}));
 if(l.flipDoors?.length||l.generators?.length||l.blocks.some(b=>b.bomb||b.keyId||b.lockedBy||b.star))continue;
 const L=floor(l,api,{floor:id===220?21:16,maxMilliseconds:3000,maxStates:500000});
 const upper=searchSpatial(l,api,{floor:id===220?31:21,maxMilliseconds:4000,maxStates:120000,normalize:true});
 const replay=upper.drags?core.replayRevisedRoute(l,upper.drags):null;
 fs.writeFileSync(`${OUT}/base-${id}.json`,JSON.stringify({level:l,lower:L,upper,replay,drags:upper.drags},null,2));
 console.log(JSON.stringify({id,L:L.status,cost:L.relaxedNonClearingDrags,U:replay?.nonClearingDrags,upper:upper.status}));
}
}
