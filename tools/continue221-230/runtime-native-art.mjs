import fs from 'node:fs';
import {build} from 'esbuild';
const bundled=await build({stdin:{resolveDir:process.cwd(),contents:"export {GAME_ART} from './src/game/artManifest';export {matchFormalBlockShape} from './src/game/formalBlockShapes';"},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {GAME_ART,matchFormalBlockShape}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
export function runtimeNativeArtIssues(level){const issues=[];for(const b of level.blocks){const m=matchFormalBlockShape(b.shape,'native-only');if(!m){issues.push({id:b.id,reason:'No native shape'});continue;}
 for(const color of b.layers??[b.color]){const url=GAME_ART.gameplay.formalBlocks[color]?.solid?.[m.shapeId];if(!url||!fs.existsSync('public/'+url))issues.push({id:b.id,color,shapeId:m.shapeId,reason:'Missing registered solid asset'});}
 // Existing renderer also supports a native outer solid plus an inner-color
 // preview badge when there is no dedicated shell image. Both solid layers
 // above remain mandatory; absence of optional shell art is not missing art.
 }
 return issues;}
