import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const source='src/core/leagueLevelData.ts',bytes=await fs.readFile(source);
const sha=b=>createHash('sha256').update(b).digest('hex');
const compiled=await build({entryPoints:[source],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEAGUE_LEVELS:entries}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.equal(entries.length,100);
const sorted=a=>[...a].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));
const footprint=b=>sorted(b.shape.map(([x,y])=>[x+b.x,y+b.y]));
const partition=l=>({width:l.width,height:l.height,playable:sorted(l.playable),blocks:sorted(l.blocks.map(footprint))});
const groups=new Map();
for(const e of entries){const p=partition(e.level),key=sha(JSON.stringify(p));if(!groups.has(key))groups.set(key,{partitionSha256:key,width:p.width,height:p.height,blockCount:p.blocks.length,indices:[]});groups.get(key).indices.push(e.index);}
const patterns=[...groups.values()].sort((a,b)=>b.indices.length-a.indices.length);
const pairs=[[53,73],[58,78],[63,83],[68,88],[93,98]].map(([first,second])=>{
 const a=entries[first-1].level,b=entries[second-1].level;
 const allOtherFieldsWithoutMetadata=l=>({...l,id:undefined,name:undefined,blocks:l.blocks.map(v=>({...v,color:undefined}))});
 return {first,second,sameUncoloredPartition:JSON.stringify(partition(a))===JSON.stringify(partition(b)),sameGates:JSON.stringify(a.gates)===JSON.stringify(b.gates),sameExceptBlockColorsAndNames:JSON.stringify(allOtherFieldsWithoutMetadata(a))===JSON.stringify(allOtherFieldsWithoutMetadata(b)),changedBlockColors:a.blocks.flatMap((v,i)=>v.color===b.blocks[i].color?[]:[{id:v.id,from:v.color,to:b.blocks[i].color}])};
});
assert.equal(sha(await fs.readFile(source)),sha(bytes));
const report={status:'LAYOUT_DIVERSITY_INSUFFICIENT',source,sourceSha256:sha(bytes),count:entries.length,method:'Exact absolute block-cell footprints and board mask. Ignores IDs, colors, gates and mechanism attributes. Includes hidden inventory. Does not merge rotations/reflections or claim gameplay equivalence.',uniqueUncoloredPartitions:patterns.length,patterns,pairs,diagnosis:'Repeated shape/position partitions expanded via equal-shaped block swaps, recolors and gate offsets. Previous normalizer tests exact puzzle relationship equality, not layout diversity.',scope:'Read-only design audit; no production or historical proof changes; difficulty and route certificates not revalidated.'};
const output='deliverables/league-layout-atlas-20261008/layout-repetition-audit.json';
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,status:report.status,count:entries.length,uniqueUncoloredPartitions:patterns.length,groupSizes:patterns.map(p=>p.indices.length),pairs},null,2));
