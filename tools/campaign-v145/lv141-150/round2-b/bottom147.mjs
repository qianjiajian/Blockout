import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {prefix147} from './prefix147.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b',source=OUT+'/candidate147-1790477253443-9.json',base=JSON.parse(fs.readFileSync(source));
const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[];let rng=Number(process.argv[2]??147189);const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;},shuffle=a=>a.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const region=Array.from({length:14},(_,i)=>[i%7,10+Math.floor(i/7)]),key=p=>p.join(',');
function tile(bs){const wanted=new Set(region.map(key)),used=new Set(),occ=new Map(),placed=[],ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);return cells.every(p=>wanted.has(key(p)))?[{i,x,y,cells,keys:cells.map(key)}]:[]})));let nodes=0;
 function walk(){if(++nodes>5000)return null;if(used.size===bs.length)return structuredClone(placed);let best;for(const cell of wanted){if(occ.has(cell))continue;const opts=[];for(let i=0;i<bs.length;i++)if(!used.has(i))for(const p of ps[i])if(p.keys.includes(cell)&&p.cells.every(([x,y])=>!occ.has(`${x},${y}`)&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(q=>occ.get(key(q))!==bs[i].color)))opts.push(p);if(!opts.length)return null;if(!best||opts.length<best.length)best=opts;}for(const p of shuffle(best)){used.add(p.i);for(const k of p.keys)occ.set(k,bs[p.i].color);placed.push({...bs[p.i],x:p.x,y:p.y});const r=walk();if(r)return r;placed.pop();used.delete(p.i);for(const k of p.keys)occ.delete(k);}return null;}return walk();}
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<1500;n++){
 const level=structuredClone(base.level),bottom=level.blocks.filter(b=>!b.shutterId&&b.y>=10);
 for(const b of bottom){b.color=shuffle(['green','green','blue','blue','blue','pink','orange'])[0];if(b.shape.length===2)b.shape=rnd()<.5?[[0,0],[1,0]]:[[0,0],[0,1]];}
 const tiled=tile(bottom);if(!tiled)continue;const ids=new Set(bottom.map(b=>b.id));level.blocks=level.blocks.map(b=>ids.has(b.id)?tiled.find(t=>t.id===b.id):b);
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const prefix=prefix147(level,api,{floor:9,maxMilliseconds:1000,maxStates:80000});const row={n,prefix:prefix.status,cost:prefix.cost,states:prefix.states};
 if(prefix.status==='relaxed-shortcut'&&prefix.cost>=3){const file=OUT+`/prefix-candidate147-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,prefix,source},null,2));row.file=file;
  if(prefix.cost>=5){const r=searchSpatial(level,api,{floor:11,maxStates:90000,maxMilliseconds:5000,weight:100,normalize:true,diagnosticTrace:true});row.full={status:r.status,cost:r.cost,clears:r.maxClearsSeen};if(r.drags){const short=shortenRoute(level,r.drags,api);if(short.replay.valid&&short.replay.complete){const full=OUT+`/candidate147-bottom-${stamp}-${n}.json`;fs.writeFileSync(full,JSON.stringify({level,drags:short.drags,replay:short.replay,source,levelSha256:digest(level),prefix},null,2));row.complete=full;console.log(JSON.stringify(row));rows.push(row);break;}}}
 }
 rows.push(row);if(prefix.cost>=2||n%20===0)console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/bottom147-${stamp}.json`,JSON.stringify(rows,null,2));
}
