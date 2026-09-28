import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const ids = new Set([54,56,63,89,101,118,135,172,194]);
const source = `export { LEVELS } from ${JSON.stringify(path.resolve(root,'src/core/levels.ts'))};`;
const bundle = await build({stdin:{contents:source,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const temp=path.join(tmpdir(),`axis-inspect-${process.pid}-${Date.now()}.mjs`);fs.writeFileSync(temp,bundle.outputFiles[0].text,'utf8');
const {LEVELS}=await import(pathToFileURL(temp).href);fs.rmSync(temp,{force:true});
for(const level of LEVELS.filter(l=>ids.has(l.id))){
  console.log(JSON.stringify({id:level.id,gates:level.gates,axes:level.blocks.filter(b=>b.movementAxis).map(b=>({id:b.id,color:b.color,axis:b.movementAxis,shape:b.shape,x:b.x,y:b.y,shutterId:b.shutterId})),rectangles:level.blocks.filter(b=>!b.movementAxis&&(()=>{const xs=b.shape.map(([x])=>x),ys=b.shape.map(([,y])=>y);const w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;return b.shape.length===w*h;})()).map(b=>({id:b.id,color:b.color,shape:b.shape,x:b.x,y:b.y,shutterId:b.shutterId}))}));
}
