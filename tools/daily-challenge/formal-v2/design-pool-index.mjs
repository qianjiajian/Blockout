import fs from 'node:fs';
import {independentPartitionSha256} from './geometry.mjs';
const dir='deliverables/daily-formal-v2-20261007/design-lab';
const names=fs.readdirSync(dir).filter(n=>n.endsWith('.json'));
const records=[],duplicates=[],seen=new Map();
const preference=n=>/^stage1-d3-\d/.test(n)?0:/^stage1-d[12]-10-seed/.test(n)?1:2;
for(const name of names.sort((a,b)=>preference(a)-preference(b)||a.localeCompare(b))){
 const c=JSON.parse(fs.readFileSync(`${dir}/${name}`));
 if(!c.accepted||!c.level||!c.drags||c.stageKey!=='mechanisms-color-exit-1')continue;
 const key=independentPartitionSha256(c.level),path=`${dir}/${name}`;
 if(seen.has(key)){duplicates.push({path,duplicateOf:seen.get(key)});continue;}seen.set(key,path);
 records.push({path,formalId:c.formalId,difficulty:c.difficulty,L:c.L,U:c.U,sourceLevelId:c.sourceLevelId,levelSha256:c.levelSha256,partitionSha256:key,toolchainSha256:c.toolchainSha256,status:c.status});
}
const selected=[1,2,3].flatMap(d=>records.filter(r=>r.difficulty===d).slice(0,10).map((r,i)=>({...r,intendedFormalId:`daily-mechanisms-color-exit-1-d${d}-${String(i+1).padStart(2,'0')}`})));
const report={status:'ISOLATED_SPATIAL_CANDIDATE_POOL',productionChanged:false,formalReady:false,note:'Per-file lower proof and double model replay are retained. Selection is an independent-partition proposal; root must rebind current contract, run Pointer/time acceptance, and adopt.',counts:[1,2,3].map(d=>({difficulty:d,count:records.filter(r=>r.difficulty===d).length,selected:selected.filter(r=>r.difficulty===d).length})),selected,records,duplicates};
fs.writeFileSync(`${dir}/design-pool-index.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,unique:records.length,duplicates:duplicates.length}));
