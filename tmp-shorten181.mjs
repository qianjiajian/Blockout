import fs from 'node:fs';
import {build} from 'esbuild';
const code=`export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';`;
const b=await build({stdin:{contents:code,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const file='deliverables/remake181-190-v146-20260924/source181-185/candidate181-3729506870-1790250304286.json';const j=JSON.parse(fs.readFileSync(file));const level=structuredClone(j.level);for(const b of level.blocks)delete b.timedBombSeconds;const d=j.drags;
const found=[];const test=(skip)=>{const route=d.filter((_,i)=>!skip.has(i));const r=api.replayRevisedRoute(level,route);if(r.valid&&r.complete&&r.nonClearingDrags>=11&&r.nonClearingDrags<=15)found.push({skip:[...skip],drags:route.length,nonClearing:r.nonClearingDrags,route});};
test(new Set());for(let i=0;i<d.length;i++)test(new Set([i]));for(let i=0;i<d.length;i++)for(let j=i+1;j<d.length;j++)test(new Set([i,j]));
console.log(JSON.stringify({found:found.slice(0,10),count:found.length},null,2));if(found[0])fs.writeFileSync('deliverables/star-targets181-187-20260929/finite-181-20260930/shortened-372950.json',JSON.stringify({source:file,level:j.level,drags:found[0].route,newMoveTarget:43,timeTargetSeconds:79},null,2)+'\n');
