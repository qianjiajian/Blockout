import fs from 'node:fs';
let s=fs.readFileSync('tools/campaign-v145/lv141-150/observed-timing-flips.mjs','utf8');
s=s.replace("from '../../revised-preview-validation-v160.mjs'","from '../revised-preview-validation-v160.mjs'").replace('[k,mapIds(x,from,to)]','[mapIds(k,from,to),mapIds(x,from,to)]');
fs.writeFileSync('tools/remake151-160/observed-timing.mjs',s,{flag:'wx'});
let p=fs.readFileSync('tools/remake151-160/pointer.mjs','utf8').replace("from '../campaign-v145/lv141-150/observed-timing-flips.mjs'","from './observed-timing.mjs'");fs.writeFileSync('tools/remake151-160/pointer.mjs',p);
let d=fs.readFileSync('tools/campaign-v145/lv141-150/round2-root/decisions.mjs','utf8');
d=d.replace("import {loadApi,projection,OUTPUT} from '../../../remake141to150-v173.mjs';","import {api,ROOT as OUTPUT,ruleGate} from './common.mjs';\nconst projection=l=>l;ruleGate();").replace("from '../../../revised-preview-validation-v160.mjs'","from '../revised-preview-validation-v160.mjs'").replace('const {api}=await loadApi();','Error.stackTraceLimit=2;');
fs.writeFileSync('tools/remake151-160/decisions.mjs',d,{flag:'wx'});
