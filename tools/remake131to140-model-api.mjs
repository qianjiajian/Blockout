import {build} from 'esbuild';
// Candidate work need not initialize unrelated campaign modules while parallel
// batches are being integrated. Formal acceptance continues to load LEVELS.
export async function loadModelApi(){
 const r=await build({stdin:{resolveDir:process.cwd(),contents:`export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute,searchRevisedLevel} from './src/core/revisedLevelSearch.ts'; export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts'; export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
}
