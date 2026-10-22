import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {unionPaths} from './author240-alt-blocker-bound.mjs';
import {joinTargetMasks} from './author232-prefix-bound.mjs';
import {ROOT,ruleGate,writeNew} from './common.mjs';
ruleGate();let seed=233761;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const minimal=xs=>xs.filter(a=>!xs.some(b=>a!==b&&(a&b)===b)).sort((a,b)=>a-b);
function reachable(g,mask){if(g.occupied[g.start]&~mask)return false;const seen=new Set([g.start]),queue=[g.start];for(let i=0;i<queue.length;i++){const p=queue[i];if(g.goals.includes(p))return true;for(const n of g.neighbors[p])if(!seen.has(n)&&!(g.occupied[n]&~mask)){seen.add(n);queue.push(n);}}return false;}
const cases=[];
for(let sample=0;sample<40;sample++){
 const bits=4+sample%5,N=7+sample%6,graphs=[];
 for(let target=0;target<6;target++){
  const forbidden=new Set(Array.from({length:N},(_,i)=>i).filter(i=>i!==0&&i!==N-1&&random()<.12)),neighbors=Array.from({length:N},()=>[]);
  for(let a=0;a<N;a++)for(let b=a+1;b<N;b++)if(!forbidden.has(a)&&!forbidden.has(b)&&(b===a+1||random()<.25)){neighbors[a].push(b);neighbors[b].push(a);}
  graphs.push({neighbors,occupied:Array.from({length:N},(_,i)=>i===0?0:(1<<Math.floor(random()*bits))|(random()<.2?1<<Math.floor(random()*bits):0)),start:0,goals:[N-1]});
 }
 const outputs=graphs.map(g=>unionPaths(g,{maxLabels:100000,maxMilliseconds:1000}));assert(outputs.every(r=>r.status==='complete'));
 for(let t=0;t<6;t++){const brute=[];for(let m=0;m<1<<bits;m++)if(reachable(graphs[t],m))brute.push(m);assert.deepEqual([...outputs[t].masks].sort((a,b)=>a-b),minimal(brute));}
 const expected=[];for(let m=0;m<1<<bits;m++)if(graphs.every(g=>reachable(g,m)))expected.push(m);
 const joint=joinTargetMasks(outputs.map(r=>r.masks));assert.equal(joint.status,'complete');assert.deepEqual([...joint.masks].sort((a,b)=>a-b),minimal(expected));
 cases.push({sample,bits,posesPerTarget:N,targets:6,subsetsEnumerated:1<<bits,permanentForbiddenPoseGraphs:true,jointAntichain:joint.masks,joined:joint.joined});
}
const files=['tools/continue231-240/author232-prefix-bound.mjs','tools/continue231-240/author232-prefix-qualify.mjs','tools/continue231-240/author240-alt-blocker-bound.mjs'],file=`${ROOT}/author232/prefix-qualification-${Date.now()}.json`;
writeNew(file,{status:'PASS',qualificationOnly:true,method:'Independent exhaustive obstacle-subset BFS compares exact minimal feasible masks for240 single-target graphs, including permanently forbidden poses and no-path cases, and all six-target joint masks for40 groups. The six-target Cartesian antichain is checked against direct feasibility of every obstacle subset.',singleTargetGraphs:240,sixTargetProducts:40,sourceRawSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),cases});console.log(JSON.stringify({file,status:'PASS',singleTargetGraphs:240,sixTargetProducts:40}));
