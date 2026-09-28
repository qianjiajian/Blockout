import fs from 'node:fs';
import {loadApi} from '../../remake21to30-v120.mjs';
import {SHAPES,rect,pack,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {search as distanceSearch} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/distance-search.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64',data=JSON.parse(fs.readFileSync(process.argv[2])),rng=seededRng(Number(process.env.SEED??148364)),{api}=await loadApi();
const level=structuredClone(data.level),shapeKey=s=>JSON.stringify(s),kinds=new Map();let kindsIndex=0;
for(const b of level.blocks){const k=shapeKey(b.shape);if(!kinds.has(k)){kinds.set(k,'K'+kindsIndex++);SHAPES[kinds.get(k)]=[b.shape];}}
const specs=level.blocks.map(b=>({...b,kind:kinds.get(shapeKey(b.shape))})),begin=Date.now();let attempts=0,best=Infinity,full=Infinity;const seen=new Set();
if(process.env.KEEP_GATES!=='1')for(const g of level.gates)if(g.color==='green'){g.side='top';g.offset=1;g.size=2;}else if(g.color==='purple'){g.side='top';g.offset=3;g.size=3;}
while(Date.now()-begin<Number(process.env.SECONDS??100)*1000){attempts++;const l=structuredClone(level);const covers=l.shutters;
 const fixed=process.env.FORCE_OPENING64==='bottom_h3'?[['opening-11',0,9],['opening-1',3,9],['opening-10',6,2]]:[];for(const[id,x,y]of fixed)Object.assign(l.blocks.find(b=>b.id.endsWith(id)),{x,y});
 const stages=process.env.STAGE_ONLY?[covers.find(c=>c.id.endsWith(process.env.STAGE_ONLY)).id]:process.env.OPENING_ONLY==='1'?[undefined]:[undefined,...covers.map(c=>c.id)];let failed=false;
 for(const stage of stages){const cover=covers.find(c=>c.id===stage),fixedBodies=!stage?l.blocks.filter(b=>fixed.some(([id])=>b.id.endsWith(id))):[],occupied=new Set(fixedBodies.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy].join(',')))),cells=cover?rect(cover.width,cover.height).map(([x,y])=>[x+cover.x,y+cover.y]):l.playable.filter(([x,y])=>!covers.some(c=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height)&&!occupied.has([x,y].join(',')));
  const src=specs.filter(b=>b.shutterId===stage&&!fixedBodies.some(f=>f.id===b.id)),p=pack(src,cells,rng,20000,!stage);if(!p){failed=true;break;}for(const b of p){const t=l.blocks.find(x=>x.id===src[b.id]?.id);if(!t)throw Error('id mapping');t.x=b.x;t.y=b.y;}
 }
 if(failed)continue;if(process.env.BOTTOM_H3==='1'&&l.blocks.find(b=>b.id.endsWith('opening-11')).y!==9)continue;const hash=JSON.stringify(l.blocks.map(b=>[b.x,b.y]));if(seen.has(hash))continue;seen.add(hash);
 try{api.validateLevel(l);}catch{continue;}
 const early=search(l,{floor:Number(process.env.EARLY_FLOOR??7),goalClears:Number(process.env.EARLY_GOAL??8),maxStates:12000,maxMilliseconds:100,orderSeed:attempts%26});
 if(early.status!=='witness')continue;
 if(early.cost<best){best=early.cost;const out=dir+'/focused-prefix64-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({...data,level:l,drags:early.drags,search:early,notComplete:true},null,2));console.log(JSON.stringify({attempts,best,out}));}
 const r=(process.env.DISTANCE==='1'?distanceSearch:search)(l,{floor:Math.min(full,Number(process.env.FULL_FLOOR??16)),maxStates:350000,maxMilliseconds:3000,orderSeed:attempts%26});
 if(r.status==='witness'){const replay=api.replayRevisedRoute(l,r.drags);if(!replay.valid||!replay.complete)throw Error('replay');full=r.cost;const out=dir+'/focused-route64-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({...data,level:l,drags:r.drags,replay,search:r,notComplete:false},null,2));console.log(JSON.stringify({attempts,best,full,out}));if(full<=10)break;}
 if(attempts%100===0)console.log(JSON.stringify({attempts,best,full,status:r.status,max:r.maxClears}));
}
console.log(JSON.stringify({attempts,best,full,ms:Date.now()-begin}));
