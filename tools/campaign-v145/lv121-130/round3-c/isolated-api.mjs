import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Compile the candidate model and audits without initializing concurrent LEVELS.
// This validates supplied candidate objects; formal runtime validation remains separate.
const root=fileURLToPath(new URL('../../../../',import.meta.url));
let pending;
export function loadIsolatedApi(){
 return pending??=(async()=>{
  const bundle=await build({stdin:{resolveDir:root,contents:`
   export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
   export * from './src/core/revisedLevelSearch.ts';
   export * from './src/core/levelStarConditions.ts';
   export * from './src/core/revisedCandidateAudit.ts';
   export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
   export * from './src/game/formalBlockShapes.ts';
   export * from './src/game/continuousDrag.ts';
   export * from './src/core/blockExitFrontier.ts';
  `},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent',metafile:true});
  assert(!Object.keys(bundle.metafile.inputs).some(p=>/(^|\/)src\/core\/levels\.ts$/.test(p.replaceAll('\\','/'))),'Isolated model must not evaluate LEVELS');
  return import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 })();
}
export const getApi=loadIsolatedApi;
export const apiLoad=loadIsolatedApi;
export default loadIsolatedApi;
