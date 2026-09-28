import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {native145,project,OUT} from './check145.mjs';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/candidate145-reviewed-v4.json',base=JSON.parse(fs.readFileSync(source));const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[];
let rng=Number(process.argv[2]??145177);const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;},shuffle=a=>a.map(x=>[rnd(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const colors=['pink','red','yellow','blue','green'],shapes={V3:[[0,0],[0,1],[0,2]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],H2:[[0,0],[1,0]],SQ2:[[0,0],[1,0],[0,1],[1,1]]};
const region=base.level.playable.filter(p=>p[1]<6),key=p=>p.join(',');
function tile(bs){const wanted=new Set(region.map(key)),used=new Set(),occupied=new Map(),placed=[],deadline=Date.now()+150;let nodes=0;
 const ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);return cells.every(p=>wanted.has(key(p)))?[{i,x,y,cells,keys:cells.map(key)}]:[]})));
 const fits=p=>p.cells.every(([x,y])=>!occupied.has(`${x},${y}`)&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].every(q=>occupied.get(key(q))!==bs[p.i].color));
 function walk(){if(++nodes>15000||Date.now()>deadline)return null;if(used.size===bs.length)return structuredClone(placed);let best;for(const cell of wanted){if(occupied.has(cell))continue;const opts=[];for(let i=0;i<bs.length;i++)if(!used.has(i))for(const p of ps[i])if(p.keys.includes(cell)&&fits(p))opts.push(p);if(!opts.length)return null;if(!best||opts.length<best.length)best=opts;if(best.length===1)break;}for(const p of shuffle(best)){used.add(p.i);for(const k of p.keys)occupied.set(k,bs[p.i].color);placed.push({...bs[p.i],x:p.x,y:p.y});const r=walk();if(r)return r;placed.pop();used.delete(p.i);for(const k of p.keys)occupied.delete(k);}return null;}return walk();}
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<800;n++){
 const level=structuredClone(base.level),bs=level.blocks.filter(b=>!b.shutterId);for(const b of bs){if(b.shape.length===3)b.shape=shapes[rnd()<.5?'V3':'H3'];else b.shape=shapes[rnd()<.5?'V2':'H2'];b.color=colors[Math.floor(rnd()*colors.length)];if(b.layers){b.layers[0]=b.color;b.layers[1]=colors.filter(c=>c!==b.color)[Math.floor(rnd()*4)];}}
 const candidates=shuffle(bs.filter(b=>b.shape.length===3));for(let k=0;k<2*(n%4);k+=2){candidates[k].shape=shapes.SQ2;candidates[k+1].shape=shapes[rnd()<.5?'H2':'V2'];}
 const t=tile(bs);if(!t)continue;level.blocks=[...t,...level.blocks.filter(b=>b.shutterId)];
 const slots={pink:['top',1,3],red:['right',2,3],yellow:['left',1,3],blue:['right',5,3],green:['bottom',2,3]};for(const g of level.gates)[g.side,g.offset,g.size]=slots[g.color];
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const spatial=project(level);let result=searchSpatial(spatial,api,{maxMilliseconds:1800,maxStates:50000,floor:22,normalize:true,weight:100,orderSeed:n%21,diagnosticTrace:true});const row={n,status:result.status,cost:result.cost??result.partialCost,clears:result.maxClearsSeen,states:result.discoveredStates};
 if(result.drags){const r=api.replayRevisedRoute(spatial,result.drags);if(r.valid&&r.complete){const short=shortenRoute(spatial,result.drags,api);row.cost=short.replay.nonClearingDrags;let proof;if(row.cost>=11&&row.cost<=15)proof=native145(level,api,{maxStates:1500000,maxMilliseconds:10000});const file=OUT+`/candidate145-retile-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',source,level,drags:short.drags,replay:short.replay,proof,levelSha256:digest(level),routeSha256:digest(short.drags)},null,2));row.file=file;row.proof=proof;if(proof?.thresholdProven){rows.push(row);console.log(JSON.stringify(row));break;}}}
 rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/retile145-${stamp}.json`,JSON.stringify(rows,null,2));
}
