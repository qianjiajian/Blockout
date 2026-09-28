import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {native145,project,OUT} from './check145.mjs';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/candidate145-reviewed-v4.json',base=JSON.parse(fs.readFileSync(source));const {api:b}=await loadApi(),api={...b,...await loadSpatialApi()},stamp=Date.now(),rows=[],seen=new Set();
let rng=145181;const rnd=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296;};const colors=['red','yellow','blue','green','pink'],omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<160;n++){
 const level=structuredClone(base.level),shells=level.blocks.filter(b=>b.shutterId&&b.layers),outer=colors[Math.floor(rnd()*5)],inner=colors.filter(c=>c!==outer)[Math.floor(rnd()*4)];shells.forEach((b,i)=>Object.assign(b,{x:3+i,y:6,shape:[[0,0],[0,1],[0,2]],color:outer,layers:[outer,inner]}));
 const h1=level.blocks.find(b=>b.id.endsWith('-h1')),h6=level.blocks.find(b=>b.id.endsWith('-h6')),h7=level.blocks.find(b=>b.id.endsWith('-h7'));Object.assign(h1,{x:0,y:6,shape:[[0,0],[0,1],[1,1],[2,1]],color:colors[Math.floor(rnd()*5)]});Object.assign(h6,{x:0,y:8,shape:[[0,0],[1,0],[2,0]],color:colors[Math.floor(rnd()*5)]});Object.assign(h7,{x:1,y:6,shape:[[0,0],[1,0]],color:colors[Math.floor(rnd()*5)]});
 if(n>=40){const b=level.blocks.filter(b=>!b.shutterId)[Math.floor(rnd()*14)];const color=colors[Math.floor(rnd()*5)];if(!b.layers||b.layers[1]!==color){b.color=color;if(b.layers)b.layers[0]=color;}}
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}const h=digest(level);if(seen.has(h))continue;seen.add(h);
 const spatial=project(level),r=searchSpatial(spatial,api,{maxMilliseconds:2000,maxStates:60000,floor:20,normalize:true,weight:100,orderSeed:n%21});const row={n,status:r.status,upper:r.cost,clears:r.maxClearsSeen,states:r.discoveredStates};
 if(r.drags){const replay=api.replayRevisedRoute(spatial,r.drags);if(replay.valid&&replay.complete){const short=shortenRoute(spatial,r.drags,api);row.upper=short.replay.nonClearingDrags;let proof;if(row.upper>=11&&row.upper<=15)proof=native145(level,api,{maxStates:2000000,maxMilliseconds:10000});const file=OUT+`/candidate145-uniform-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({source,ruleVersion:'1.73.0',level,drags:short.drags,replay:short.replay,proof,levelSha256:h,routeSha256:digest(short.drags)},null,2));row.file=file;row.proof=proof;if(proof?.thresholdProven){rows.push(row);console.log(JSON.stringify(row));break;}}}
 rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/uniform145-${stamp}.json`,JSON.stringify(rows,null,2));}
