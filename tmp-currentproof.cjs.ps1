const fs=require('fs'),{build}=require('esbuild');
(async()=>{
 const r=await build({stdin:{resolveDir:process.cwd(),contents:`export { CANDIDATE_201_210_LEVELS } from './src/core/formal201to210Data.ts'; export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts';`,sourcefile:'x.ts',loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',logLevel:'silent'});
 fs.writeFileSync('tmp-currentproof.cjs',r.outputFiles[0].text);const api=require('./tmp-currentproof.cjs');
 for(const id of [201,205,206,207,208,209]){const l=api.CANDIDATE_201_210_LEVELS.find(x=>x.id===id);const floor=l.designTargets?.minimumRepositionOverhead; const t=Date.now(); const p=api.checkRevisedRepositionFloor(l,{floor,maxStates:500000,maxDragStates:200000,maxTransitions:20000000,maxMilliseconds:120000}); console.log(JSON.stringify({id,floor,status:p.status,thresholdProven:p.thresholdProven,exploredStates:p.exploredStates,transitions:p.exploredTransitions,termination:p.termination,relaxed:p.relaxedNonClearingDrags,ms:Date.now()-t},null,2)); }
})();
