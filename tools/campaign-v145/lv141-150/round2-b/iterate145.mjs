import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
import {searchSpatial,loadSpatialApi} from '../../../remake111to120-spatial-floor-v147.mjs';
import {native145,project,OUT} from './check145.mjs';
const source='deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/candidate145-reviewed-v4.json';
const base=JSON.parse(fs.readFileSync(source));const {api:baseApi}=await loadApi(),api={...baseApi,...await loadSpatialApi()};
const stamp=Date.now(),rows=[];fs.mkdirSync(OUT,{recursive:true});
const colors=['red','yellow','blue','green','pink'];let state=Number(process.argv[2]??145173);const rnd=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<180;n++){
 const level=structuredClone(base.level),changes=[];const pink=level.gates.find(g=>g.color==='pink');pink.size=1;pink.offset=1+Math.floor(n/36);changes.push({gate:pink.id,offset:pink.offset,size:1});
 if(n%3===0){const blue=level.gates.find(g=>g.color==='blue');blue.offset=1+Math.floor(rnd()*3);}
 for(let k=0;k<1+Math.floor(n/60);k++){const b=level.blocks[Math.floor(rnd()*level.blocks.length)];const color=colors[Math.floor(rnd()*colors.length)];const layer=b.layers&&rnd()<.5?1:0;if((b.layers?.[layer]??b.color)===color)continue;if(b.layers&&b.layers[1-layer]===color)continue;changes.push({id:b.id,layer,from:b.layers?.[layer]??b.color,to:color});if(b.layers)b.layers[layer]=color;if(layer===0)b.color=color;}
 if(!changes.length)continue;try{api.validateLevel(level);if(api.auditRevisedCandidate(level).issues.some(i=>!omit.has(i.code))||!api.auditCandidateBlockArt(level).passed)continue;}catch{continue;}
 const spatial=project(level);let result=searchSpatial(spatial,api,{maxMilliseconds:2500,maxStates:50000,floor:20,normalize:true,weight:50,orderSeed:n%level.blocks.length});
 const row={n,changes,status:result.status,upper:result.cost,states:result.discoveredStates,ms:result.elapsedMilliseconds,maxClears:result.maxClearsSeen};
 if(result.drags){let replay=api.replayRevisedRoute(spatial,result.drags);if(replay.valid&&replay.complete){const shortened=shortenRoute(spatial,result.drags,api);result.drags=shortened.drags;replay=shortened.replay;row.upper=replay.nonClearingDrags;
 if(row.upper>=11&&row.upper<=15){const proof=native145(level,api,{maxMilliseconds:12000,maxStates:1000000});row.proof=proof;const file=OUT+`/candidate145-${stamp}-${n}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',source,sourceSha256:digest(fs.readFileSync(source)),level,drags:result.drags,replay,proof,changes,levelSha256:digest(level),routeSha256:digest(result.drags)},null,2));row.file=file;if(proof.thresholdProven){rows.push(row);console.log(JSON.stringify(row));break;}}
 }}rows.push(row);console.log(JSON.stringify(row));fs.writeFileSync(OUT+`/iterate145-${stamp}.json`,JSON.stringify(rows,null,2));
}
