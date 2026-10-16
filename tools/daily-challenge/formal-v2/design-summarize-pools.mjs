import fs from 'node:fs';
import {independentPartitionSha256} from './geometry.mjs';
const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const label=process.env.DESIGN_SUMMARY_LABEL??'pool-snapshot';
const output=`${OUT}/${label}.json`;if(fs.existsSync(output))throw new Error('Do not overwrite a historical snapshot');
const dirs=[OUT,'deliverables/daily-formal-v2-20261007/design-d3-proof','deliverables/daily-formal-v2-20261007/design-band-proof'];
const all=[];
const scan=dir=>{if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${item.name}`;if(item.isDirectory())scan(path);else if(item.name.endsWith('.json')){let c;try{c=JSON.parse(fs.readFileSync(path));}catch{continue;}if(c.accepted&&c.level&&c.drags)all.push({path,formalId:c.formalId,stageKey:c.stageKey,difficulty:c.difficulty,L:c.L,U:c.U,sourceLevelId:c.sourceLevelId,levelSha256:c.levelSha256,partitionSha256:independentPartitionSha256(c.level)});}}};
for(const dir of dirs)scan(dir);
const selectedPaths=new Set(JSON.parse(fs.readFileSync(`${OUT}/design-pool-index.json`)).selected.map(r=>r.path));
all.sort((a,b)=>Number(selectedPaths.has(b.path))-Number(selectedPaths.has(a.path))||a.path.localeCompare(b.path));
const partitions=new Map(),records=[],duplicates=[];
for(const r of all){if(partitions.has(r.partitionSha256)){duplicates.push({...r,duplicateOf:partitions.get(r.partitionSha256)});continue;}partitions.set(r.partitionSha256,r.path);records.push(r);}
const batchChecks=fs.readdirSync(OUT).filter(n=>n.endsWith('-batch.json')).map(name=>{
 const b=JSON.parse(fs.readFileSync(`${OUT}/${name}`));
 const rows=(b.rows??[]).filter(r=>r.reportPath).map(row=>{const report=JSON.parse(fs.readFileSync(row.reportPath));const attempted=report.attemptedCandidates??report.rows.filter(r=>r.levelSha256).length;return{batch:row.batch,attempted,cap:report.finiteBudget.maxCandidates,withinBudget:attempted<=report.finiteBudget.maxCandidates};});
 return{path:`${OUT}/${name}`,status:b.status,rows,allWithinCap:rows.every(r=>r.withinBudget),note:'Older running batch summaries counted fingerprint-only skipped rows as tried; this recomputes actual solver attempts from final child records.'};
});
const report={status:'ISOLATED_SPATIAL_POOLS_SNAPSHOT',snapshotAt:new Date().toISOString(),productionChanged:false,formalReady:false,scope:'Only plain or foundational candidate generation directories; qualified copies and mechanism decorators excluded to avoid double counting.',counts:[1,2,3].map(d=>({difficulty:d,count:records.filter(r=>r.difficulty===d).length})),stageCounts:[...new Set(records.map(r=>r.stageKey))].map(stageKey=>({stageKey,counts:[1,2,3].map(d=>({difficulty:d,count:records.filter(r=>r.stageKey===stageKey&&r.difficulty===d).length}))})),records,duplicates,batchChecks};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({path:output,counts:report.counts,unique:records.length,duplicates:duplicates.length,allWithinCap:batchChecks.every(b=>b.allWithinCap)}));
