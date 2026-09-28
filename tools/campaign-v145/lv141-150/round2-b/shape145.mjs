import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {native145,project,OUT} from './check145.mjs';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/candidate145-reviewed-v4.json',base=JSON.parse(fs.readFileSync(source));const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[],seen=new Set();
let rng=145180;const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};const colors=['red','yellow','blue','green','pink'],omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<500;n++){const level=structuredClone(base.level),changes=[];
 const zones=[3];for(const y of zones){const bs=level.blocks.filter(b=>b.x>=0&&b.x<=2&&b.y===y).sort((a,b)=>a.x-b.x);for(let j=0;j<bs.length;j++){const b=bs[j];b.x=0;b.y=y+j;b.shape=[[0,0],[1,0],[2,0]];if(n%3){b.color=colors[Math.floor(rnd()*colors.length)];if(b.layers){b.layers[0]=b.color;const cs=colors.filter(c=>c!==b.color);b.layers[1]=cs[Math.floor(rnd()*cs.length)];}}changes.push(b.id);}}
 Object.assign(level.gates.find(g=>g.color==='pink'),{size:3});Object.assign(level.gates.find(g=>g.color==='red'),{side:'right',offset:1,size:3});Object.assign(level.gates.find(g=>g.color==='blue'),{side:'right',offset:5,size:3});
 if(n%5===0){const b=level.blocks.filter(b=>!b.shutterId&&b.x<3)[Math.floor(rnd()*5)];if(b&&!b.layers)b.color=colors[Math.floor(rnd()*colors.length)];}
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}const h=digest(level);if(seen.has(h))continue;seen.add(h);
 const spatial=project(level);const r=searchSpatial(spatial,api,{maxMilliseconds:2000,maxStates:60000,floor:22,normalize:true,weight:100,orderSeed:n%21,diagnosticTrace:true});const row={n,status:r.status,upper:r.cost,clears:r.maxClearsSeen,states:r.discoveredStates};
 if(r.drags){const replay=api.replayRevisedRoute(spatial,r.drags);if(replay.valid&&replay.complete){const short=shortenRoute(spatial,r.drags,api);row.upper=short.replay.nonClearingDrags;let proof;if(row.upper>=11&&row.upper<=15)proof=native145(level,api,{maxStates:2000000,maxMilliseconds:15000});const file=OUT+`/candidate145-shape-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({source,ruleVersion:'1.73.0',level,drags:short.drags,replay:short.replay,proof,levelSha256:h,routeSha256:digest(short.drags),shapeChanges:changes},null,2));row.file=file;row.proof=proof;if(proof?.thresholdProven){rows.push(row);console.log(JSON.stringify(row));break;}}}
 rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/shape145-${stamp}.json`,JSON.stringify(rows,null,2));}
