import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compileTerminal,normalizeTerminal} from './terminal-normalized-floor58-v147.mjs';
import {stateFromSnapshot,eachImmediateOptional} from './immediate-generator-floor56-v146.mjs';
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';"},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const files=process.argv.slice(2);assert(files.length);const meta=await build({entryPoints:[import.meta.filename],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const refs=[...new Set([...Object.keys(compiled.metafile.inputs),...Object.keys(meta.metafile.inputs),...files,'tests/campaign-v145/lv051-060/terminal-normalized-floor58-v147.test.mjs'].filter(p=>p!=='<stdin>'))],bindings=Object.fromEntries(refs.map(p=>[p,digest(fs.readFileSync(p))]));
const key=s=>String.fromCharCode(...s),apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const close=(c,m)=>{const n=normalizeTerminal(c,stateFromSnapshot(c,m.snapshot())),r=m.clone();for(const d of n.actions)apply(r,d);assert.equal(key(stateFromSnapshot(c,r.snapshot())),key(n.state));return{model:r,actions:n.actions};};
const rows=[];
for(const file of files){const d=JSON.parse(fs.readFileSync(file)),c=compileTerminal(d.level,api),m=new api.PuzzleModel(d.level);m.startCountdown();let testedEdges=0,terminalPrefixes=0,normalizedBodyClears=0;
 for(let step=0;step<=d.drags.length;step++){
  const s=stateFromSnapshot(c,m.snapshot()),closed=close(c,m);if(!s.includes(510))terminalPrefixes++;normalizedBodyClears+=closed.actions.length;
  if(s.includes(510))assert.equal(closed.actions.length,0);
  let local=0;
  eachImmediateOptional(c,s,(next,cost,get)=>{const drag=get(),real=m.clone();apply(real,drag);assert.equal(key(stateFromSnapshot(c,real.snapshot())),key(next));const mapped=closed.model.clone(),body=mapped.snapshot().blocks.find(b=>b.id===drag.blockId),before=mapped.snapshot().cleared;if(body)apply(mapped,drag);assert((body&&mapped.snapshot().cleared===before?1:0)<=cost);const after=close(c,mapped).model,a=stateFromSnapshot(c,after.snapshot()),target=normalizeTerminal(c,next).state;assert(a.every((v,i)=>v===511||v===target[i]));assert(after.snapshot().cleared>=real.snapshot().cleared);testedEdges++;if(++local===15)return false;});
  if(step<d.drags.length)apply(m,d.drags[step]);
 }assert(m.snapshot().complete);assert(terminalPrefixes>0&&normalizedBodyClears>0);rows.push({file,levelSha256:digest(d.level),routeSha256:digest(d.drags),prefixes:d.drags.length+1,testedEdges,terminalPrefixes,normalizedBodyClears});
}
const drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(drift,[]);
const out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/terminal-qualification-${Date.now()}.json`;
fs.writeFileSync(out,JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),scope:'sampled independent real-model simulation plus separately documented monotonicity proof; not exhaustive on full levels',rows,bindings,drift},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,rows}));
