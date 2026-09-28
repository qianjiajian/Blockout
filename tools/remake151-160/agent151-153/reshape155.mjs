import fs from 'node:fs';
import {api,save,rng,adjacent,digest,shapes} from './common.mjs';
import {tile} from '../agent154-156/common.mjs';
import {attempt} from './author155.mjs';
let original=JSON.parse(fs.readFileSync('deliverables/remake151-160-20260927/agent151-153/candidate155-1790517976918.json')).level,best=24;const rows=[],seen=new Set(),start=Number(process.argv[2]??4000),count=Number(process.argv[3]??250);
for(let seed=start;seed<start+count;seed++){
 const l=structuredClone(original),r=rng(seed),allowed=l.blocks.filter(b=>!b.star&&b.shape.length<=3&&b.shape.every(([x,y])=>x===0||y===0)&&!b.shape.some(([x,y])=>x>0)&&b.shape.length<3);
 const pool=l.blocks.filter(b=>!b.star&&b.shape.length<=3&&(b.shape.every(p=>p[0]===0)||b.shape.every(p=>p[1]===0)));
 const group=[r.shuffle(pool)[0]];for(let j=0;j<2+seed%3;j++){const a=r.shuffle(pool.filter(b=>!group.includes(b)&&group.some(g=>adjacent(b,g))))[0];if(a)group.push(a);}
 const cells=group.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y])).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
 const specs=group.map(b=>({...b,shape:shapes[b.shape.length===1?1:b.shape.length===2?(r.random()<.5?2:8):(r.random()<.5?3:9)]}));
 const tiled=tile(specs,cells,seed,5000);if(!tiled)continue;l.blocks=l.blocks.map(b=>tiled.find(x=>x.id===b.id)??b);const h=digest(l);if(seen.has(h)||h===digest(original))continue;seen.add(h);
 const result=attempt(l,seed);rows.push(result);console.log(JSON.stringify(result));if(result.U<best){best=result.U;original=JSON.parse(fs.readFileSync(result.file)).level;}if(result.status==='PASS_CANDIDATE')break;
}
console.log(save('reshape155',rows));
