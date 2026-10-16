import fs from 'node:fs'; import {build} from 'esbuild';
const dir='deliverables/continue201-210-20260929/simple-candidates';
const b=await build({stdin:{resolveDir:process.cwd(),contents:`export { PuzzleModel } from './src/core/PuzzleModel.ts';export {replayRevisedRoute,searchRevisedLevel} from './src/core/revisedLevelSearch.ts';export {auditRevisedMechanismContract} from './src/core/revisedMechanismContract.ts';`,sourcefile:'verify.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const ls=JSON.parse(fs.readFileSync(`${dir}/levels.json`)),routes=JSON.parse(fs.readFileSync(`${dir}/routes.json`));
const raw=JSON.parse(fs.readFileSync('deliverables/campaign121-130-v146-20260924/round3-b/reviewed127-1790471200042.json'));
console.log('127 raw keys',Object.keys(raw));
for(const l of ls){const ds=routes.records[l.id].routeDrags;const out=api.replayRevisedRoute(l,ds);console.log(JSON.stringify({id:l.id,bombs:l.blocks.filter(b=>b.timedBombSeconds).map(b=>({id:b.id,seconds:b.timedBombSeconds})),replay:{...out,finalStateKey:undefined}}));}
const l=structuredClone(raw.level);l.mechanismRules='revised-2026-09-27-v1.5';const ds=raw.drags??raw.search?.drags;console.log(JSON.stringify({id:127,route:ds?.length,audit:api.auditRevisedMechanismContract(l),replay:ds?{...api.replayRevisedRoute(l,ds),finalStateKey:undefined}:null}));
