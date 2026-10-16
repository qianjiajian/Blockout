const fs=require('fs'),{build}=require('esbuild');
(async()=>{const r=await build({stdin:{resolveDir:process.cwd(),contents:`export {LEVELS} from './src/core/levels.ts';export {searchSpatial,loadSpatialApi} from './tools/remake111to120-spatial-floor-v147.mjs';`},bundle:false,write:false,platform:'node',format:'esm',logLevel:'silent'}).catch(e=>{console.error(e);process.exit(1)});})();
