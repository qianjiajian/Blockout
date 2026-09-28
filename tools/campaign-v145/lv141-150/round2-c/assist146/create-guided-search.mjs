import fs from 'node:fs';
const dir='tools/campaign-v145/lv141-150/round2-c/assist146';
let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/resume-search.mjs','utf8');
s=s.replace("from '../../../revised-preview-validation-v160.mjs'","from '../../../../revised-preview-validation-v160.mjs'");
s=s.replace(" const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost;",` const distances=c.blocks.map(b=>b.layers.map((_,stage)=>b.poses.map(p=>p?Math.min(50,...b.poses.flatMap((a,q)=>a?.exits[stage].length?[Math.abs(b.poses.indexOf(p)%c.W-q%c.W)+Math.abs(Math.floor(b.poses.indexOf(p)/c.W)-Math.floor(q/c.W))]:[])):50)));
 const heuristic=s=>c.blocks.reduce((v,b,i)=>v+(s[i]!==NONE&&active(c,s,i)?distances[i][s[i]>>>7][s[i]&127]:0),0);
 const score=i=>prove?-nodes[i].cost:nodes[i].clears*weight-nodes[i].cost*5-heuristic(nodes[i].s)*2;`);
fs.writeFileSync(dir+'/guided-search.mjs',s);
