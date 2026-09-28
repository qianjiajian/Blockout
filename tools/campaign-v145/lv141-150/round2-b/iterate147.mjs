import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-b';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source146-150/candidate147-static-1790252742928.json';
const base=JSON.parse(fs.readFileSync(source));const {api:baseApi}=await loadApi(),api={...baseApi,...await loadSpatialApi()};
const stamp=Date.now(),rows=[];fs.mkdirSync(OUT,{recursive:true});let state=Number(process.argv[2]??147173);const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<240;n++){
 const level=structuredClone(base.level);level.blocks.find(b=>b.id==='s147-o2').color='blue';
 level.blocks.find(b=>b.id==='s147-o4').color='green';
 Object.assign(level.gates.find(g=>g.color==='orange'),{side:'top',offset:1,size:3});
 Object.assign(level.gates.find(g=>g.color==='yellow'),{side:'left',offset:9,size:3});
 for(const b of level.blocks)if(b.shutterId==='s147-c1'&&b.color!=='purple')b.color='cyan';
 for(const id of ['s147-o3','s147-h1-0','s147-h1-1','s147-h1-3'])level.blocks.find(b=>b.id===id).color='orange';
 const count=n===0?0:n<80?2:4;for(let k=0;k<count;k++){const bs=level.blocks.filter(b=>!b.shutterId&&!['s147-o1','s147-o2','s147-o3','s147-o4','s147-o5'].includes(b.id)),b=bs[Math.floor(rnd()*bs.length)];b.color=['green','blue','orange','pink','cyan'][Math.floor(rnd()*5)];}
 if(n>=120){for(const b of level.blocks.filter(b=>b.shutterId&&b.color!=='purple'&&rnd()<.2))b.color=['green','blue','orange','pink','cyan','yellow','red'][Math.floor(rnd()*7)];}
 try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const changes=level.blocks.flatMap((b,i)=>b.color!==base.level.blocks[i].color?[{id:b.id,from:base.level.blocks[i].color,to:b.color}]:[]);
 const result=searchSpatial(level,api,{maxMilliseconds:4000,maxStates:60000,floor:11,normalize:true,weight:100,orderSeed:n%level.blocks.length,diagnosticTrace:true});
 const row={n,changes,status:result.status,upper:result.cost,states:result.discoveredStates,ms:result.elapsedMilliseconds,maxClears:result.maxClearsSeen,partialCost:result.partialCost};
 if(result.drags){let replay=api.replayRevisedRoute(level,result.drags);if(replay.valid&&replay.complete){const short=shortenRoute(level,result.drags,api);const file=OUT+`/candidate147-${stamp}-${n}.json`;const data={ruleVersion:'1.73.0',source,sourceSha256:digest(fs.readFileSync(source)),level,drags:short.drags,replay:short.replay,changes,levelSha256:digest(level),routeSha256:digest(short.drags)};row.file=file;row.upper=short.replay.nonClearingDrags;fs.writeFileSync(file,JSON.stringify(data,null,2));if(row.upper>=5){rows.push(row);console.log(JSON.stringify(row));break;}}}
 if(result.maxClearsSeen>=8){const file=OUT+`/partial147-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,result,changes},null,2));row.file=file;}
 rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/iterate147-${stamp}.json`,JSON.stringify(rows,null,2));
}
