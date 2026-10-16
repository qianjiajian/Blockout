import fs from 'node:fs';import {loadSpatialApi} from './continuation211-colored-witness.mjs';import {coverPartitionLower} from './continuation211-partition-proof.mjs';
const path=process.argv[2]??'deliverables/continue211-220-20260930/design216-new/original-10.json',data=JSON.parse(fs.readFileSync(path)),api=await loadSpatialApi();
const result=coverPartitionLower(data.level,api,{coverId:'cover',maxMilliseconds:6000,maxCost:15});
const output=path.replace('.json','-partition.json');fs.writeFileSync(output,JSON.stringify(result,null,2));
console.log({output,floor:result.floor,prefix:result.prefix,hidden:result.hidden});
