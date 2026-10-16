import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {build as esbuild} from 'esbuild';
import {build as viteBuild} from 'vite';
import {createWebRuntimeLevelProjection,webRuntimeLevelProjectionPlugin} from './web-runtime-level-projection.mjs';

const root=process.cwd(),sourceRoot=resolve(process.env.PROJECTION_SOURCE_ROOT??'.codex-temp/perf-five-20261014/baseline');
const output=resolve(`.codex-temp/perf-five-20261014/projection-probe-${Date.now()}`);await mkdir(output,{recursive:true});
const projection=await createWebRuntimeLevelProjection({root,sourceRoot});
await writeFile(resolve(output,'projection.mjs'),projection.code);
const readSources=projected=>({name:'frozen-projection-probe',setup(b){b.onLoad({filter:/\.ts$/},async args=>({contents:projected&&args.path===resolve(root,'src/core/levels.ts')?projection.code:await readFile(resolve(sourceRoot,args.path.slice(root.length+1)),'utf8'),loader:'ts',resolveDir:dirname(args.path)}));}});
const esbuildMetrics={};
for(const variant of ['before','projected']){
 const result=await esbuild({entryPoints:['src/web.ts'],bundle:true,minify:true,write:false,metafile:true,format:'esm',platform:'browser',target:'es2020',logLevel:'silent',plugins:[readSources(variant==='projected')]});
 const code=result.outputFiles[0].contents;await writeFile(resolve(output,variant+'.js'),code);await writeFile(resolve(output,variant+'-meta.json'),JSON.stringify(result.metafile,null,2));
 esbuildMetrics[variant]={bytes:code.length,gzipBytes:gzipSync(code).length,brotliBytes:brotliCompressSync(code).length,modules:Object.keys(result.metafile.inputs).length};
}
const fixture=`import * as levels from './src/core/levels.ts';import {PuzzleModel}from './src/core/PuzzleModel.ts';export const openingSnapshots=[...levels.LEVELS,...levels.FORMAL_201_210_LEVELS,...levels.FORMAL_211_220_LEVELS,...levels.FORMAL_221_230_LEVELS].map(level=>new PuzzleModel(level).snapshot());`;
const openings={};for(const variant of ['before','projected']){const result=await esbuild({stdin:{contents:fixture,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',plugins:[readSources(variant==='projected')],logLevel:'silent'});openings[variant]=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'))).openingSnapshots;}
assert.deepStrictEqual(openings.projected,openings.before,'All 230 initial PuzzleModel snapshots must be identical');
const frozenInputs={};
const frozenPlugin=()=>({name:'frozen-sources',enforce:'pre',async load(id){const file=resolve(id);if(file.startsWith(resolve(root,'src'))&&file.endsWith('.ts')){const relative=file.slice(root.length+1),input=resolve(sourceRoot,relative);frozenInputs[relative]=input;return await readFile(input,'utf8');}}});
const viteMetrics={};
for(const variant of ['before','projected']){
 const plugins=()=>[...(variant==='projected'?[webRuntimeLevelProjectionPlugin({sourceRoot})]:[]),frozenPlugin()];
 const outDir=resolve(output,'vite-'+variant);
 await viteBuild({configFile:false,root,base:'./',publicDir:false,plugins:plugins(),worker:{plugins},logLevel:'error',build:{target:'es2020',outDir,emptyOutDir:false,manifest:true,rollupOptions:{input:{game:resolve(root,'index.html'),boardEditor:resolve(root,'board-editor.html')}}}});
 const manifest=JSON.parse(await readFile(resolve(outDir,'.vite/manifest.json'),'utf8')),seen=new Set();
 const visit=key=>{if(seen.has(key))return;seen.add(key);for(const child of manifest[key].imports??[])visit(child);};visit('index.html');
 const initialFiles=[...seen].map(key=>manifest[key].file),metrics=[];
 for(const name of await readdir(resolve(outDir,'assets')))if(name.endsWith('.js')){const code=await readFile(resolve(outDir,'assets',name));metrics.push({file:'assets/'+name,bytes:code.length,gzipBytes:gzipSync(code).length,brotliBytes:brotliCompressSync(code).length,initial:initialFiles.includes('assets/'+name)});}
 viteMetrics[variant]={outDir,initialFiles,files:metrics,initialBytes:metrics.filter(m=>m.initial).reduce((s,m)=>s+m.bytes,0),initialGzipBytes:metrics.filter(m=>m.initial).reduce((s,m)=>s+m.gzipBytes,0),initialBrotliBytes:metrics.filter(m=>m.initial).reduce((s,m)=>s+m.brotliBytes,0)};
}
assert(Object.keys(frozenInputs).length>200,'Vite must actually load the frozen TypeScript inputs on Windows too');
const report={status:'PASS',scope:'Build-only prototype against frozen complete source. No source level/proof data changed. Compression numbers are calculated output bytes, not measured network bandwidth.',sourceRoot,frozenInputs,projection:projection.report,openingSnapshotCount:openings.before.length,esbuildMetrics,viteMetrics};
await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,status:report.status,openingSnapshots:report.openingSnapshotCount,esbuildMetrics,viteMetrics},null,2));
