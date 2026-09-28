import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {prefix147} from './prefix147.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b',source=OUT+'/candidate147-1790477253443-9.json',base=JSON.parse(fs.readFileSync(source));
const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[];let rng=Number(process.argv[2]??147193);const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;},shuffle=a=>a.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const region=base.level.playable.filter(([x,y])=>y>=4&&y<=10&&(x>=4||y>=9)),key=p=>p.join(',');
function tile(bs){const wanted=new Set(region.map(key)),used=new Set(),occ=new Map(),placed=[],ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);return cells.every(p=>wanted.has(key(p)))?[{i,x,y,cells,keys:cells.map(key)}]:[]})));let nodes=0,deadline=Date.now()+80;
 function walk(){if(++nodes>12000||Date.now()>deadline)return null;if(used.size===bs.length)return structuredClone(placed);let best;for(const cell of wanted){if(occ.has(cell))continue;const opts=[];for(let i=0;i<bs.length;i++)if(!used.has(i))for(const p of ps[i])if(p.keys.includes(cell)&&p.cells.every(([x,y])=>!occ.has(`${x},${y}`)&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(q=>occ.get(key(q))!==bs[i].color)))opts.push(p);if(!opts.length)return null;if(!best||opts.length<best.length)best=opts;if(best.length===1)break;}for(const p of shuffle(best)){used.add(p.i);for(const k of p.keys)occ.set(k,bs[p.i].color);placed.push({...bs[p.i],x:p.x,y:p.y});const r=walk();if(r)return r;placed.pop();used.delete(p.i);for(const k of p.keys)occ.delete(k);}return null;}return walk();}
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
let best=0;
for(let n=0;n<1200;n++){
 const level=structuredClone(base.level);for(const s of level.shutters){const dy=s.id==='s147-c0'||s.id==='s147-lift2'?2:s.id==='s147-c2'||s.id==='s147-lift1'?-5:s.id==='s147-lift0'?-2:0;s.y+=dy;for(const b of level.blocks)if(b.shutterId===s.id)b.y+=dy;}
 const o0=level.blocks.find(b=>b.id==='s147-o0');o0.shape=[[0,0],[1,0]];o0.x=4;o0.y=0;
 const opening=level.blocks.filter(b=>!b.shutterId&&!['s147-o0','s147-o3'].includes(b.id));
 for(const b of opening)b.color=shuffle(['green','green','blue','blue','orange','pink','cyan','yellow'])[0];
 const tiled=tile(opening);if(!tiled)continue;const ids=new Set(opening.map(b=>b.id));level.blocks=level.blocks.map(b=>ids.has(b.id)?tiled.find(t=>t.id===b.id):b);
 const slots={green:['right',9,3],blue:['right',4,3],pink:['bottom',4,3],red:['bottom',0,3]};for(const g of level.gates)if(slots[g.id])[g.side,g.offset,g.size]=slots[g.id];
 try{api.validateLevel(level);const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code)),art=api.auditCandidateBlockArt(level);if(issues.length||!art.passed){if(n<3)console.log(JSON.stringify({n,issues,art}));continue;}}catch(e){if(n<3)console.log(JSON.stringify({n,error:e.message}));continue;}
 const prefix=prefix147(level,api,{floor:8,maxMilliseconds:400,maxStates:25000});const row={n,prefix:prefix.status,cost:prefix.cost,states:prefix.states};
 if(prefix.status==='relaxed-shortcut'&&prefix.cost>=3){const file=OUT+`/prefix-candidate147-retile-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,prefix,source},null,2));row.file=file;
  if(prefix.cost>=5){const r=searchSpatial(level,api,{floor:11,maxStates:65000,maxMilliseconds:4000,weight:100,normalize:true,diagnosticTrace:true});row.full={status:r.status,cost:r.cost??r.partialCost,clears:r.maxClearsSeen};if(r.drags){const short=shortenRoute(level,r.drags,api);if(short.replay.valid&&short.replay.complete){const full=OUT+`/candidate147-retile-${stamp}-${n}.json`;fs.writeFileSync(full,JSON.stringify({level,drags:short.drags,replay:short.replay,source,levelSha256:digest(level),prefix},null,2));row.complete=full;console.log(JSON.stringify(row));rows.push(row);break;}}else if(r.maxClearsSeen>best){best=r.maxClearsSeen;const partial=OUT+`/partial147-retile-${stamp}-${n}.json`;fs.writeFileSync(partial,JSON.stringify({level,result:r,source,prefix},null,2));row.partial=partial;}}
 }
 rows.push(row);if(prefix.cost>=2||n%20===0)console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/retile147-${stamp}.json`,JSON.stringify(rows,null,2));
}
