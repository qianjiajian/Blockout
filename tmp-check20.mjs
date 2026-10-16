import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`export { searchRevisedLevel,replayRevisedRoute } from './src/core/revisedLevelSearch.ts'; export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const d=JSON.parse(await readFile('deliverables/league-regeneration-20261004/formal/mid-20-64.json','utf8')); const l=d.rows.find(r=>r.index===20).level;
console.log('api',Object.keys(api));
const b={maxStates:10000,maxDragStates:4000,maxTransitions:100000,maxMilliseconds:3000};
try{api.validateLevel(l); console.log('valid');}catch(e){console.log('invalid',e.message)}
let w=api.searchRevisedLevel(l,b); console.log('search',Object.keys(w),{status:w.status,term:w.termination,found:w.witnessFound,drags:w.drags?.length,complete:w.replay?.complete,reason:w.reasons});
let low=api.checkRevisedRepositionFloor(l,{floor:16,...b}); console.log('lower',low);
