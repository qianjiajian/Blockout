import fs from 'node:fs';import {loadApi} from '../replay.mjs';import {ruleGate,digest,auditSpatial,writeNew} from '../common.mjs';import {search} from './search.mjs';
ruleGate();const {api}=await loadApi();const base=JSON.parse(fs.readFileSync('deliverables/remake182-185-20260927/author185/enriched-1790524540984.json')).level;const OUT='deliverables/remake182-185-20260929/author185';
const cells=Array.from({length:6},(_,y)=>Array.from({length:3},(_,x)=>[x+3,y]));const key=p=>p.join(','),flat=cells.flat();
function retile(l,shape,anchor){const hidden=l.blocks.filter(b=>b.shutterId),dom=hidden.find(b=>b.shape.length>1),rest=hidden.filter(b=>b!==dom);const occupied=shape.map(([dx,dy])=>[anchor[0]+dx,anchor[1]+dy]);const free=flat.filter(p=>!new Set(occupied.map(key)).has(key(p)));dom.shape=shape.map(([x,y])=>[x,y]);dom.x=anchor[0];dom.y=anchor[1];rest.forEach((b,i)=>{b.shape=[[0,0]];b.x=free[i][0];b.y=free[i][1];});}
function cross(l,ids){const colors=['red','pink'];ids.forEach((id,i)=>{const b=l.blocks.find(b=>b.id===id);if(b)b.color=colors[i%2];});}
function variant(name,mutate){const l=structuredClone(base);mutate(l);return {name,level:l};}
const variants=[
 variant('cross-two-hidden-to-ordinary',(l)=>cross(l,['h7','h10'])),
 variant('cross-four-hidden-alternating',(l)=>cross(l,['h7','h10','h13','h15'])),
 variant('domino-top-pocket',(l)=>retile(l,[[0,0],[1,0]],[4,0])),
 variant('cross-two-domino-top',(l)=>{cross(l,['h7','h10']);retile(l,[[0,0],[1,0]],[4,0]);}),
 variant('cross-two-domino-middle',(l)=>{cross(l,['h7','h10']);retile(l,[[0,0],[0,1]],[4,2]);}),\n variant('pink-domino-left',(l)=>{const b=l.blocks.find(b=>b.id==='h12');b.color='pink';}),\n variant('pink-vertical-domino-left',(l)=>{const b=l.blocks.find(b=>b.id==='h12');b.color='pink';retile(l,[[0,0],[0,1]],[4,2]);}),
];
const now=new Date().toISOString(),rows=[];
for(const {name,level} of variants){const row={name,createdAt:now,levelSha256:digest(level),constraints:{width:level.width,height:level.height,opening:level.blocks.filter(b=>!b.shutterId).length,hidden:level.blocks.filter(b=>b.shutterId).length,blocks:level.blocks.length,gates:[...level.gates,...level.flipDoors].length,curtainCount:level.shutters?.[0]?.count},mutation:{hiddenColorIds:level.blocks.filter(b=>b.shutterId&&['red','pink'].includes(b.color)).map(b=>({id:b.id,color:b.color})),domino:level.blocks.filter(b=>b.shutterId&&b.shape.length>1).map(b=>({id:b.id,shape:b.shape,x:b.x,y:b.y}))}};try{row.spatial=auditSpatial(level,api);}catch(e){row.spatial={passed:false,error:e.message};}
 if(row.spatial.passed){const budget={maxCost:20,maxStates:180000,maxMilliseconds:3500,orderSeed:Math.abs(name.length*17)};const w=search(level,budget);row.search={...w,drags:undefined,budget};if(w.status==='witness'){const {replay}=await import('../replay.mjs');try{row.replay=replay(level,w.drags,api,{complete:true,requirePointerCompatible:true,timed:true});}catch(e){row.replay={valid:false,error:e.message};}if(row.replay?.valid&&row.replay.complete){row.routeSha256=digest(w.drags);row.upperBound=row.replay.nonClearingDrags;row.route=w.drags;}}}
 const file=OUT+'/'+name+'.json';writeNew(file,{candidate:level,report:row});rows.push({...row,route:undefined});console.log(JSON.stringify({name,sha:row.levelSha256,spatial:row.spatial.passed,search:row.search?.status,maxClears:row.search?.maxClears,upper:row.upperBound,parking:row.replay?.nonClearingDrags,multi:row.replay?.multiCellRepositions,file}));}
writeNew(OUT+'/audit-summary.json',{createdAt:now,sourceCandidate:'deliverables/remake182-185-20260927/author185/enriched-1790524540984.json',sourceLevelSha256:digest(base),finiteBudget:{maxMilliseconds:3500,maxStates:180000,maxCost:20},variants:rows,conclusion:'Read-only difficulty audit. Candidate files are not production levels and do not supersede current source/score/pointer evidence.'});


