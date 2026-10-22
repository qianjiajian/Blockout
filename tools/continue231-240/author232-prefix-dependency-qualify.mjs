import fs from 'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{joinDependencyMasks,feedbackMinimum,bitCount}from'./author232-prefix-dependency-core.mjs';
import{ROOT,ruleGate,writeNew}from'./common.mjs';ruleGate();
// Independent cycle oracle: depth-first recursion with gray-stack detection,
// exhaustive removal subsets, and exhaustive path-choice Cartesian products.
function independentFeedback(rows){let best=rows.length;for(let removed=0;removed<1<<rows.length;removed++){
 const deleted=Array.from({length:rows.length},(_,i)=>!!(removed&(1<<i))),states=Array(rows.length).fill(0);let cycle=false;
 const dfs=i=>{if(states[i]===1){cycle=true;return;}if(states[i]===2||cycle)return;states[i]=1;for(let j=0;j<rows.length;j++)if(!deleted[j]&&(rows[i]&(1<<j)))dfs(j);states[i]=2;};
 for(let i=0;i<rows.length;i++)if(!deleted[i])dfs(i);if(!cycle)best=Math.min(best,deleted.filter(Boolean).length);
 }return best;}
function bruteProduct(targetPaths,bits){let min=Infinity,leaves=0;const rawLabels=[],base=(1<<bits)-1;
 const visit=(i,mask,rows,label)=>{if(i===targetPaths.length){const f=independentFeedback(rows);assert.equal(feedbackMinimum(rows).count,f);min=Math.min(min,bitCount(mask)+f);leaves++;rawLabels.push(label);return;}
  for(const path of targetPaths[i]){const obstacles=path&base,edges=path>>>bits;visit(i+1,mask|obstacles,[...rows,edges],label|BigInt(obstacles)|(BigInt(edges)<<BigInt(bits+i*targetPaths.length)));}};
 visit(0,0,[],0n);return{minimum:min,leaves,rawLabels};}
let state=7186302;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),cases=[];
const fixtures=[{name:'two-disjoint-cycles-versus-one-shared-blocker',bits:3,paths:[[1<<(3+1),1],[1<<3],[1<<(3+3),1],[1<<(3+2)],[0],[0]],minimum:1},{name:'three-forced-two-cycles',bits:3,paths:[[1<<(3+1)],[1<<3],[1<<(3+3)],[1<<(3+2)],[1<<(3+5)],[1<<(3+4)]],minimum:3}];
for(let sample=0;sample<48;sample++){
 const bits=3+sample%4,n=6,paths=Array.from({length:n},(_,i)=>Array.from({length:2+sample%2},()=>{
  let obstacles=0;for(let b=0;b<bits;b++)if(random()<.22)obstacles|=1<<b;let edges=0;for(let j=0;j<n;j++)if(j!==i&&random()<.28)edges|=1<<j;return obstacles|(edges<<bits);
 }));fixtures.push({name:'random-'+sample,bits,paths});
}
for(const test of fixtures){const exact=bruteProduct(test.paths,test.bits),result=joinDependencyMasks(test.paths,{obstacleBits:test.bits,maxJoined:100000});assert.equal(result.status,'complete');assert.equal(result.minimum,exact.minimum);if(test.minimum!==undefined)assert.equal(result.minimum,test.minimum);
 const minimal=result.antichainLabels.map(BigInt);for(const full of exact.rawLabels)assert(minimal.some(m=>(m&full)===m),'Every full path product must have a componentwise subset cover');for(const m of minimal)assert(exact.rawLabels.includes(m),'Antichain labels must be real path products');
 cases.push({name:test.name,bits:test.bits,targets:6,rawCartesianProducts:exact.leaves,antichainLabels:minimal.length,minimum:result.minimum,best:result.best});
}
const files=['tools/continue231-240/author232-prefix-dependency-bound.mjs','tools/continue231-240/author232-prefix-dependency-core.mjs','tools/continue231-240/author232-prefix-dependency-qualify.mjs','tools/continue231-240/author240-alt-blocker-bound.mjs'],file=`${ROOT}/author232/prefix-dependency-qualification-${Date.now()}.json`;
writeNew(file,{status:'PASS',method:'All path choices enumerated jointly in50 independent six-target fixtures. DFS cycle detection and every removed-vertex subset independently determine feedback minima. The exact minimum of frozen-blocker count plus feedback count matches the optimized joint product; every raw product has a componentwise subset cover and every retained label is a real product. This explicitly tests the tradeoff where two cycles can be replaced by one shared frozen blocker; pruning only by frozen mask would be unsound.',fixtures:cases.length,rawCartesianProducts:cases.reduce((n,c)=>n+c.rawCartesianProducts,0),cases,sourceRawSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))});console.log(JSON.stringify({file,status:'PASS',fixtures:cases.length,rawCartesianProducts:cases.reduce((n,c)=>n+c.rawCartesianProducts,0)}));
